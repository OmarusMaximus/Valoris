import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const categories = await prisma.costCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Get cost categories error:', error)
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

    const body = await request.json()
    const {
      code,
      name,
      type,
      isVariable,
      includeInContributionMargin,
      sortOrder,
    } = body

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'code, name, and type are required' },
        { status: 400 }
      )
    }

    const category = await prisma.costCategory.create({
      data: {
        code,
        name,
        type,
        isVariable: isVariable ?? true,
        includeInContributionMargin: includeInContributionMargin ?? false,
        sortOrder: sortOrder ?? 0,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create cost category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
