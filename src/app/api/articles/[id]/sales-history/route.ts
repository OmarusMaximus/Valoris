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

    const article = await prisma.article.findUnique({ where: { id } })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const salesHistory = await prisma.articleSalesHistory.findMany({
      where: { articleId: id },
      orderBy: { period: 'asc' },
    })

    return NextResponse.json(salesHistory)
  } catch (error) {
    console.error('Get sales history error:', error)
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

    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { period, revenue, qtySold, avgPrice, variableCost, customerId, salesRepId } = body

    if (!period || revenue == null || qtySold == null || avgPrice == null || variableCost == null) {
      return NextResponse.json(
        { error: 'period, revenue, qtySold, avgPrice, and variableCost are required' },
        { status: 400 }
      )
    }

    const article = await prisma.article.findUnique({ where: { id } })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const entry = await prisma.articleSalesHistory.upsert({
      where: {
        articleId_period_customerId: {
          articleId: id,
          period,
          customerId: customerId ?? '',
        },
      },
      update: { revenue, qtySold, avgPrice, variableCost, salesRepId: salesRepId ?? null },
      create: { articleId: id, period, customerId: customerId ?? null, salesRepId: salesRepId ?? null, revenue, qtySold, avgPrice, variableCost },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Upsert sales history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
