import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
      include: { lines: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Import session not found' },
        { status: 404 }
      )
    }

    const unmappedCount = session.lines.filter((l) => !l.mapped).length
    if (unmappedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot validate: ${unmappedCount} lines are still unmapped`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.importSession.update({
      where: { id },
      data: { status: 'MAPPED' },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Validate import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
