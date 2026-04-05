import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, entityId } = body

    if (!mode || !['ALL', 'LAST_BATCH'].includes(mode)) {
      return NextResponse.json({ error: 'mode must be ALL or LAST_BATCH' }, { status: 400 })
    }

    if (mode === 'ALL') {
      // Requires ADMIN
      if (!requireRole(user.role, [ROLES.ADMIN])) {
        return NextResponse.json({ error: 'Forbidden - ADMIN required' }, { status: 403 })
      }

      // Delete all ArticleSalesHistory (optionally filtered by entityId)
      let deleted = 0
      if (entityId) {
        // Find articles belonging to this entity
        const articles = await prisma.article.findMany({
          where: { entityId },
          select: { id: true },
        })
        const articleIds = articles.map(a => a.id)
        if (articleIds.length > 0) {
          const result = await prisma.articleSalesHistory.deleteMany({
            where: { articleId: { in: articleIds } },
          })
          deleted = result.count
        }
      } else {
        const result = await prisma.articleSalesHistory.deleteMany({})
        deleted = result.count
      }

      // Delete all ImportedRecords then ImportBatches
      await prisma.importedRecord.deleteMany({})
      await prisma.importBatch.deleteMany(
        entityId ? { where: { entityId } } : {}
      )

      return NextResponse.json({ deleted })
    }

    // mode === 'LAST_BATCH'
    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const lastBatch = await prisma.importBatch.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: { importedRecords: true },
    })

    if (!lastBatch) {
      return NextResponse.json({ error: 'No completed batch found' }, { status: 404 })
    }

    let deleted = 0

    // Delete CREATED records
    const createdRecords = lastBatch.importedRecords.filter(r => r.action === 'CREATED')
    for (const record of createdRecords) {
      try {
        if (record.tableName === 'ArticleSalesHistory') {
          await prisma.articleSalesHistory.delete({
            where: { id: record.recordId },
          })
          deleted++
        }
      } catch {
        // Record may already be gone
      }
    }

    // Delete ImportedRecords
    await prisma.importedRecord.deleteMany({
      where: { batchId: lastBatch.id },
    })

    // Mark batch as rolled back
    await prisma.importBatch.update({
      where: { id: lastBatch.id },
      data: { status: 'ROLLED_BACK' },
    })

    return NextResponse.json({ deleted })
  } catch (error) {
    console.error('Clear error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
