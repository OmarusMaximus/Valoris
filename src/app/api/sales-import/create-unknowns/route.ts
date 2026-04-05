import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

// Batch-create unknown articles, customers, and sales reps detected during scan
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { entityId, articles, customers, salesReps } = body as {
      entityId: string
      articles: Array<{ code: string; name: string; productId?: string; entityCode?: string }>
      customers: Array<{ code: string; name: string; type?: string }>
      salesReps: Array<{ code: string; name: string }>
    }

    // Resolve entity codes to IDs
    const allEntities = await prisma.entity.findMany({ select: { id: true, code: true } })
    const entityMap = new Map(allEntities.map(e => [e.code, e.id]))

    const created = { articles: 0, customers: 0, salesReps: 0 }

    // Create articles - need a default product or link to existing
    if (articles?.length) {
      // Find or create a default product for orphan articles
      let defaultProduct = await prisma.product.findFirst({
        where: { code: 'DEFAULT-IMPORT', entityId },
      })
      if (!defaultProduct) {
        // Find the first product category
        const defaultCat = await prisma.productCategory.findFirst()
        if (defaultCat) {
          defaultProduct = await prisma.product.create({
            data: {
              code: 'DEFAULT-IMPORT',
              name: 'Produits importés (à classifier)',
              categoryId: defaultCat.id,
              entityId,
              unit: 'UNIT',
            },
          })
        }
      }

      if (defaultProduct) {
        for (const art of articles) {
          try {
            await prisma.article.upsert({
              where: { code: art.code },
              update: {},
              create: {
                code: art.code,
                name: art.name || art.code,
                productId: art.productId || defaultProduct.id,
                entityId: (art.entityCode ? entityMap.get(art.entityCode) : null) || entityId,
                stockUnit: 'UNIT',
                salesUnit: 'UNIT',
                contentQty: 1,
                contentUnit: 'UNIT',
              },
            })
            created.articles++
          } catch { /* duplicate, skip */ }
        }
      }
    }

    // Create customers
    if (customers?.length) {
      for (const cust of customers) {
        try {
          await prisma.customer.upsert({
            where: { code: cust.code },
            update: {},
            create: {
              code: cust.code,
              name: cust.name || cust.code,
              type: cust.type || null,
              entityId,
            },
          })
          created.customers++
        } catch { /* duplicate, skip */ }
      }
    }

    // Create sales reps
    if (salesReps?.length) {
      for (const rep of salesReps) {
        const nameParts = (rep.name || rep.code).split(' ')
        const firstName = nameParts[0] || rep.code
        const lastName = nameParts.slice(1).join(' ') || ''
        try {
          await prisma.salesRep.upsert({
            where: { code: rep.code },
            update: {},
            create: {
              code: rep.code,
              firstName,
              lastName,
              entityId,
            },
          })
          created.salesReps++
        } catch { /* duplicate, skip */ }
      }
    }

    return NextResponse.json({ created })
  } catch (error) {
    console.error('Create unknowns error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
