import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const source = searchParams.get('source')

    const where: Record<string, unknown> = {}
    if (source) where.source = source

    const mappings = await prisma.accountMapping.findMany({
      where,
      include: { costCategory: true },
      orderBy: { accountCode: 'asc' },
    })

    return NextResponse.json(mappings)
  } catch (error) {
    console.error('Get account mappings error:', error)
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
    const { accountCode, accountName, costCategoryId, source } = body

    if (!accountCode || !costCategoryId || !source) {
      return NextResponse.json(
        { error: 'accountCode, costCategoryId, and source are required' },
        { status: 400 }
      )
    }

    const mapping = await prisma.accountMapping.upsert({
      where: {
        accountCode_source: { accountCode, source },
      },
      update: {
        accountName: accountName || null,
        costCategoryId,
      },
      create: {
        accountCode,
        accountName: accountName || null,
        costCategoryId,
        source,
      },
      include: { costCategory: true },
    })

    return NextResponse.json(mapping, { status: 201 })
  } catch (error) {
    console.error('Create/update account mapping error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
