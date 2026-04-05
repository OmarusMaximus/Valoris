import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'
import * as XLSX from 'xlsx'

const COLUMN_MAPS = {
  period: ['Period', 'Période', 'Mois', 'period', 'période', 'mois', 'PERIOD', 'PERIODE', 'MOIS'],
  articleCode: ['Article Code', 'Code Article', 'article_code', 'code_article', 'ArticleCode', 'CodeArticle', 'ARTICLE_CODE', 'CODE_ARTICLE'],
  articleName: ['Article Name', 'Nom Article', 'article_name', 'nom_article', 'ArticleName', 'NomArticle', 'ARTICLE_NAME', 'NOM_ARTICLE'],
  productCode: ['Product Code', 'Code Produit', 'product_code', 'code_produit', 'ProductCode', 'CodeProduit', 'PRODUCT_CODE', 'CODE_PRODUIT'],
  customerCode: ['Customer Code', 'Code Client', 'customer_code', 'code_client', 'CustomerCode', 'CodeClient', 'CUSTOMER_CODE', 'CODE_CLIENT'],
  customerName: ['Customer Name', 'Nom Client', 'customer_name', 'nom_client', 'CustomerName', 'NomClient', 'CUSTOMER_NAME', 'NOM_CLIENT'],
  customerType: ['Customer Type', 'Type Client', 'customer_type', 'type_client', 'CUSTOMER_TYPE', 'TYPE_CLIENT'],
  salesRepCode: ['Sales Rep Code', 'Code Commercial', 'sales_rep_code', 'code_commercial', 'SalesRepCode', 'CodeCommercial', 'SALES_REP_CODE', 'CODE_COMMERCIAL'],
  salesRepName: ['Sales Rep Name', 'Nom Commercial', 'sales_rep_name', 'nom_commercial', 'SalesRepName', 'NomCommercial', 'SALES_REP_NAME', 'NOM_COMMERCIAL'],
  revenue: ['Revenue', 'CA', "Chiffre d'affaires", 'revenue', 'ca', 'chiffre_affaires', 'REVENUE', 'CHIFFRE_AFFAIRES'],
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

function parseExcelData(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
}

// POST: scan (preview) or import
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
    const mode = formData.get('mode') as string | null // "scan" or "import"

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (!entityId) return NextResponse.json({ error: 'entityId is required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = parseExcelData(buffer)

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    // Fetch existing records
    const articles = await prisma.article.findMany({ where: { active: true }, select: { id: true, code: true } })
    const articleByCode = new Map(articles.map((a) => [a.code, a.id]))

    const customers = await prisma.customer.findMany({ where: { active: true }, select: { id: true, code: true } })
    const customerByCode = new Map(customers.map((c) => [c.code, c.id]))

    const salesReps = await prisma.salesRep.findMany({ where: { active: true }, select: { id: true, code: true } })
    const salesRepByCode = new Map(salesReps.map((s) => [s.code, s.id]))

    // === SCAN MODE: detect unknowns ===
    if (mode === 'scan') {
      const unknownArticles = new Map<string, string>()
      const unknownCustomers = new Map<string, { name: string; type: string }>()
      const unknownSalesReps = new Map<string, string>()

      for (const row of data) {
        const articleCode = String(findColumnValue(row, COLUMN_MAPS.articleCode) ?? '')
        const articleName = String(findColumnValue(row, COLUMN_MAPS.articleName) ?? articleCode)
        const customerCode = findColumnValue(row, COLUMN_MAPS.customerCode)
        const customerName = String(findColumnValue(row, COLUMN_MAPS.customerName) ?? '')
        const customerType = String(findColumnValue(row, COLUMN_MAPS.customerType) ?? 'DIRECT')
        const salesRepCode = findColumnValue(row, COLUMN_MAPS.salesRepCode)
        const salesRepName = String(findColumnValue(row, COLUMN_MAPS.salesRepName) ?? '')

        if (articleCode && !articleByCode.has(articleCode)) {
          unknownArticles.set(articleCode, articleName)
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
        unknownArticles: Array.from(unknownArticles.entries()).map(([code, name]) => ({ code, name })),
        unknownCustomers: Array.from(unknownCustomers.entries()).map(([code, info]) => ({ code, name: info.name, type: info.type })),
        unknownSalesReps: Array.from(unknownSalesReps.entries()).map(([code, name]) => ({ code, name })),
        hasUnknowns: unknownArticles.size > 0 || unknownCustomers.size > 0 || unknownSalesReps.size > 0,
      })
    }

    // === IMPORT MODE ===
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2

      try {
        const period = String(findColumnValue(row, COLUMN_MAPS.period) ?? '')
        const articleCode = String(findColumnValue(row, COLUMN_MAPS.articleCode) ?? '')
        const customerCode = findColumnValue(row, COLUMN_MAPS.customerCode)
        const salesRepCode = findColumnValue(row, COLUMN_MAPS.salesRepCode)
        const revenueRaw = findColumnValue(row, COLUMN_MAPS.revenue)
        const quantityRaw = findColumnValue(row, COLUMN_MAPS.quantity)
        const unitPriceRaw = findColumnValue(row, COLUMN_MAPS.unitPrice)
        const variableCostRaw = findColumnValue(row, COLUMN_MAPS.variableCost)

        if (!period) { errors.push(`Ligne ${rowNum}: période manquante`); skipped++; continue }
        if (!articleCode) { errors.push(`Ligne ${rowNum}: code article manquant`); skipped++; continue }

        const articleId = articleByCode.get(articleCode)
        if (!articleId) { errors.push(`Ligne ${rowNum}: article '${articleCode}' non trouvé`); skipped++; continue }

        let customerId: string | null = null
        if (customerCode) {
          customerId = customerByCode.get(String(customerCode)) ?? null
          if (!customerId) {
            errors.push(`Ligne ${rowNum}: client '${customerCode}' non trouvé, importé sans client`)
          }
        }

        let salesRepId: string | null = null
        if (salesRepCode) {
          salesRepId = salesRepByCode.get(String(salesRepCode)) ?? null
          if (!salesRepId) {
            errors.push(`Ligne ${rowNum}: commercial '${salesRepCode}' non trouvé, importé sans commercial`)
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

        await prisma.articleSalesHistory.upsert({
          where: {
            articleId_period_customerId: {
              articleId,
              period,
              customerId: customerId ?? '',
            },
          },
          update: { revenue, qtySold, avgPrice, variableCost, salesRepId },
          create: { articleId, period, customerId, salesRepId, revenue, qtySold, avgPrice, variableCost },
        })

        imported++
      } catch (rowError) {
        errors.push(`Ligne ${rowNum}: ${rowError instanceof Error ? rowError.message : 'erreur inconnue'}`)
        skipped++
      }
    }

    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 50), total: data.length })
  } catch (error) {
    console.error('Sales import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
