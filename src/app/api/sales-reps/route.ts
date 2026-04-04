import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { active: true }
    if (entityId) where.entityId = entityId
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { code: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const salesReps = await prisma.salesRep.findMany({
      where,
      orderBy: { lastName: 'asc' },
    })

    return NextResponse.json(salesReps)
  } catch (error) {
    console.error('Get sales reps error:', error)
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

    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { code, firstName, lastName, email, region, entityId } = body

    if (!code || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'code, firstName, and lastName are required' },
        { status: 400 }
      )
    }

    const salesRep = await prisma.salesRep.create({
      data: { code, firstName, lastName, email, region, entityId },
    })

    return NextResponse.json(salesRep, { status: 201 })
  } catch (error) {
    console.error('Create sales rep error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
