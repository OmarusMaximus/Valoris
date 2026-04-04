import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'
import * as XLSX from 'xlsx'

// Flexible column name mapping
const COLUMN_MAPS = {
  period: ['Period', 'Période', 'Mois', 'period', 'période', 'mois', 'PERIOD', 'PERIODE', 'MOIS'],
  articleCode: ['Article Code', 'Code Article', 'article_code', 'code_article', 'ArticleCode', 'CodeArticle', 'ARTICLE_CODE', 'CODE_ARTICLE'],
  customerCode: ['Customer Code', 'Code Client', 'customer_code', 'code_client', 'CustomerCode', 'CodeClient', 'CUSTOMER_CODE', 'CODE_CLIENT'],
  salesRepCode: ['Sales Rep Code', 'Code Commercial', 'sales_rep_code', 'code_commercial', 'SalesRepCode', 'CodeCommercial', 'SALES_REP_CODE', 'CODE_COMMERCIAL'],
  revenue: ['Revenue', 'CA', 'Chiffre d\'affaires', 'revenue', 'ca', 'chiffre_affaires', 'REVENUE', 'CHIFFRE_AFFAIRES'],
  quantity: ['Quantity', 'Quantité', 'Qté', 'quantity', 'quantité', 'qté', 'qty', 'QUANTITY', 'QUANTITE', 'QTE', 'QTY'],
  unitPrice: ['Unit Price', 'Prix unitaire', 'unit_price', 'prix_unitaire', 'UnitPrice', 'PrixUnitaire', 'UNIT_PRICE', 'PRIX_UNITAIRE'],
  variableCost: ['Variable Cost', 'Coût variable', 'variable_cost', 'cout_variable', 'VariableCost', 'CoutVariable', 'VARIABLE_COST', 'COUT_VARIABLE'],
}

function findColumnValue(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  return undefined
}

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

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 })
    }

    // Parse Excel file
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    // Pre-fetch lookup tables for the entity
    const articles = await prisma.article.findMany({
      where: { active: true },
      select: { id: true, code: true },
    })
    const articleByCode = new Map(articles.map((a) => [a.code, a.id]))

    const customers = await prisma.customer.findMany({
      where: { active: true },
      select: { id: true, code: true },
    })
    const customerByCode = new Map(customers.map((c) => [c.code, c.id]))

    const salesReps = await prisma.salesRep.findMany({
      where: { active: true },
      select: { id: true, code: true },
    })
    const salesRepByCode = new Map(salesReps.map((s) => [s.code, s.id]))

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // Excel row (1-indexed header + data)

      try {
        const period = String(findColumnValue(row, COLUMN_MAPS.period) ?? '')
        const articleCode = String(findColumnValue(row, COLUMN_MAPS.articleCode) ?? '')
        const customerCode = findColumnValue(row, COLUMN_MAPS.customerCode)
        const salesRepCode = findColumnValue(row, COLUMN_MAPS.salesRepCode)
        const revenueRaw = findColumnValue(row, COLUMN_MAPS.revenue)
        const quantityRaw = findColumnValue(row, COLUMN_MAPS.quantity)
        const unitPriceRaw = findColumnValue(row, COLUMN_MAPS.unitPrice)
        const variableCostRaw = findColumnValue(row, COLUMN_MAPS.variableCost)

        // Validate required fields
        if (!period) {
          errors.push(`Row ${rowNum}: missing period`)
          skipped++
          continue
        }
        if (!articleCode) {
          errors.push(`Row ${rowNum}: missing article code`)
          skipped++
          continue
        }

        // Lookup article
        const articleId = articleByCode.get(articleCode)
        if (!articleId) {
          errors.push(`Row ${rowNum}: article '${articleCode}' not found`)
          skipped++
          continue
        }

        // Lookup optional customer
        let customerId: string | null = null
        if (customerCode) {
          const cid = customerByCode.get(String(customerCode))
          if (!cid) {
            errors.push(`Row ${rowNum}: customer '${customerCode}' not found, importing without customer`)
          } else {
            customerId = cid
          }
        }

        // Lookup optional sales rep
        let salesRepId: string | null = null
        if (salesRepCode) {
          const sid = salesRepByCode.get(String(salesRepCode))
          if (!sid) {
            errors.push(`Row ${rowNum}: sales rep '${salesRepCode}' not found, importing without sales rep`)
          } else {
            salesRepId = sid
          }
        }

        const revenue = parseFloat(String(revenueRaw ?? 0))
        const qtySold = parseFloat(String(quantityRaw ?? 0))
        const variableCost = parseFloat(String(variableCostRaw ?? 0))

        // Calculate avgPrice: from explicit column, or derived from revenue/qty
        let avgPrice = 0
        if (unitPriceRaw !== undefined) {
          avgPrice = parseFloat(String(unitPriceRaw))
        } else if (qtySold > 0) {
          avgPrice = revenue / qtySold
        }

        if (isNaN(revenue) || isNaN(qtySold)) {
          errors.push(`Row ${rowNum}: invalid numeric values`)
          skipped++
          continue
        }

        // Upsert using the unique constraint [articleId, period, customerId]
        await prisma.articleSalesHistory.upsert({
          where: {
            articleId_period_customerId: {
              articleId,
              period,
              customerId: customerId ?? '',
            },
          },
          update: {
            revenue,
            qtySold,
            avgPrice,
            variableCost,
            salesRepId,
          },
          create: {
            articleId,
            period,
            customerId,
            salesRepId,
            revenue,
            qtySold,
            avgPrice,
            variableCost,
          },
        })

        imported++
      } catch (rowError) {
        errors.push(`Row ${rowNum}: ${rowError instanceof Error ? rowError.message : 'unknown error'}`)
        skipped++
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.slice(0, 50), // Cap error messages
      total: data.length,
    })
  } catch (error) {
    console.error('Sales import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
