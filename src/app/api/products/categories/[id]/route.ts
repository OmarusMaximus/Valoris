import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.ADMIN, ROLES.FPA_DIRECTOR])) {
      return NextResponse.json(
        { error: 'Only ADMIN or FPA_DIRECTOR can update categories' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { code, name, type } = body

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(type && { type }),
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Update category error:', error)
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

    if (!requireRole(user.role, [ROLES.ADMIN, ROLES.FPA_DIRECTOR])) {
      return NextResponse.json(
        { error: 'Only ADMIN or FPA_DIRECTOR can delete categories' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if any products reference this category
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    })

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${productCount} product(s) reference this category` },
        { status: 400 }
      )
    }

    await prisma.productCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
