import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rules = await prisma.allocationRule.findMany({
      include: { costCategory: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Get allocation rules error:', error)
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
      name,
      costCategoryId,
      sourceAxis,
      targetAxis,
      method,
      percentage,
    } = body

    if (!name || !costCategoryId || !sourceAxis || !targetAxis || !method) {
      return NextResponse.json(
        {
          error:
            'name, costCategoryId, sourceAxis, targetAxis, and method are required',
        },
        { status: 400 }
      )
    }

    const rule = await prisma.allocationRule.create({
      data: {
        name,
        costCategoryId,
        sourceAxis,
        targetAxis,
        method,
        percentage,
      },
      include: { costCategory: true },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Create allocation rule error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
