import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.ADMIN, ROLES.FPA_DIRECTOR])) {
      return NextResponse.json(
        { error: 'Only ADMIN or FPA_DIRECTOR can create entities' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { code, name, country, currency } = body

    if (!code || !name || !country || !currency) {
      return NextResponse.json(
        { error: 'code, name, country, and currency are required' },
        { status: 400 }
      )
    }

    const entity = await prisma.entity.create({
      data: { code, name, country, currency },
    })

    return NextResponse.json(entity, { status: 201 })
  } catch (error) {
    console.error('Create entity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
