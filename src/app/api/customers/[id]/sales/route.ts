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

    const customer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const salesHistory = await prisma.articleSalesHistory.findMany({
      where: { customerId: id },
      include: {
        article: true,
        salesRep: true,
      },
    })

    // Aggregate by article
    const articleMap = new Map<string, { name: string; code: string; revenue: number; qty: number; totalPrice: number; count: number }>()
    for (const sh of salesHistory) {
      const key = sh.articleId
      const existing = articleMap.get(key)
      if (existing) {
        existing.revenue += sh.revenue
        existing.qty += sh.qtySold
        existing.totalPrice += sh.avgPrice * sh.qtySold
        existing.count += 1
      } else {
        articleMap.set(key, {
          name: sh.article.name,
          code: sh.article.code,
          revenue: sh.revenue,
          qty: sh.qtySold,
          totalPrice: sh.avgPrice * sh.qtySold,
          count: 1,
        })
      }
    }

    const salesByArticle = Array.from(articleMap.values())
      .map((a) => ({
        name: a.name,
        code: a.code,
        revenue: a.revenue,
        qty: a.qty,
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

    // Unique sales reps
    const repSet = new Set<string>()
    for (const sh of salesHistory) {
      if (sh.salesRep) repSet.add(sh.salesRep.id)
    }

    // Totals
    let totalRevenue = 0
    let totalQty = 0
    let totalVariableCost = 0
    for (const sh of salesHistory) {
      totalRevenue += sh.revenue
      totalQty += sh.qtySold
      totalVariableCost += sh.variableCost
    }

    return NextResponse.json({
      customer,
      totalRevenue,
      totalQty,
      totalMargin: totalRevenue - totalVariableCost,
      articleCount: articleMap.size,
      repCount: repSet.size,
      salesByArticle,
      salesByPeriod,
      topArticles: salesByArticle.slice(0, 10),
    })
  } catch (error) {
    console.error('Get customer sales error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
