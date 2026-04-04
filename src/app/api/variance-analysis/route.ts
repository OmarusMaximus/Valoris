import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type CostDrillDown = {
  categoryType: string
  categoryName: string
  actualAmount: number
  refAmount: number
  variance: number
}

type ProductVariance = {
  productId: string
  productName: string
  family: string
  actualQty: number
  actualRevenue: number
  actualUnitPrice: number
  actualCost: number
  actualUnitCost: number
  actualMargin: number
  refQty: number
  refRevenue: number
  refUnitPrice: number
  refCost: number
  refUnitCost: number
  refMargin: number
  totalVariance: number
  volumeEffect: number
  priceEffect: number
  costEffect: number
  costDrillDown: CostDrillDown[]
}

type ProductData = {
  productId: string
  productName: string
  family: string
  qty: number
  revenue: number
  totalCost: number
  costByCategory: Map<string, { type: string; name: string; amount: number }>
}

function getYTDPeriods(period: string): string[] {
  const [yearStr, monthStr] = period.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const periods: string[] = []
  for (let m = 1; m <= month; m++) {
    periods.push(`${year}-${String(m).padStart(2, '0')}`)
  }
  return periods
}

function getN1Period(period: string): string {
  const [yearStr, monthStr] = period.split('-')
  return `${parseInt(yearStr) - 1}-${monthStr}`
}

function getN1YTDPeriods(period: string): string[] {
  const [yearStr, monthStr] = period.split('-')
  const prevYear = parseInt(yearStr) - 1
  const month = parseInt(monthStr)
  const periods: string[] = []
  for (let m = 1; m <= month; m++) {
    periods.push(`${prevYear}-${String(m).padStart(2, '0')}`)
  }
  return periods
}

async function aggregateCostSheetData(
  entityId: string,
  periods: string[],
): Promise<Map<string, ProductData>> {
  const costSheets = await prisma.costSheet.findMany({
    where: {
      entityId,
      period: { in: periods },
    },
    include: {
      lines: {
        include: {
          product: { include: { category: true } },
          costCategory: true,
        },
      },
    },
  })

  const productMap = new Map<string, ProductData>()
  // Track which (costSheet, product) combinations we've already counted qty/revenue for
  const revenueTracker = new Set<string>()

  for (const cs of costSheets) {
    for (const line of cs.lines) {
      const pid = line.productId
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          productId: pid,
          productName: line.product.name,
          family: line.product.family || line.product.category?.type || '-',
          qty: 0,
          revenue: 0,
          totalCost: 0,
          costByCategory: new Map(),
        })
      }
      const pd = productMap.get(pid)!

      // Revenue and quantity are duplicated across category lines for the same product
      // in a single cost sheet. Only count them once per (costSheet, product).
      const trackKey = `${cs.id}_${pid}`
      if (!revenueTracker.has(trackKey)) {
        revenueTracker.add(trackKey)
        pd.qty += line.quantity
        pd.revenue += line.revenue
      }

      pd.totalCost += line.amount

      const catKey = line.costCategory?.type || 'OTHER'
      const existing = pd.costByCategory.get(catKey)
      if (existing) {
        existing.amount += line.amount
      } else {
        pd.costByCategory.set(catKey, {
          type: catKey,
          name: line.costCategory?.name || catKey,
          amount: line.amount,
        })
      }
    }
  }

  return productMap
}

