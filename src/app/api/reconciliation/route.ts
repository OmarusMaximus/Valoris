import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// --------------- Helpers ---------------

function getPreviousPeriod(period: string): string {
  const [yearStr, monthStr] = period.split('-')
  let year = parseInt(yearStr)
  let month = parseInt(monthStr) - 1
  if (month === 0) {
    month = 12
    year -= 1
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

function getSamePeriodLastYear(period: string): string {
  const [yearStr, monthStr] = period.split('-')
  return `${parseInt(yearStr) - 1}-${monthStr}`
}

function severity(deltaPct: number, warnThreshold: number, critThreshold: number): 'OK' | 'WARNING' | 'CRITICAL' {
  const abs = Math.abs(deltaPct)
  if (abs > critThreshold) return 'CRITICAL'
  if (abs > warnThreshold) return 'WARNING'
  return 'OK'
}

function overallStatus(items: { severity: string }[]): 'OK' | 'WARNING' | 'CRITICAL' {
  if (items.some(i => i.severity === 'CRITICAL')) return 'CRITICAL'
  if (items.some(i => i.severity === 'WARNING')) return 'WARNING'
  return 'OK'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// --------------- A. Quantity Reconciliation ---------------

async function quantityReconciliation(entityId: string, period: string) {
  // Get import lines mapped to MP cost categories for this period
  const importLines = await prisma.importLine.findMany({
    where: {
      importSession: { entityId, period },
      mapped: true,
      costCategory: { type: 'MP' },
    },
    include: {
      costCategory: true,
      importSession: true,
    },
  })

  // Get production entries for the same period
  const prodEntries = await prisma.productionEntry.findMany({
    where: { entityId, period },
    include: { product: true },
  })

  // Total accounting MP amount
  const totalAccountingMP = importLines.reduce((s, l) => s + l.amount, 0)

  // Build per-product reconciliation
  const items = prodEntries.map(entry => {
    const unitPrice = entry.unitPriceMP || 0
    // Derive implied accounting qty: product's share of total accounting MP / its unit price
    // Since import lines are not per-product, we distribute proportionally
    const productMPCost = entry.qtyConsumedMP * unitPrice
    const totalProductionMPCost = prodEntries.reduce((s, e) => s + e.qtyConsumedMP * (e.unitPriceMP || 0), 0)
    const share = totalProductionMPCost > 0 ? productMPCost / totalProductionMPCost : 0
    const accountingAmount = totalAccountingMP * share
    const accountingQty = unitPrice > 0 ? accountingAmount / unitPrice : 0
    const productionQty = entry.qtyConsumedMP

    const delta = round2(accountingQty - productionQty)
    const deltaPercent = productionQty !== 0 ? round2((delta / productionQty) * 100) : (accountingQty !== 0 ? 100 : 0)

    return {
      productId: entry.productId,
      productName: entry.product.name,
      accountingQty: round2(accountingQty),
      productionQty: round2(productionQty),
      delta,
      deltaPercent,
      severity: severity(deltaPercent, 5, 15),
    }
  })

  // Sort by severity then delta %
  const severityOrder = { CRITICAL: 0, WARNING: 1, OK: 2 }
  items.sort((a, b) => {
    const so = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2)
    if (so !== 0) return so
    return Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent)
  })

  return {
    status: overallStatus(items),
    items,
  }
}

// --------------- B. Amount Reconciliation ---------------

async function amountReconciliation(entityId: string, period: string) {
  // Get import lines grouped by cost category
  const importLines = await prisma.importLine.findMany({
    where: {
      importSession: { entityId, period },
      mapped: true,
      costCategoryId: { not: null },
    },
    include: { costCategory: true },
  })

  // Group import amounts by cost category
  const importByCategory = new Map<string, { code: string; name: string; amount: number }>()
  for (const line of importLines) {
    if (!line.costCategory) continue
    const key = line.costCategory.id
    const existing = importByCategory.get(key)
    if (existing) {
      existing.amount += line.amount
    } else {
      importByCategory.set(key, {
        code: line.costCategory.code,
        name: line.costCategory.name,
        amount: line.amount,
      })
    }
  }

  // Get cost sheet lines grouped by cost category
  const costSheet = await prisma.costSheet.findFirst({
    where: { entityId, period },
    include: {
      lines: { include: { costCategory: true } },
    },
  })

  const costSheetByCategory = new Map<string, { code: string; name: string; amount: number }>()
  if (costSheet) {
    for (const line of costSheet.lines) {
      if (!line.costCategory) continue
      const key = line.costCategoryId
      const existing = costSheetByCategory.get(key)
      if (existing) {
        existing.amount += line.amount
      } else {
        costSheetByCategory.set(key, {
          code: line.costCategory.code,
          name: line.costCategory.name,
          amount: line.amount,
        })
      }
    }
  }

  // Merge all category IDs
  const allCategoryIds = new Set([...Array.from(importByCategory.keys()), ...Array.from(costSheetByCategory.keys())])
  const items: {
    costCategoryCode: string
    costCategoryName: string
    importAmount: number
    costSheetAmount: number
    delta: number
    deltaPercent: number
    severity: 'OK' | 'WARNING' | 'CRITICAL'
  }[] = []

  for (const catId of Array.from(allCategoryIds)) {
    const imp = importByCategory.get(catId)
    const cs = costSheetByCategory.get(catId)
    const importAmount = round2(imp?.amount || 0)
    const costSheetAmount = round2(cs?.amount || 0)
    const delta = round2(costSheetAmount - importAmount)
    const deltaPercent = importAmount !== 0 ? round2((delta / importAmount) * 100) : (costSheetAmount !== 0 ? 100 : 0)

    items.push({
      costCategoryCode: imp?.code || cs?.code || '-',
      costCategoryName: imp?.name || cs?.name || '-',
      importAmount,
      costSheetAmount,
      delta,
      deltaPercent,
      severity: severity(deltaPercent, 5, 10),
    })
  }

  const severityOrder = { CRITICAL: 0, WARNING: 1, OK: 2 }
  items.sort((a, b) => {
    const so = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2)
    if (so !== 0) return so
    return Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent)
  })

  return {
    status: overallStatus(items),
    items,
  }
}

