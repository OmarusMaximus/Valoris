import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'
import { calculateYield } from '@/lib/cost-engine'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const period = searchParams.get('period')
    const productId = searchParams.get('productId')

    const where: Record<string, unknown> = {}
    if (entityId) where.entityId = entityId
    if (period) where.period = period
    if (productId) where.productId = productId

    const entries = await prisma.productionEntry.findMany({
      where,
      include: { product: true, entity: true, enteredBy: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Get production entries error:', error)
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

    if (
      !requireRole(user.role, [
        ROLES.PRODUCTION_MANAGER,
        ROLES.SUPPLY_MANAGER,
        ROLES.FPA_ANALYST,
        ROLES.ADMIN,
      ])
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      entityId,
      productId,
      period,
      qtyProduced,
      qtyConsumedMP,
      qtyPSF,
      psfAdvancement,
      unitPriceMP,
      stockInitial,
      stockFinal,
    } = body

    if (!entityId || !productId || !period) {
      return NextResponse.json(
        { error: 'entityId, productId, and period are required' },
        { status: 400 }
      )
    }

    const yieldRate = calculateYield(qtyProduced || 0, qtyConsumedMP || 0)

    const entry = await prisma.productionEntry.upsert({
      where: {
        entityId_productId_period: { entityId, productId, period },
      },
      update: {
        qtyProduced: qtyProduced ?? 0,
        qtyConsumedMP: qtyConsumedMP ?? 0,
        qtyPSF: qtyPSF ?? 0,
        psfAdvancement: psfAdvancement ?? 0,
        unitPriceMP: unitPriceMP ?? 0,
        stockInitial: stockInitial ?? 0,
        stockFinal: stockFinal ?? 0,
        yieldRate,
        enteredById: user.id,
      },
      create: {
        entityId,
        productId,
        period,
        enteredById: user.id,
        qtyProduced: qtyProduced ?? 0,
        qtyConsumedMP: qtyConsumedMP ?? 0,
        qtyPSF: qtyPSF ?? 0,
        psfAdvancement: psfAdvancement ?? 0,
        unitPriceMP: unitPriceMP ?? 0,
        stockInitial: stockInitial ?? 0,
        stockFinal: stockFinal ?? 0,
        yieldRate,
      },
      include: { product: true },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Create production entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
