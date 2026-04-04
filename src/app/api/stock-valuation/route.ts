import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { valuatePSF, calculateCUMP } from '@/lib/cost-engine'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const period = searchParams.get('period')

    const where: Record<string, unknown> = {}
    if (entityId) where.entityId = entityId
    if (period) where.period = period

    const valuations = await prisma.stockValuation.findMany({
      where,
      include: { product: true, entity: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(valuations)
  } catch (error) {
    console.error('Get stock valuations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { entityId, period } = body

    if (!entityId || !period) {
      return NextResponse.json(
        { error: 'entityId and period are required' },
        { status: 400 }
      )
    }

    // Get all products for entity
    const products = await prisma.product.findMany({
      where: { entityId, active: true },
      include: { category: true },
    })

    // Get production entries for this period
    const productionEntries = await prisma.productionEntry.findMany({
      where: { entityId, period },
    })

    // Get import session costs for transformation cost calculation
    const importSession = await prisma.importSession.findFirst({
      where: { entityId, period, status: 'MAPPED' },
      include: {
        lines: { where: { mapped: true }, include: { costCategory: true } },
      },
    })

    // Calculate total transformation costs (MOD + overhead)
    let totalTransformationCosts = 0
    if (importSession) {
      for (const line of importSession.lines) {
        if (
          line.costCategory &&
          (line.costCategory.type === 'MOD' ||
            line.costCategory.type === 'OVERHEAD_PROD')
        ) {
          totalTransformationCosts += line.amount
        }
      }
    }

    const results = []

    for (const product of products) {
      const entry = productionEntries.find((e) => e.productId === product.id)
      if (!entry) continue

      let valuation

      if (product.category.type === 'SEMI_FINISHED') {
        // PSF valuation
        const mpCostEngaged = entry.qtyConsumedMP * entry.unitPriceMP
        const psfResult = valuatePSF(
          mpCostEngaged,
          totalTransformationCosts / products.length,
          entry.psfAdvancement
        )

        valuation = await prisma.stockValuation.upsert({
          where: {
            entityId_productId_period: {
              entityId,
              productId: product.id,
              period,
            },
          },
          update: {
            method: 'CUMP',
            mpCost: psfResult.mpCost,
            transformationPct: entry.psfAdvancement,
            transformationCost: psfResult.transformationCost,
            totalPSFValue: psfResult.totalValue,
            stockQty: entry.qtyPSF,
            unitCost:
              entry.qtyPSF > 0 ? psfResult.totalValue / entry.qtyPSF : 0,
            totalValue: psfResult.totalValue,
          },
          create: {
            entityId,
            productId: product.id,
            period,
            method: 'CUMP',
            mpCost: psfResult.mpCost,
            transformationPct: entry.psfAdvancement,
            transformationCost: psfResult.transformationCost,
            totalPSFValue: psfResult.totalValue,
            stockQty: entry.qtyPSF,
            unitCost:
              entry.qtyPSF > 0 ? psfResult.totalValue / entry.qtyPSF : 0,
            totalValue: psfResult.totalValue,
          },
          include: { product: true },
        })
      } else {
        // CUMP valuation for finished products
        const initialStockValue = entry.stockInitial * entry.unitPriceMP
        const entryValue = entry.qtyConsumedMP * entry.unitPriceMP
        const cump = calculateCUMP(
          entry.stockInitial,
          initialStockValue,
          entry.qtyProduced,
          entryValue
        )

        const stockQty = entry.stockFinal
        const totalValue = stockQty * cump

        valuation = await prisma.stockValuation.upsert({
          where: {
            entityId_productId_period: {
              entityId,
              productId: product.id,
              period,
            },
          },
          update: {
            method: 'CUMP',
            mpCost: entryValue,
            transformationPct: 1,
            transformationCost: 0,
            totalPSFValue: 0,
            stockQty,
            unitCost: cump,
            totalValue,
          },
          create: {
            entityId,
            productId: product.id,
            period,
            method: 'CUMP',
            mpCost: entryValue,
            transformationPct: 1,
            transformationCost: 0,
            totalPSFValue: 0,
            stockQty,
            unitCost: cump,
            totalValue,
          },
          include: { product: true },
        })
      }

      results.push(valuation)
    }

    return NextResponse.json(results, { status: 201 })
  } catch (error) {
    console.error('Calculate stock valuations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
