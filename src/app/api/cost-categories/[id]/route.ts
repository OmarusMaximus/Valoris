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
    const { code, name, type, isVariable, includeInContributionMargin, sortOrder } = body

    const category = await prisma.costCategory.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(type && { type }),
        ...(isVariable !== undefined && { isVariable }),
        ...(includeInContributionMargin !== undefined && { includeInContributionMargin }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Update cost category error:', error)
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

    // Check if any import lines or cost sheet lines reference this category
    const importLineCount = await prisma.importLine.count({
      where: { costCategoryId: id },
    })

    const costSheetLineCount = await prisma.costSheetLine.count({
      where: { costCategoryId: id },
    })

    if (importLineCount > 0 || costSheetLineCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: referenced by ${importLineCount} import line(s) and ${costSheetLineCount} cost sheet line(s)` },
        { status: 400 }
      )
    }

    await prisma.costCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete cost category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
