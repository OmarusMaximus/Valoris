import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const skipFuture = body.skipFuture === true

    const settingKey = `onboarding_complete_${user.id}`

    // Upsert the onboarding completion setting
    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: skipFuture ? 'skip' : 'true' },
      create: {
        key: settingKey,
        value: skipFuture ? 'skip' : 'true',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding complete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
