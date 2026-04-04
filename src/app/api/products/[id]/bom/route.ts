import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    const bomItems = await prisma.bOMItem.findMany({
      where: { parentProductId: id },
      include: { childProduct: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(bomItems)
  } catch (error) {
    console.error('Get BOM items error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { childProductId, quantity, unit, yieldRate } = body

    if (!childProductId || quantity == null) {
      return NextResponse.json(
        { error: 'childProductId and quantity are required' },
        { status: 400 }
      )
    }

    const bomItem = await prisma.bOMItem.create({
      data: {
        parentProductId: id,
        childProductId,
        quantity,
        unit: unit || 'KG',
        yieldRate: yieldRate ?? 1.0,
      },
      include: { childProduct: true },
    })

    return NextResponse.json(bomItem, { status: 201 })
  } catch (error) {
    console.error('Create BOM item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await params // consume params
    const bomItemId = request.nextUrl.searchParams.get('bomItemId')

    if (!bomItemId) {
      return NextResponse.json(
        { error: 'bomItemId is required' },
        { status: 400 }
      )
    }

    await prisma.bOMItem.delete({ where: { id: bomItemId } })

    return NextResponse.json({ message: 'BOM item deleted' })
  } catch (error) {
    console.error('Delete BOM item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
