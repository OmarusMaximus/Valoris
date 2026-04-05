import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.ADMIN, ROLES.FPA_DIRECTOR])) {
      return NextResponse.json(
        { error: 'Only ADMIN or FPA_DIRECTOR can create entities' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { code, name, country, currency } = body

    if (!code || !name || !country || !currency) {
      return NextResponse.json(
        { error: 'code, name, country, and currency are required' },
        { status: 400 }
      )
    }

    const entity = await prisma.entity.create({
      data: { code, name, country, currency },
    })

    return NextResponse.json(entity, { status: 201 })
  } catch (error) {
    console.error('Create entity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.ADMIN, ROLES.FPA_DIRECTOR])) {
      return NextResponse.json(
        { error: 'Only ADMIN or FPA_DIRECTOR can update entities' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, code, name, country, currency } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const entity = await prisma.entity.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(country && { country }),
        ...(currency && { currency }),
      },
    })

    return NextResponse.json(entity)
  } catch (error) {
    console.error('Update entity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.ADMIN, ROLES.FPA_DIRECTOR])) {
      return NextResponse.json(
        { error: 'Only ADMIN or FPA_DIRECTOR can delete entities' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Soft-delete: set active = false
    const entity = await prisma.entity.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json(entity)
  } catch (error) {
    console.error('Delete entity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
