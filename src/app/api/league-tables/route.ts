import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')
    const period = searchParams.get('period') // single period YYYY-MM
    const startPeriod = searchParams.get('startPeriod') // range start YYYY-MM
    const view = searchParams.get('view') || 'ARTICLE' // SALES_REP | CUSTOMER | ARTICLE
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Build period filter
    const periodFilter: Record<string, unknown> = {}
    if (period && startPeriod) {
      periodFilter.period = { gte: startPeriod, lte: period }
    } else if (period) {
      periodFilter.period = period
    }

    // Build entity filter via article -> product -> entityId
    const where: Record<string, unknown> = { ...periodFilter }
    if (entityId) {
      where.article = { product: { entityId } }
    }

    // Fetch all matching sales history with relations
    const salesHistory = await prisma.articleSalesHistory.findMany({
      where,
      include: {
        article: { include: { product: true } },
        customer: true,
        salesRep: true,
      },
    })

    let items: unknown[] = []
    const totals = { totalRevenue: 0, totalQty: 0, totalMargin: 0 }

    // Compute totals
    for (const sh of salesHistory) {
      totals.totalRevenue += sh.revenue
      totals.totalQty += sh.qtySold
      totals.totalMargin += sh.revenue - sh.variableCost
    }

    if (view === 'SALES_REP') {
      const grouped = new Map<string, {
        salesRepId: string | null
        salesRepName: string
        totalRevenue: number
        totalQty: number
        totalMargin: number
        revenueSum: number
        qtySum: number
        articles: Set<string>
        customers: Set<string>
      }>()

      for (const sh of salesHistory) {
        const key = sh.salesRepId || '__unassigned__'
        if (!grouped.has(key)) {
          const name = sh.salesRep
            ? `${sh.salesRep.firstName} ${sh.salesRep.lastName}`
            : 'Non assigné'
          grouped.set(key, {
            salesRepId: sh.salesRepId,
            salesRepName: name,
            totalRevenue: 0,
            totalQty: 0,
            totalMargin: 0,
            revenueSum: 0,
            qtySum: 0,
            articles: new Set(),
            customers: new Set(),
          })
        }
        const g = grouped.get(key)!
        g.totalRevenue += sh.revenue
        g.totalQty += sh.qtySold
        g.totalMargin += sh.revenue - sh.variableCost
        g.revenueSum += sh.revenue
        g.qtySum += sh.qtySold
        g.articles.add(sh.articleId)
        if (sh.customerId) g.customers.add(sh.customerId)
      }

      items = Array.from(grouped.values())
        .map((g, _i) => ({
          salesRepId: g.salesRepId,
          salesRepName: g.salesRepName,
          totalRevenue: g.totalRevenue,
          totalQty: g.totalQty,
          totalMargin: g.totalMargin,
          avgPrice: g.qtySum > 0 ? g.revenueSum / g.qtySum : 0,
          articleCount: g.articles.size,
          customerCount: g.customers.size,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)
        .map((item, i) => ({ ...item, rank: i + 1 }))

    } else if (view === 'CUSTOMER') {
      const grouped = new Map<string, {
        customerId: string | null
        customerName: string
        customerType: string | null
        totalRevenue: number
        totalQty: number
        totalMargin: number
        revenueSum: number
        qtySum: number
        articles: Set<string>
      }>()

      for (const sh of salesHistory) {
        const key = sh.customerId || '__unassigned__'
        if (!grouped.has(key)) {
          grouped.set(key, {
            customerId: sh.customerId,
            customerName: sh.customer?.name || 'Non assigné',
            customerType: sh.customer?.type || null,
            totalRevenue: 0,
            totalQty: 0,
            totalMargin: 0,
            revenueSum: 0,
            qtySum: 0,
            articles: new Set(),
          })
        }
        const g = grouped.get(key)!
        g.totalRevenue += sh.revenue
        g.totalQty += sh.qtySold
        g.totalMargin += sh.revenue - sh.variableCost
        g.revenueSum += sh.revenue
        g.qtySum += sh.qtySold
        g.articles.add(sh.articleId)
      }

      items = Array.from(grouped.values())
        .map((g) => ({
          customerId: g.customerId,
          customerName: g.customerName,
          customerType: g.customerType,
          totalRevenue: g.totalRevenue,
          totalQty: g.totalQty,
          totalMargin: g.totalMargin,
          avgPrice: g.qtySum > 0 ? g.revenueSum / g.qtySum : 0,
          articleCount: g.articles.size,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)
        .map((item, i) => ({ ...item, rank: i + 1 }))

    } else {
      // ARTICLE view (default)
      const grouped = new Map<string, {
        articleId: string
        articleName: string
        productName: string
        totalRevenue: number
        totalQty: number
        totalMargin: number
        revenueSum: number
        qtySum: number
        customers: Set<string>
      }>()

      for (const sh of salesHistory) {
        const key = sh.articleId
        if (!grouped.has(key)) {
          grouped.set(key, {
            articleId: sh.articleId,
            articleName: sh.article.name,
            productName: sh.article.product?.name || '',
            totalRevenue: 0,
            totalQty: 0,
            totalMargin: 0,
            revenueSum: 0,
            qtySum: 0,
            customers: new Set(),
          })
        }
        const g = grouped.get(key)!
        g.totalRevenue += sh.revenue
        g.totalQty += sh.qtySold
        g.totalMargin += sh.revenue - sh.variableCost
        g.revenueSum += sh.revenue
        g.qtySum += sh.qtySold
        if (sh.customerId) g.customers.add(sh.customerId)
      }

      items = Array.from(grouped.values())
        .map((g) => ({
          articleId: g.articleId,
          articleName: g.articleName,
          productName: g.productName,
          totalRevenue: g.totalRevenue,
          totalQty: g.totalQty,
          totalMargin: g.totalMargin,
          avgPrice: g.qtySum > 0 ? g.revenueSum / g.qtySum : 0,
          customerCount: g.customers.size,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)
        .map((item, i) => ({ ...item, rank: i + 1 }))
    }

    return NextResponse.json({
      view,
      period: startPeriod ? `${startPeriod} - ${period}` : period,
      items,
      totals,
    })
  } catch (error) {
    console.error('League tables error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
