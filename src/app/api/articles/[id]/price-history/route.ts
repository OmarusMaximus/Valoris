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

    const history = await prisma.articlePriceHistory.findMany({
      where: { articleId: id },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Get price history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const { catalogPrice, startDate, endDate, note } = body

    if (!catalogPrice || !startDate) {
      return NextResponse.json({ error: 'catalogPrice and startDate are required' }, { status: 400 })
    }

    // Close the previous current price (set endDate)
    if (!endDate) {
      await prisma.articlePriceHistory.updateMany({
        where: { articleId: id, endDate: null },
        data: { endDate: new Date(startDate) },
      })
    }

    // Create new price entry
    const entry = await prisma.articlePriceHistory.create({
      data: {
        articleId: id,
        catalogPrice: parseFloat(String(catalogPrice)),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        note: note || null,
      },
    })

    // Update article's current catalog price if this is the current price
    if (!endDate) {
      await prisma.article.update({
        where: { id },
        data: { catalogPrice: parseFloat(String(catalogPrice)) },
      })
    }

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Create price history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
