import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    const salesRep = await prisma.salesRep.findUnique({
      where: { id },
    })

    if (!salesRep) {
      return NextResponse.json({ error: 'Sales rep not found' }, { status: 404 })
    }

    const salesHistory = await prisma.articleSalesHistory.findMany({
      where: { salesRepId: id },
      include: {
        article: true,
        customer: true,
      },
    })

    // Aggregate by customer
    const customerMap = new Map<string, { name: string; code: string; revenue: number; qty: number }>()
    for (const sh of salesHistory) {
      if (!sh.customer) continue
      const key = sh.customerId || 'unknown'
      const existing = customerMap.get(key)
      if (existing) {
        existing.revenue += sh.revenue
        existing.qty += sh.qtySold
      } else {
        customerMap.set(key, {
          name: sh.customer.name,
          code: sh.customer.code,
          revenue: sh.revenue,
          qty: sh.qtySold,
        })
      }
    }

    const salesByCustomer = Array.from(customerMap.values())
      .sort((a, b) => b.revenue - a.revenue)

    // Aggregate by article
    const articleMap = new Map<string, { name: string; code: string; revenue: number; qty: number; totalPrice: number }>()
    for (const sh of salesHistory) {
      const key = sh.articleId
      const existing = articleMap.get(key)
      if (existing) {
        existing.revenue += sh.revenue
        existing.qty += sh.qtySold
        existing.totalPrice += sh.avgPrice * sh.qtySold
      } else {
        articleMap.set(key, {
          name: sh.article.name,
          code: sh.article.code,
          revenue: sh.revenue,
          qty: sh.qtySold,
          totalPrice: sh.avgPrice * sh.qtySold,
        })
      }
    }

    const salesByArticle = Array.from(articleMap.values())
      .map((a) => ({
        ...a,
        avgPrice: a.qty > 0 ? a.totalPrice / a.qty : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Aggregate by period
    const periodMap = new Map<string, { revenue: number; qty: number }>()
    for (const sh of salesHistory) {
      const existing = periodMap.get(sh.period)
      if (existing) {
        existing.revenue += sh.revenue
        existing.qty += sh.qtySold
      } else {
        periodMap.set(sh.period, { revenue: sh.revenue, qty: sh.qtySold })
      }
    }

    const salesByPeriod = Array.from(periodMap.entries())
      .map(([period, data]) => ({ period, month: period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period))

    // Totals
    let totalRevenue = 0
    let totalQty = 0
    for (const sh of salesHistory) {
      totalRevenue += sh.revenue
      totalQty += sh.qtySold
    }

    return NextResponse.json({
      salesRep,
      totalRevenue,
      totalQty,
      clientCount: customerMap.size,
      articleCount: articleMap.size,
      salesByCustomer,
      salesByArticle,
      salesByPeriod,
    })
  } catch (error) {
    console.error('Get sales rep sales error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
