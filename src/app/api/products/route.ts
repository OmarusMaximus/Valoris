import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const categoryId = searchParams.get('categoryId')
    const family = searchParams.get('family')
    const formulation = searchParams.get('formulation')
    const origin = searchParams.get('origin')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { active: true }
    if (entityId) where.entityId = entityId
    if (categoryId) where.categoryId = categoryId
    if (family) where.family = family
    if (formulation) where.formulation = formulation
    if (origin) where.origin = origin
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Get products error:', error)
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

    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name, categoryId, entityId, unit, family, formulation, origin } = body

    if (!code || !name || !categoryId || !entityId) {
      return NextResponse.json(
        { error: 'code, name, categoryId, and entityId are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: { code, name, categoryId, entityId, unit, family, formulation, origin },
      include: { category: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
