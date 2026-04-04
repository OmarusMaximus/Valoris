import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.ADMIN, ROLES.FPA_DIRECTOR])) {
      return NextResponse.json(
        { error: 'Only ADMIN or FPA_DIRECTOR can complete setup' },
        { status: 403 }
      )
    }

    await prisma.systemSetting.upsert({
      where: { key: 'setupComplete' },
      update: { value: 'true' },
      create: { key: 'setupComplete', value: 'true' },
    })

    return NextResponse.json({ message: 'Setup marked as complete' })
  } catch (error) {
    console.error('Complete setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
