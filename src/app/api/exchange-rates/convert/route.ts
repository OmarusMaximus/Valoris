import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getExchangeRate } from '@/lib/currency'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const amountStr = searchParams.get('amount')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const period = searchParams.get('period')

    if (!amountStr || !from || !to || !period) {
      return NextResponse.json(
        { error: 'amount, from, to, and period are required' },
        { status: 400 }
      )
    }

    const amount = parseFloat(amountStr)
    if (isNaN(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const rate = await getExchangeRate(from, to, period)
    const converted = amount * rate

    return NextResponse.json({
      amount,
      from,
      to,
      rate,
      converted,
      period,
    })
  } catch (error) {
    console.error('Convert currency error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
