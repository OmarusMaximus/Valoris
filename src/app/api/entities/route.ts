import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const entities = await prisma.entity.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(entities)
  } catch (error) {
    console.error('Get entities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