// --------------- C. Variation Alerts ---------------

type VariationAlert = {
  productId: string
  productName: string
  type: 'COST_SPIKE' | 'COST_DROP' | 'MARGIN_ALERT' | 'REVENUE_ANOMALY' | 'VOLUME_ANOMALY'
  metric: string
  previousValue: number
  currentValue: number
  change: number
  changePercent: number
  severity: 'WARNING' | 'CRITICAL'
  comparison: 'M-1' | 'N-1'
  description: string
}

async function getCostSheetDataByProduct(entityId: string, period: string) {
  const costSheet = await prisma.costSheet.findFirst({
    where: { entityId, period },
    include: {
      lines: {
        include: {
          product: { include: { category: true } },
          costCategory: true,
        },
      },
    },
  })

  if (!costSheet) return new Map<string, { name: string; family: string; qty: number; revenue: number; totalCost: number; unitCost: number; marginPct: number }>()

  const productMap = new Map<string, { name: string; family: string; qty: number; revenue: number; totalCost: number; unitCost: number; marginPct: number }>()
  const revenueTracker = new Set<string>()

  for (const line of costSheet.lines) {
    const pid = line.productId
    if (!productMap.has(pid)) {
      productMap.set(pid, {
        name: line.product.name,
        family: line.product.family || line.product.category?.type || '-',
        qty: 0,
        revenue: 0,
        totalCost: 0,
        unitCost: 0,
        marginPct: 0,
      })
    }
    const pd = productMap.get(pid)!
    const trackKey = `${costSheet.id}_${pid}`
    if (!revenueTracker.has(trackKey)) {
      revenueTracker.add(trackKey)
      pd.qty += line.quantity
      pd.revenue += line.revenue
    }
    pd.totalCost += line.amount
  }

  // Compute derived values
  for (const pd of Array.from(productMap.values())) {
    pd.unitCost = pd.qty > 0 ? pd.totalCost / pd.qty : 0
    pd.marginPct = pd.revenue > 0 ? ((pd.revenue - pd.totalCost) / pd.revenue) * 100 : 0
  }

  return productMap
}