async function buildStandardReference(
  entityId: string,
  actualData: Map<string, ProductData>,
): Promise<Map<string, ProductData>> {
  const refMap = new Map<string, ProductData>()

  const products = await prisma.product.findMany({
    where: { entityId },
    include: {
      articles: true,
      category: true,
    },
  })

  for (const product of products) {
    const actual = actualData.get(product.id)
    if (!actual) continue

    const articles = product.articles
    let standardCost = 0
    let catalogPrice = 0
    if (articles.length > 0) {
      standardCost =
        articles.reduce((sum, a) => sum + a.standardCost, 0) / articles.length
      catalogPrice =
        articles.reduce((sum, a) => sum + a.catalogPrice, 0) / articles.length
    }

    // Fall back to actual unit values when no article data exists
    const refUnitCost =
      standardCost || (actual.qty > 0 ? actual.totalCost / actual.qty : 0)
    const refUnitPrice =
      catalogPrice || (actual.qty > 0 ? actual.revenue / actual.qty : 0)

    // Standard comparison uses actual volume as reference (focuses on price/cost deltas)
    const refQty = actual.qty

    const refData: ProductData = {
      productId: product.id,
      productName: product.name,
      family: product.family || product.category?.type || '-',
      qty: refQty,
      revenue: refUnitPrice * refQty,
      totalCost: refUnitCost * refQty,
      costByCategory: new Map(),
    }

    // Distribute standard cost proportionally across categories
    if (actual.totalCost > 0) {
      for (const [catKey, catData] of actual.costByCategory) {
        const proportion = catData.amount / actual.totalCost
        refData.costByCategory.set(catKey, {
          type: catData.type,
          name: catData.name,
          amount: refUnitCost * refQty * proportion,
        })
      }
    }

    refMap.set(product.id, refData)
  }

  return refMap
}

function computeVariances(
  actualData: Map<string, ProductData>,
  refData: Map<string, ProductData>,
): ProductVariance[] {
  const results: ProductVariance[] = []
  const allProductIds = new Set([...actualData.keys(), ...refData.keys()])

  for (const pid of allProductIds) {
    const actual = actualData.get(pid)
    const ref = refData.get(pid)

    const aQty = actual?.qty || 0
    const aRevenue = actual?.revenue || 0
    const aCost = actual?.totalCost || 0
    const aMargin = aRevenue - aCost
    const aUnitPrice = aQty > 0 ? aRevenue / aQty : 0
    const aUnitCost = aQty > 0 ? aCost / aQty : 0

    const rQty = ref?.qty || 0
    const rRevenue = ref?.revenue || 0
    const rCost = ref?.totalCost || 0
    const rMargin = rRevenue - rCost
    const rUnitPrice = rQty > 0 ? rRevenue / rQty : 0
    const rUnitCost = rQty > 0 ? rCost / rQty : 0
    const rUnitMargin = rQty > 0 ? rMargin / rQty : 0

    const totalVariance = aMargin - rMargin
    const volumeEffect = (aQty - rQty) * rUnitMargin
    const priceEffect = (aUnitPrice - rUnitPrice) * aQty
    const costEffect = -(aUnitCost - rUnitCost) * aQty

    // Cost drill-down by category
    const allCatKeys = new Set([
      ...(actual?.costByCategory.keys() || []),
      ...(ref?.costByCategory.keys() || []),
    ])
    const costDrillDown: CostDrillDown[] = []
    for (const catKey of allCatKeys) {
      const actualAmt = actual?.costByCategory.get(catKey)?.amount || 0
      const refAmt = ref?.costByCategory.get(catKey)?.amount || 0
      costDrillDown.push({
        categoryType: catKey,
        categoryName:
          actual?.costByCategory.get(catKey)?.name ||
          ref?.costByCategory.get(catKey)?.name ||
          catKey,
        actualAmount: Math.round(actualAmt * 100) / 100,
        refAmount: Math.round(refAmt * 100) / 100,
        variance: Math.round((actualAmt - refAmt) * 100) / 100,
      })
    }

    results.push({
      productId: pid,
      productName: actual?.productName || ref?.productName || '-',
      family: actual?.family || ref?.family || '-',
      actualQty: Math.round(aQty * 100) / 100,
      actualRevenue: Math.round(aRevenue * 100) / 100,
      actualUnitPrice: Math.round(aUnitPrice * 100) / 100,
      actualCost: Math.round(aCost * 100) / 100,
      actualUnitCost: Math.round(aUnitCost * 100) / 100,
      actualMargin: Math.round(aMargin * 100) / 100,
      refQty: Math.round(rQty * 100) / 100,
      refRevenue: Math.round(rRevenue * 100) / 100,
      refUnitPrice: Math.round(rUnitPrice * 100) / 100,
      refCost: Math.round(rCost * 100) / 100,
      refUnitCost: Math.round(rUnitCost * 100) / 100,
      refMargin: Math.round(rMargin * 100) / 100,
      totalVariance: Math.round(totalVariance * 100) / 100,
      volumeEffect: Math.round(volumeEffect * 100) / 100,
      priceEffect: Math.round(priceEffect * 100) / 100,
      costEffect: Math.round(costEffect * 100) / 100,
      costDrillDown,
    })
  }

  results.sort((a, b) => Math.abs(b.totalVariance) - Math.abs(a.totalVariance))
  return results
}

