import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { parseExcelFile } from '@/lib/excel-import'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const period = searchParams.get('period')

    const where: Record<string, unknown> = {}
    if (entityId) where.entityId = entityId
    if (period) where.period = period

    const sessions = await prisma.importSession.findMany({
      where,
      include: {
        entity: true,
        importedBy: true,
        lines: { select: { id: true, mapped: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = sessions.map((s) => ({
      ...s,
      totalLines: s.lines.length,
      mappedLines: s.lines.filter((l) => l.mapped).length,
      lines: undefined,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get import sessions error:', error)
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityId = formData.get('entityId') as string | null
    const period = formData.get('period') as string | null
    const source = formData.get('source') as string | null

    if (!file || !entityId || !period || !source) {
      return NextResponse.json(
        { error: 'file, entityId, period, and source are required' },
        { status: 400 }
      )
    }

    if (source !== 'BOARD_COM' && source !== 'SAGE_X3') {
      return NextResponse.json(
        { error: 'source must be BOARD_COM or SAGE_X3' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsedLines = parseExcelFile(buffer, source)

    // Get existing account mappings for auto-mapping
    const accountMappings = await prisma.accountMapping.findMany({
      where: { source },
    })
    const mappingLookup = new Map(
      accountMappings.map((m) => [m.accountCode, m.costCategoryId])
    )

    const session = await prisma.importSession.create({
      data: {
        entityId,
        period,
        source,
        fileName: file.name,
        importedById: user.id,
        status: 'PENDING',
        lines: {
          create: parsedLines.map((line) => {
            const costCategoryId = mappingLookup.get(line.accountCode)
            return {
              accountCode: line.accountCode,
              accountName: line.accountName,
              amount: line.amount,
              analyticalAxis: line.analyticalAxis,
              costCategoryId: costCategoryId || null,
              mapped: !!costCategoryId,
            }
          }),
        },
      },
      include: {
        lines: { include: { costCategory: true } },
        entity: true,
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
