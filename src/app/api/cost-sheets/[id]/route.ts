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

    const costSheet = await prisma.costSheet.findUnique({
      where: { id },
      include: {
        lines: {
          include: { product: true, costCategory: true },
          orderBy: { createdAt: 'asc' },
        },
        entity: true,
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        validatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    if (!costSheet) {
      return NextResponse.json(
        { error: 'Cost sheet not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(costSheet)
  } catch (error) {
    console.error('Get cost sheet error:', error)
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

    const { id } = await params
    const body = await request.json()

    // Method change only allowed for FPA_DIRECTOR
    if (body.costingMethod) {
      if (!requireRole(user.role, [ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
        return NextResponse.json(
          { error: 'Only FPA Director can change costing method' },
          { status: 403 }
        )
      }
    }

    const costSheet = await prisma.costSheet.update({
      where: { id },
      data: {
        costingMethod: body.costingMethod,
      },
      include: {
        lines: { include: { product: true, costCategory: true } },
        entity: true,
        submittedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        validatedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(costSheet)
  } catch (error) {
    console.error('Update cost sheet error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
