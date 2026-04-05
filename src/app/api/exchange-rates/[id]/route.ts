import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'FPA_DIRECTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { fromCurrency, toCurrency, rate, period } = body

    const exchangeRate = await prisma.exchangeRate.update({
      where: { id },
      data: {
        ...(fromCurrency && { fromCurrency }),
        ...(toCurrency && { toCurrency }),
        ...(rate !== undefined && { rate: parseFloat(rate) }),
        ...(period && { period }),
      },
    })

    return NextResponse.json(exchangeRate)
  } catch (error) {
    console.error('Update exchange rate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'FPA_DIRECTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.exchangeRate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete exchange rate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
