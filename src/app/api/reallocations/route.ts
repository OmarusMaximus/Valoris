import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    const reallocations = await prisma.reallocation.findMany({
      where,
      include: { entity: true, performedBy: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reallocations)
  } catch (error) {
    console.error('Get reallocations error:', error)
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
    const { entityId, period, description, sourceAxis, targetAxis, amount } =
      body

    if (
      !entityId ||
      !period ||
      !description ||
      !sourceAxis ||
      !targetAxis ||
      amount == null
    ) {
      return NextResponse.json(
        {
          error:
            'entityId, period, description, sourceAxis, targetAxis, and amount are required',
        },
        { status: 400 }
      )
    }

    const reallocation = await prisma.reallocation.create({
      data: {
        entityId,
        period,
        description,
        sourceAxis,
        targetAxis,
        amount,
        performedById: user.id,
      },
      include: { entity: true },
    })

    return NextResponse.json(reallocation, { status: 201 })
  } catch (error) {
    console.error('Create reallocation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