async function buildFromProductionEntries(
  entityId: string,
  periods: string[],
): Promise<Map<string, ProductData>> {
  const productMap = new Map<string, ProductData>()

  const prodEntries = await prisma.productionEntry.findMany({
    where: {
      entityId,
      period: { in: periods },
    },
    include: {
      product: { include: { category: true, articles: true } },
    },
  })

  for (const entry of prodEntries) {
    const pid = entry.productId
    if (!productMap.has(pid)) {
      productMap.set(pid, {
        productId: pid,
        productName: entry.product.name,
        family: entry.product.family || entry.product.category?.type || '-',
        qty: 0,
        revenue: 0,
        totalCost: 0,
        costByCategory: new Map(),
      })
    }
    const pd = productMap.get(pid)!
    pd.qty += entry.qtyProduced

    const avgPrice =
      entry.product.articles.length > 0
        ? entry.product.articles.reduce((s, a) => s + a.catalogPrice, 0) /
          entry.product.articles.length
        : 0
    pd.revenue += entry.qtyProduced * avgPrice

    const mpCost = entry.qtyConsumedMP * entry.unitPriceMP
    pd.totalCost += mpCost

    const existing = pd.costByCategory.get('MP')
    if (existing) {
      existing.amount += mpCost
    } else {
      pd.costByCategory.set('MP', {
        type: 'MP',
        name: 'Matieres premieres',
        amount: mpCost,
      })
    }
  }

  return productMap
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const period = searchParams.get('period')
    const comparison = searchParams.get('comparison') || 'N1'
    const view = searchParams.get('view') || 'MTD'

    if (!entityId || !period) {
      return NextResponse.json(
        { error: 'entityId and period are required' },
        { status: 400 },
      )
    }

    // Determine periods to aggregate
    const actualPeriods = view === 'YTD' ? getYTDPeriods(period) : [period]

    // Get actual data from cost sheets
    let actualData = await aggregateCostSheetData(entityId, actualPeriods)

    // Fall back to production entries if no cost sheet data
    if (actualData.size === 0) {
      actualData = await buildFromProductionEntries(entityId, actualPeriods)
    }

    // Get reference data
    let refData: Map<string, ProductData>

    if (comparison === 'STANDARD') {
      refData = await buildStandardReference(entityId, actualData)
    } else {
      // N-1: same periods from previous year
      const refPeriods =
        view === 'YTD' ? getN1YTDPeriods(period) : [getN1Period(period)]
      refData = await aggregateCostSheetData(entityId, refPeriods)

      // Fall back to production entries for N-1 as well
      if (refData.size === 0) {
        refData = await buildFromProductionEntries(entityId, refPeriods)
      }
    }

    // Compute variances
    const byProduct = computeVariances(actualData, refData)

    // Summary totals
    const summary = byProduct.reduce(
      (acc, p) => ({
        actualRevenue: acc.actualRevenue + p.actualRevenue,
        actualCost: acc.actualCost + p.actualCost,
        actualMargin: acc.actualMargin + p.actualMargin,
        refRevenue: acc.refRevenue + p.refRevenue,
        refCost: acc.refCost + p.refCost,
        refMargin: acc.refMargin + p.refMargin,
        totalVariance: acc.totalVariance + p.totalVariance,
        volumeEffect: acc.volumeEffect + p.volumeEffect,
        priceEffect: acc.priceEffect + p.priceEffect,
        costEffect: acc.costEffect + p.costEffect,
      }),
      {
        actualRevenue: 0,
        actualCost: 0,
        actualMargin: 0,
        refRevenue: 0,
        refCost: 0,
        refMargin: 0,
        totalVariance: 0,
        volumeEffect: 0,
        priceEffect: 0,
        costEffect: 0,
      },
    )

    // Round summary values
    for (const key of Object.keys(summary) as (keyof typeof summary)[]) {
      summary[key] = Math.round(summary[key] * 100) / 100
    }

    return NextResponse.json({
      period,
      comparison,
      view,
      summary,
      byProduct,
    })
  } catch (error) {
    console.error('Variance analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
