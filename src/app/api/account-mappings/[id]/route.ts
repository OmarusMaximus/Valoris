import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { accountCode, accountName, costCategoryId, source } = body

    const mapping = await prisma.accountMapping.update({
      where: { id },
      data: {
        ...(accountCode && { accountCode }),
        ...(accountName !== undefined && { accountName: accountName || null }),
        ...(costCategoryId && { costCategoryId }),
        ...(source && { source }),
      },
      include: { costCategory: true },
    })

    return NextResponse.json(mapping)
  } catch (error) {
    console.error('Update account mapping error:', error)
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

    const { id } = await params

    await prisma.accountMapping.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account mapping error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
