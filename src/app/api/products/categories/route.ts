import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const categories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Get categories error:', error)
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
    const { code, name, type } = body

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'code, name, and type are required' },
        { status: 400 }
      )
    }

    const category = await prisma.productCategory.create({
      data: { code, name, type },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
