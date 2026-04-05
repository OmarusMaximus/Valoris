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
    const productId = searchParams.get('productId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { active: true }
    if (productId) where.productId = productId
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ]
    }

    const articles = await prisma.article.findMany({
      where,
      include: { product: true, entity: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('Get articles error:', error)
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

    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name, productId, photoUrl, stockUnit, salesUnit, contentQty, contentUnit, catalogPrice, standardCost } = body

    if (!code || !name || !productId || !stockUnit || !salesUnit || contentQty == null || !contentUnit || catalogPrice == null || standardCost == null) {
      return NextResponse.json(
        { error: 'code, name, productId, stockUnit, salesUnit, contentQty, contentUnit, catalogPrice, and standardCost are required' },
        { status: 400 }
      )
    }

    const article = await prisma.article.create({
      data: { code, name, productId, photoUrl, stockUnit, salesUnit, contentQty, contentUnit, catalogPrice, standardCost },
      include: { product: true },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Create article error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
