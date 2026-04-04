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

    await params // ensure session id is valid
    const body = await request.json()
    const { lineId, costCategoryId } = body

    if (!lineId || !costCategoryId) {
      return NextResponse.json(
        { error: 'lineId and costCategoryId are required' },
        { status: 400 }
      )
    }

    const line = await prisma.importLine.update({
      where: { id: lineId },
      data: {
        costCategoryId,
        mapped: true,
      },
      include: { costCategory: true },
    })

    return NextResponse.json(line)
  } catch (error) {
    console.error('Map import line error:', error)
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

    const { id } = await params

    const session = await prisma.importSession.findUnique({
      where: { id },
      include: { lines: { where: { mapped: false } } },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Import session not found' },
        { status: 404 }
      )
    }

    const accountMappings = await prisma.accountMapping.findMany({
      where: { source: session.source },
    })
    const mappingLookup = new Map(
      accountMappings.map((m) => [m.accountCode, m.costCategoryId])
    )

    let mappedCount = 0

    for (const line of session.lines) {
      const costCategoryId = mappingLookup.get(line.accountCode)
      if (costCategoryId) {
        await prisma.importLine.update({
          where: { id: line.id },
          data: { costCategoryId, mapped: true },
        })
        mappedCount++
      }
    }

    return NextResponse.json({
      message: `Auto-mapped ${mappedCount} lines out of ${session.lines.length} unmapped lines`,
      mappedCount,
      totalUnmapped: session.lines.length,
    })
  } catch (error) {
    console.error('Auto-map error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
