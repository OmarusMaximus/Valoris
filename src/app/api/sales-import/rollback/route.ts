import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { batchId } = body

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 })
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { importedRecords: true },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    if (batch.status === 'ROLLED_BACK') {
      return NextResponse.json({ error: 'Batch already rolled back' }, { status: 400 })
    }

    let deletedCount = 0
    let updatedCount = 0

    // Delete records that were CREATED
    const createdRecords = batch.importedRecords.filter(r => r.action === 'CREATED')
    for (const record of createdRecords) {
      try {
        if (record.tableName === 'ArticleSalesHistory') {
          await prisma.articleSalesHistory.delete({
            where: { id: record.recordId },
          })
          deletedCount++
        }
      } catch {
        // Record may have already been deleted
      }
    }

    // For UPDATED records, we cannot truly rollback (no snapshot of previous values)
    const updatedRecords = batch.importedRecords.filter(r => r.action === 'UPDATED')
    updatedCount = updatedRecords.length

    // Delete all ImportedRecords for this batch
    await prisma.importedRecord.deleteMany({
      where: { batchId: batch.id },
    })

    // Mark batch as rolled back
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'ROLLED_BACK' },
    })

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      updatedNotReverted: updatedCount,
      message: updatedCount > 0
        ? `${deletedCount} enregistrements supprimes. ${updatedCount} mises a jour ne peuvent pas etre annulees.`
        : `${deletedCount} enregistrements supprimes.`,
    })
  } catch (error) {
    console.error('Rollback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
