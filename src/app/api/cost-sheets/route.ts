import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateCostSheet } from '@/lib/cost-engine'
import type { CostingMethod } from '@/lib/cost-engine'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const period = searchParams.get('period')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (entityId) where.entityId = entityId
    if (period) where.period = period
    if (status) where.status = status

    const costSheets = await prisma.costSheet.findMany({
      where,
      include: {
        entity: true,
        submittedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(costSheets)
  } catch (error) {
    console.error('Get cost sheets error:', error)
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
    const { entityId, period, costingMethod } = body

    if (!entityId || !period) {
      return NextResponse.json(
        { error: 'entityId and period are required' },
        { status: 400 }
      )
    }

    const method: CostingMethod = costingMethod || 'CUMP'

    // Calculate cost lines using the cost engine
    const calculationResults = await calculateCostSheet(entityId, period, method)

    // Get all cost categories for line creation
    const costCategories = await prisma.costCategory.findMany()
    const mpCategory = costCategories.find((c) => c.type === 'MP')
    const modCategory = costCategories.find((c) => c.type === 'MOD')
    const overheadCategory = costCategories.find(
      (c) => c.type === 'OVERHEAD_PROD'
    )
    const commercialCategory = costCategories.find(
      (c) => c.type === 'COMMERCIAL'
    )

    // Create the cost sheet with lines
    const costSheet = await prisma.costSheet.upsert({
      where: {
        entityId_period: { entityId, period },
      },
      update: {
        costingMethod: method,
        status: 'DRAFT',
        submittedById: user.id,
        lines: {
          deleteMany: {},
          create: calculationResults.flatMap((result) => {
            const lines = []

            if (mpCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: mpCategory.id,
                amount: result.mpCost,
                unitCost: result.unitCost,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: result.grossMargin,
                contributionMargin: result.contributionMargin,
              })
            }

            if (modCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: modCategory.id,
                amount: result.modCost,
                unitCost:
                  result.quantity > 0 ? result.modCost / result.quantity : 0,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: 0,
                contributionMargin: 0,
              })
            }

            if (overheadCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: overheadCategory.id,
                amount: result.overheadCost,
                unitCost:
                  result.quantity > 0
                    ? result.overheadCost / result.quantity
                    : 0,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: 0,
                contributionMargin: 0,
              })
            }

            if (commercialCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: commercialCategory.id,
                amount: result.commercialCost,
                unitCost:
                  result.quantity > 0
                    ? result.commercialCost / result.quantity
                    : 0,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: 0,
                contributionMargin: 0,
              })
            }

            return lines
          }),
        },
      },
      create: {
        entityId,
        period,
        costingMethod: method,
        status: 'DRAFT',
        submittedById: user.id,
        lines: {
          create: calculationResults.flatMap((result) => {
            const lines = []

            if (mpCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: mpCategory.id,
                amount: result.mpCost,
                unitCost: result.unitCost,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: result.grossMargin,
                contributionMargin: result.contributionMargin,
              })
            }

            if (modCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: modCategory.id,
                amount: result.modCost,
                unitCost:
                  result.quantity > 0 ? result.modCost / result.quantity : 0,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: 0,
                contributionMargin: 0,
              })
            }

            if (overheadCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: overheadCategory.id,
                amount: result.overheadCost,
                unitCost:
                  result.quantity > 0
                    ? result.overheadCost / result.quantity
                    : 0,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: 0,
                contributionMargin: 0,
              })
            }

            if (commercialCategory) {
              lines.push({
                productId: result.productId,
                costCategoryId: commercialCategory.id,
                amount: result.commercialCost,
                unitCost:
                  result.quantity > 0
                    ? result.commercialCost / result.quantity
                    : 0,
                quantity: result.quantity,
                revenue: 0,
                grossMargin: 0,
                contributionMargin: 0,
              })
            }

            return lines
          }),
        },
      },
      include: {
        lines: { include: { product: true, costCategory: true } },
        entity: true,
      },
    })

    return NextResponse.json(costSheet, { status: 201 })
  } catch (error) {
    console.error('Create cost sheet error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
