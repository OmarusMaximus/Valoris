import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')

    const batches = await prisma.importBatch.findMany({
      where: {
        type: 'SALES',
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { importedRecords: true },
        },
      },
    })

    const result = batches.map(b => ({
      id: b.id,
      entityId: b.entityId,
      fileName: b.fileName,
      rowCount: b.rowCount,
      imported: b.imported,
      skipped: b.skipped,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      recordCount: b._count.importedRecords,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
