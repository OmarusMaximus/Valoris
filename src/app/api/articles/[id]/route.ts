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

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        product: {
          include: { category: true, entity: true },
        },
        entity: true,
        salesHistory: {
          orderBy: { period: 'desc' },
        },
      },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('Get article error:', error)
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

    const article = await prisma.article.update({
      where: { id },
      data: body,
      include: { product: true },
    })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Update article error:', error)
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

    const article = await prisma.article.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Deactivate article error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