async function variationAlerts(entityId: string, period: string) {
  const currentData = await getCostSheetDataByProduct(entityId, period)

  // Also try production entries as fallback
  let useProductionFallback = currentData.size === 0
  if (useProductionFallback) {
    const prodEntries = await prisma.productionEntry.findMany({
      where: { entityId, period },
      include: { product: { include: { category: true, articles: true } } },
    })
    for (const entry of prodEntries) {
      const avgPrice = entry.product.articles.length > 0
        ? entry.product.articles.reduce((s, a) => s + a.catalogPrice, 0) / entry.product.articles.length
        : 0
      const revenue = entry.qtyProduced * avgPrice
      const cost = entry.qtyConsumedMP * (entry.unitPriceMP || 0)
      currentData.set(entry.productId, {
        name: entry.product.name,
        family: entry.product.family || entry.product.category?.type || '-',
        qty: entry.qtyProduced,
        revenue,
        totalCost: cost,
        unitCost: entry.qtyProduced > 0 ? cost / entry.qtyProduced : 0,
        marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      })
    }
  }

  const comparisons: { label: 'M-1' | 'N-1'; period: string }[] = [
    { label: 'M-1', period: getPreviousPeriod(period) },
    { label: 'N-1', period: getSamePeriodLastYear(period) },
  ]

  const alerts: VariationAlert[] = []

  for (const comp of comparisons) {
    let refData = await getCostSheetDataByProduct(entityId, comp.period)

    // Fallback to production entries
    if (refData.size === 0) {
      const prodEntries = await prisma.productionEntry.findMany({
        where: { entityId, period: comp.period },
        include: { product: { include: { category: true, articles: true } } },
      })
      for (const entry of prodEntries) {
        const avgPrice = entry.product.articles.length > 0
          ? entry.product.articles.reduce((s, a) => s + a.catalogPrice, 0) / entry.product.articles.length
          : 0
        const revenue = entry.qtyProduced * avgPrice
        const cost = entry.qtyConsumedMP * (entry.unitPriceMP || 0)
        refData.set(entry.productId, {
          name: entry.product.name,
          family: entry.product.family || entry.product.category?.type || '-',
          qty: entry.qtyProduced,
          revenue,
          totalCost: cost,
          unitCost: entry.qtyProduced > 0 ? cost / entry.qtyProduced : 0,
          marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
        })
      }
    }

    if (refData.size === 0) continue

    for (const [pid, cur] of Array.from(currentData.entries())) {
      const ref = refData.get(pid)
      if (!ref) continue

      // Unit cost change > 20%
      if (ref.unitCost > 0) {
        const changePct = ((cur.unitCost - ref.unitCost) / ref.unitCost) * 100
        if (Math.abs(changePct) > 20) {
          const isCritical = Math.abs(changePct) > 40
          alerts.push({
            productId: pid,
            productName: cur.name,
            type: changePct > 0 ? 'COST_SPIKE' : 'COST_DROP',
            metric: 'Cout unitaire',
            previousValue: round2(ref.unitCost),
            currentValue: round2(cur.unitCost),
            change: round2(cur.unitCost - ref.unitCost),
            changePercent: round2(changePct),
            severity: isCritical ? 'CRITICAL' : 'WARNING',
            comparison: comp.label,
            description: changePct > 0
              ? `Le cout unitaire a augmente de ${round2(Math.abs(changePct))}% (${comp.label})`
              : `Le cout unitaire a diminue de ${round2(Math.abs(changePct))}% (${comp.label})`,
          })
        }
      }

      // Margin change > 15pp
      const marginDelta = cur.marginPct - ref.marginPct
      if (Math.abs(marginDelta) > 15) {
        const isCritical = Math.abs(marginDelta) > 25
        alerts.push({
          productId: pid,
          productName: cur.name,
          type: 'MARGIN_ALERT',
          metric: 'Marge',
          previousValue: round2(ref.marginPct),
          currentValue: round2(cur.marginPct),
          change: round2(marginDelta),
          changePercent: round2(marginDelta),
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          comparison: comp.label,
          description: `La marge a varie de ${round2(marginDelta)} points (${round2(ref.marginPct)}% -> ${round2(cur.marginPct)}%)`,
        })
      }

      // Revenue change > 30%
      if (ref.revenue > 0) {
        const changePct = ((cur.revenue - ref.revenue) / ref.revenue) * 100
        if (Math.abs(changePct) > 30) {
          const isCritical = Math.abs(changePct) > 50
          alerts.push({
            productId: pid,
            productName: cur.name,
            type: 'REVENUE_ANOMALY',
            metric: 'Chiffre d\'affaires',
            previousValue: round2(ref.revenue),
            currentValue: round2(cur.revenue),
            change: round2(cur.revenue - ref.revenue),
            changePercent: round2(changePct),
            severity: isCritical ? 'CRITICAL' : 'WARNING',
            comparison: comp.label,
            description: `Le CA a varie de ${round2(changePct)}% (${comp.label})`,
          })
        }
      }

      // Volume change > 40%
      if (ref.qty > 0) {
        const changePct = ((cur.qty - ref.qty) / ref.qty) * 100
        if (Math.abs(changePct) > 40) {
          const isCritical = Math.abs(changePct) > 60
          alerts.push({
            productId: pid,
            productName: cur.name,
            type: 'VOLUME_ANOMALY',
            metric: 'Volume',
            previousValue: round2(ref.qty),
            currentValue: round2(cur.qty),
            change: round2(cur.qty - ref.qty),
            changePercent: round2(changePct),
            severity: isCritical ? 'CRITICAL' : 'WARNING',
            comparison: comp.label,
            description: `Le volume a varie de ${round2(changePct)}% (${comp.label})`,
          })
        }
      }
    }
  }

  // Sort by severity (CRITICAL first) then by absolute changePercent
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'CRITICAL' ? -1 : 1
    return Math.abs(b.changePercent) - Math.abs(a.changePercent)
  })

  const critical = alerts.filter(a => a.severity === 'CRITICAL').length
  const warning = alerts.filter(a => a.severity === 'WARNING').length

  return {
    totalAlerts: alerts.length,
    critical,
    warning,
    items: alerts,
  }
}

// --------------- GET Handler ---------------

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const period = searchParams.get('period')

    if (!entityId || !period) {
      return NextResponse.json(
        { error: 'entityId and period are required' },
        { status: 400 },
      )
    }

    const [qtyRecon, amtRecon, varAlerts] = await Promise.all([
      quantityReconciliation(entityId, period),
      amountReconciliation(entityId, period),
      variationAlerts(entityId, period),
    ])

    return NextResponse.json({
      period,
      entityId,
      quantityReconciliation: qtyRecon,
      amountReconciliation: amtRecon,
      variationAlerts: varAlerts,
    })
  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
