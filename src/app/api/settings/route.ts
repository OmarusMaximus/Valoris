import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.ADMIN])) {
      return NextResponse.json(
        { error: 'Only administrators can update settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key and value are required' },
        { status: 400 }
      )
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Update setting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
