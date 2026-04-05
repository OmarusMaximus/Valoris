import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'
import * as XLSX from 'xlsx'

/**
 * Convert a date value (from Excel) to YYYY-MM period.
 * Handles: "2026-03-15", "15/03/2026", "11/01/2023", Excel serial numbers, Date objects.
 */
function dateToPeriod(value: unknown): string {
  if (!value) return ''
  const str = String(value).trim()

  // Already a period format (YYYY-MM)
  if (/^\d{4}-\d{2}$/.test(str)) return str

  let d: Date | null = null

  // Excel serial number (e.g., 46066)
  if (/^\d{4,5}(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str)
    d = new Date(Date.UTC(1899, 11, 30 + Math.floor(serial)))
  }

  // ISO format: 2026-03-15
  if (!d && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    d = new Date(str)
  }

  // DD/MM/YYYY or MM/DD/YYYY format
  if (!d) {
    const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
    if (match) {
      const a = parseInt(match[1])
      const b = parseInt(match[2])
      const year = parseInt(match[3])
      // If first number > 12, it must be day (DD/MM/YYYY)
      if (a > 12) {
        d = new Date(year, b - 1, a)
      } else if (b > 12) {
        // Second number > 12, must be day (MM/DD/YYYY)
        d = new Date(year, a - 1, b)
      } else {
        // Ambiguous — default to DD/MM/YYYY (French convention)
        d = new Date(year, b - 1, a)
      }
    }
  }

  // Fallback: try native Date parsing
  if (!d || isNaN(d.getTime())) {
    d = new Date(str)
  }

  if (d && !isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return ''
}

function parseExcelData(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
}

// ---- Fuzzy auto-suggest logic ----

type TargetField =
  | 'date' | 'period' | 'entityCode' | 'articleCode' | 'articleName'
  | 'customerCode' | 'customerName' | 'customerType'
  | 'salesRepCode' | 'salesRepName'
  | 'revenue' | 'quantity' | 'unitPrice' | 'variableCost'
  | 'salesCurrency'

// For fields that need BOTH a category keyword AND a specificity keyword,
// we use a tuple of [categoryKeywords, specificityKeywords].
// For fields that just need any matching keyword, we use a flat array.
type KeywordRule = string[] | [string[], string[]]

const KEYWORD_MAP: Record<TargetField, KeywordRule> = {
  date: ['date', 'calendrier', 'jour', 'day'],
  period: ['period', 'période', 'periode', 'mois', 'month'],
  entityCode: [['société', 'societe', 'entity', 'site', 'filiale', 'company'], ['code', 'id', 'ref']],
  articleCode: [['article', 'produit', 'product', 'art', 'sku'], ['code', 'ref', 'référence', 'reference']],
  articleName: [['article', 'produit', 'product'], ['nom', 'name', 'désignation', 'designation', 'libellé', 'libelle', 'label']],
  customerCode: [['client', 'customer', 'cust'], ['code', 'ref', 'id', 'num']],
  customerName: [['client', 'customer', 'cust'], ['nom', 'name', 'raison']],
  customerType: [['type'], ['client', 'customer']],
  salesRepCode: [['commercial', 'vendeur', 'representant', 'rep', 'sales'], ['code', 'ref', 'id']],
  salesRepName: [['commercial', 'vendeur', 'representant', 'rep', 'sales'], ['nom', 'name']],
  revenue: ['montant', 'amount', 'revenue', 'ca', 'chiffre', 'total', 'sum', 'ht'],
  quantity: ['quantité', 'quantite', 'qty', 'qte', 'quantity', 'volume'],
  unitPrice: ['prix', 'price', 'tarif', 'unit'],
  variableCost: ['coût', 'cout', 'cost', 'variable'],
  salesCurrency: [['devise', 'currency', 'monnaie'], ['vente', 'sale', 'sales']],
}

/**
 * Normalize a string for accent-insensitive, case-insensitive matching.
 */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function scoreColumn(header: string, rule: KeywordRule): number {
  const h = normalize(header)

  if (Array.isArray(rule[0]) && Array.isArray(rule[1])) {
    // Compound rule: need matches from both groups
    const [groupA, groupB] = rule as [string[], string[]]
    let scoreA = 0
    let scoreB = 0
    for (const kw of groupA) {
      if (h.includes(normalize(kw))) scoreA++
    }
    for (const kw of groupB) {
      if (h.includes(normalize(kw))) scoreB++
    }
    // Must match at least one from each group
    if (scoreA > 0 && scoreB > 0) return scoreA + scoreB
    return 0
  }

  // Simple rule: count matching keywords
  const keywords = rule as string[]
  let score = 0
  for (const kw of keywords) {
    if (h.includes(normalize(kw))) score++
  }
  return score
}

function suggestMapping(columns: string[]): Record<TargetField, string | null> {
  const targets = Object.keys(KEYWORD_MAP) as TargetField[]
  const result: Record<string, string | null> = {}
  const usedColumns = new Set<string>()

  // Score all (target, column) pairs, then greedily assign best matches
  const pairs: Array<{ target: TargetField; column: string; score: number }> = []
  for (const target of targets) {
    for (const col of columns) {
      const s = scoreColumn(col, KEYWORD_MAP[target])
      if (s > 0) {
        pairs.push({ target, column: col, score: s })
      }
    }
  }
  // Sort by score descending
  pairs.sort((a, b) => b.score - a.score)

  const assignedTargets = new Set<string>()
  for (const { target, column } of pairs) {
    if (assignedTargets.has(target) || usedColumns.has(column)) continue
    result[target] = column
    assignedTargets.add(target)
    usedColumns.add(column)
  }

  // Fill unassigned with null
  for (const target of targets) {
    if (!(target in result)) {
      result[target] = null
    }
  }

  return result as Record<TargetField, string | null>
}

type ColumnMapping = Partial<Record<TargetField, string>>

/**
 * Read a value from a row using the user-provided mapping.
 */
function getMappedValue(row: Record<string, unknown>, mapping: ColumnMapping, field: TargetField): unknown {
  const colName = mapping[field]
  if (!colName) return undefined
  const val = row[colName]
  if (val === undefined || val === null || val === '') return undefined
  return val
}

// POST: preview, scan, or import
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityId = formData.get('entityId') as string | null
    const mode = formData.get('mode') as string | null // "preview", "scan", or "import"
    const mappingJson = formData.get('mapping') as string | null

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (!entityId) return NextResponse.json({ error: 'entityId is required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = parseExcelData(buffer)

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    // === PREVIEW MODE ===
    if (mode === 'preview') {
      const columns = Object.keys(data[0])
      const preview = data.slice(0, 5).map(row => {
        const obj: Record<string, unknown> = {}
        for (const col of columns) {
          obj[col] = row[col] ?? ''
        }
        return obj
      })
      const suggestedMapping = suggestMapping(columns)

      return NextResponse.json({
        columns,
        preview,
        suggestedMapping,
      })
    }

    // For scan and import, we need the mapping
    let mapping: ColumnMapping = {}
    if (mappingJson) {
      try {
        mapping = JSON.parse(mappingJson) as ColumnMapping
      } catch {
        return NextResponse.json({ error: 'Invalid mapping JSON' }, { status: 400 })
      }
    }

    // Fetch existing records
    const entities = await prisma.entity.findMany({ where: { active: true }, select: { id: true, code: true } })
    const entityByCode = new Map(entities.map((e) => [e.code, e.id]))

    const articles = await prisma.article.findMany({ where: { active: true }, select: { id: true, code: true } })
    const articleByCode = new Map(articles.map((a) => [a.code, a.id]))

    const customers = await prisma.customer.findMany({ where: { active: true }, select: { id: true, code: true } })
    const customerByCode = new Map(customers.map((c) => [c.code, c.id]))

    const salesReps = await prisma.salesRep.findMany({ where: { active: true }, select: { id: true, code: true } })
    const salesRepByCode = new Map(salesReps.map((s) => [s.code, s.id]))

    // === SCAN MODE: detect unknowns ===
    if (mode === 'scan') {
      const unknownArticles = new Map<string, { name: string; entityCode: string; salesCurrency: string }>()
      const unknownCustomers = new Map<string, { name: string; type: string }>()
      const unknownSalesReps = new Map<string, string>()

      for (const row of data) {
        const entityCode = String(getMappedValue(row, mapping, 'entityCode') ?? '')
        const articleCode = String(getMappedValue(row, mapping, 'articleCode') ?? '')
        const articleName = String(getMappedValue(row, mapping, 'articleName') ?? articleCode)
        const salesCurrencyVal = String(getMappedValue(row, mapping, 'salesCurrency') ?? '')
        const customerCode = getMappedValue(row, mapping, 'customerCode')
        const customerName = String(getMappedValue(row, mapping, 'customerName') ?? '')
        const customerTypeRaw = getMappedValue(row, mapping, 'customerType')
        const customerType = customerTypeRaw ? String(customerTypeRaw) : ''
        const salesRepCode = getMappedValue(row, mapping, 'salesRepCode')
        const salesRepName = String(getMappedValue(row, mapping, 'salesRepName') ?? '')

        if (articleCode && !articleByCode.has(articleCode)) {
          unknownArticles.set(articleCode, { name: articleName, entityCode, salesCurrency: salesCurrencyVal })
        }
        if (customerCode && !customerByCode.has(String(customerCode))) {
          unknownCustomers.set(String(customerCode), { name: customerName || String(customerCode), type: customerType })
        }
        if (salesRepCode && !salesRepByCode.has(String(salesRepCode))) {
          unknownSalesReps.set(String(salesRepCode), salesRepName || String(salesRepCode))
        }
      }

      return NextResponse.json({
        totalRows: data.length,
        unknownArticles: Array.from(unknownArticles.entries()).map(([code, info]) => ({ code, name: info.name, entityCode: info.entityCode, salesCurrency: info.salesCurrency })),
        unknownCustomers: Array.from(unknownCustomers.entries()).map(([code, info]) => ({ code, name: info.name, type: info.type })),
        unknownSalesReps: Array.from(unknownSalesReps.entries()).map(([code, name]) => ({ code, name })),
        hasUnknowns: unknownArticles.size > 0 || unknownCustomers.size > 0 || unknownSalesReps.size > 0,
      })
    }

    // === IMPORT MODE ===
    // Create ImportBatch record
    const batch = await prisma.importBatch.create({
      data: {
        entityId: entityId,
        type: 'SALES',
        fileName: file.name,
        rowCount: data.length,
        imported: 0,
        skipped: 0,
        status: 'COMPLETED',
      },
    })

    let imported = 0
    let skipped = 0
    let duplicateCount = 0
    const errors: string[] = []
    const skippedArticles = new Map<string, number>() // code → count
    const skippedCustomers = new Map<string, number>()
    const skippedReps = new Map<string, number>()

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2

      try {
        // Derive period: try explicit period column first, then date column
        let period = String(getMappedValue(row, mapping, 'period') ?? '')
        if (!period) {
          const dateVal = getMappedValue(row, mapping, 'date')
          if (dateVal) {
            period = dateToPeriod(dateVal)
          }
        }
        const rowEntityCode = String(getMappedValue(row, mapping, 'entityCode') ?? '')
        const articleCode = String(getMappedValue(row, mapping, 'articleCode') ?? '')
        const customerCode = getMappedValue(row, mapping, 'customerCode')
        const salesRepCode = getMappedValue(row, mapping, 'salesRepCode')
        const revenueRaw = getMappedValue(row, mapping, 'revenue')
        const quantityRaw = getMappedValue(row, mapping, 'quantity')
        const unitPriceRaw = getMappedValue(row, mapping, 'unitPrice')
        const variableCostRaw = getMappedValue(row, mapping, 'variableCost')
        const salesCurrencyRaw = getMappedValue(row, mapping, 'salesCurrency')

        if (!period) { errors.push(`Ligne ${rowNum}: ni période ni date trouvée`); skipped++; continue }
        if (!articleCode) { errors.push(`Ligne ${rowNum}: code article manquant`); skipped++; continue }

        const articleId = articleByCode.get(articleCode)
        if (!articleId) {
          skippedArticles.set(articleCode, (skippedArticles.get(articleCode) || 0) + 1)
          skipped++
          continue
        }

        // Auto-assign entity to article if entity code is in the file
        if (rowEntityCode) {
          const rowEntityId = entityByCode.get(rowEntityCode)
          if (rowEntityId) {
            await prisma.article.updateMany({
              where: { id: articleId, entityId: null },
              data: { entityId: rowEntityId },
            })
          }
        }

        // Update salesCurrency on the article if mapped and not yet set
        if (salesCurrencyRaw) {
          const currencyStr = String(salesCurrencyRaw).trim().toUpperCase()
          if (currencyStr) {
            await prisma.article.updateMany({
              where: { id: articleId, salesCurrency: null },
              data: { salesCurrency: currencyStr },
            })
          }
        }

        let customerId: string | null = null
        if (customerCode) {
          customerId = customerByCode.get(String(customerCode)) ?? null
          if (!customerId) {
            skippedCustomers.set(String(customerCode), (skippedCustomers.get(String(customerCode)) || 0) + 1)
          }
        }

        let salesRepId: string | null = null
        if (salesRepCode) {
          salesRepId = salesRepByCode.get(String(salesRepCode)) ?? null
          if (!salesRepId) {
            skippedReps.set(String(salesRepCode), (skippedReps.get(String(salesRepCode)) || 0) + 1)
          }
        }

        const revenue = parseFloat(String(revenueRaw ?? 0))
        const qtySold = parseFloat(String(quantityRaw ?? 0))
        const variableCost = parseFloat(String(variableCostRaw ?? 0))
        let avgPrice = 0
        if (unitPriceRaw !== undefined) {
          avgPrice = parseFloat(String(unitPriceRaw))
        } else if (qtySold > 0) {
          avgPrice = revenue / qtySold
        }

        if (isNaN(revenue) || isNaN(qtySold)) {
          errors.push(`Ligne ${rowNum}: valeurs numériques invalides`); skipped++; continue
        }

        // Duplicate detection: check if record already exists
        const existing = await prisma.articleSalesHistory.findUnique({
          where: {
            articleId_period_customerId: {
              articleId,
              period,
              customerId: customerId ?? '',
            },
          },
        })
        const isDuplicate = !!existing

        if (isDuplicate) {
          duplicateCount++
        }

        const result = await prisma.articleSalesHistory.upsert({
          where: {
            articleId_period_customerId: {
              articleId,
              period,
              customerId: customerId ?? '',
            },
          },
          update: { revenue, qtySold, avgPrice, variableCost, salesRepId, batchId: batch.id },
          create: { articleId, period, customerId, salesRepId, revenue, qtySold, avgPrice, variableCost, batchId: batch.id },
        })

        // Track in ImportedRecord
        await prisma.importedRecord.create({
          data: {
            batchId: batch.id,
            tableName: 'ArticleSalesHistory',
            recordId: result.id,
            action: isDuplicate ? 'UPDATED' : 'CREATED',
          },
        })

        imported++
      } catch (rowError) {
        errors.push(`Ligne ${rowNum}: ${rowError instanceof Error ? rowError.message : 'erreur inconnue'}`)
        skipped++
      }
    }

    // Update batch with final counts
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { imported, skipped },
    })

    // Build grouped warnings for skipped items
    const warnings: string[] = []
    for (const [code, count] of Array.from(skippedArticles.entries())) {
      warnings.push(`Article '${code}' ignoré (${count} ligne${count > 1 ? 's' : ''})`)
    }
    for (const [code, count] of Array.from(skippedCustomers.entries())) {
      warnings.push(`Client '${code}' non trouvé — ${count} ligne${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''} sans client`)
    }
    for (const [code, count] of Array.from(skippedReps.entries())) {
      warnings.push(`Commercial '${code}' non trouvé — ${count} ligne${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''} sans commercial`)
    }

    return NextResponse.json({ imported, skipped, duplicateCount, warnings, errors: errors.slice(0, 50), total: data.length, batchId: batch.id })
  } catch (error) {
    console.error('Sales import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
