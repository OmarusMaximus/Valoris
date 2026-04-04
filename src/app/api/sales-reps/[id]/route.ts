import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

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

    const salesRep = await prisma.salesRep.findUnique({
      where: { id },
      include: {
        salesHistory: {
          include: {
            article: { include: { product: true } },
            customer: true,
          },
        },
      },
    })

    if (!salesRep) {
      return NextResponse.json({ error: 'Sales rep not found' }, { status: 404 })
    }

    // Compute sales summary
    let totalRevenue = 0
    let totalQty = 0
    for (const sh of salesRep.salesHistory) {
      totalRevenue += sh.revenue
      totalQty += sh.qtySold
    }

    return NextResponse.json({
      ...salesRep,
      salesSummary: {
        totalRevenue,
        totalQty,
        periodCount: salesRep.salesHistory.length,
      },
    })
  } catch (error) {
    console.error('Get sales rep error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { code, firstName, lastName, email, region, entityId } = body

    const salesRep = await prisma.salesRep.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(region !== undefined && { region }),
        ...(entityId !== undefined && { entityId }),
      },
    })

    return NextResponse.json(salesRep)
  } catch (error) {
    console.error('Update sales rep error:', error)
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

    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Soft delete
    const salesRep = await prisma.salesRep.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json(salesRep)
  } catch (error) {
    console.error('Delete sales rep error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
