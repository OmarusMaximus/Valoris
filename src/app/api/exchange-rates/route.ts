import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const fromCurrency = searchParams.get('fromCurrency')
    const toCurrency = searchParams.get('toCurrency')

    const where: Record<string, string> = {}
    if (period) where.period = period
    if (fromCurrency) where.fromCurrency = fromCurrency
    if (toCurrency) where.toCurrency = toCurrency

    const rates = await prisma.exchangeRate.findMany({
      where,
      orderBy: [{ period: 'desc' }, { fromCurrency: 'asc' }, { toCurrency: 'asc' }],
    })

    return NextResponse.json(rates)
  } catch (error) {
    console.error('Get exchange rates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'FPA_DIRECTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { fromCurrency, toCurrency, rate, period } = body

    if (!fromCurrency || !toCurrency || !rate || !period) {
      return NextResponse.json(
        { error: 'fromCurrency, toCurrency, rate, and period are required' },
        { status: 400 }
      )
    }

    if (fromCurrency === toCurrency) {
      return NextResponse.json(
        { error: 'fromCurrency and toCurrency must be different' },
        { status: 400 }
      )
    }

    const exchangeRate = await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_period: { fromCurrency, toCurrency, period },
      },
      update: { rate: parseFloat(rate) },
      create: {
        fromCurrency,
        toCurrency,
        rate: parseFloat(rate),
        period,
      },
    })

    return NextResponse.json(exchangeRate, { status: 201 })
  } catch (error) {
    console.error('Create exchange rate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
