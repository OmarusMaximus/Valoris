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
    const period = searchParams.get('period')

    if (!entityId || !period) {
      return NextResponse.json(
        { error: 'entityId and period are required' },
        { status: 400 }
      )
    }

    // Get the cost sheet for this entity and period
    const costSheet = await prisma.costSheet.findUnique({
      where: { entityId_period: { entityId, period } },
      include: {
        lines: {
          include: { product: true, costCategory: true },
        },
      },
    })

    // Aggregate totals from cost sheet lines
    let totalRevenue = 0
    let totalCosts = 0
    let grossMargin = 0
    let contributionMargin = 0

    const marginByProduct: Array<{
      productId: string
      productName: string
      revenue: number
      totalCost: number
      grossMargin: number
      contributionMargin: number
    }> = []

    const costBreakdown: Record<string, number> = {}

    if (costSheet) {
      // Group lines by product
      const productLines = new Map<
        string,
        {
          productName: string
          revenue: number
          totalCost: number
          grossMargin: number
          contributionMargin: number
        }
      >()

      for (const line of costSheet.lines) {
        totalCosts += line.amount
        totalRevenue += line.revenue
        grossMargin += line.grossMargin
        contributionMargin += line.contributionMargin

        // Cost breakdown by category type
        if (line.costCategory) {
          const type = line.costCategory.type
          costBreakdown[type] = (costBreakdown[type] || 0) + line.amount
        }

        // Margin by product
        const existing = productLines.get(line.productId)
        if (existing) {
          existing.revenue += line.revenue
          existing.totalCost += line.amount
          existing.grossMargin += line.grossMargin
          existing.contributionMargin += line.contributionMargin
        } else {
          productLines.set(line.productId, {
            productName: line.product.name,
            revenue: line.revenue,
            totalCost: line.amount,
            grossMargin: line.grossMargin,
            contributionMargin: line.contributionMargin,
          })
        }
      }

      productLines.forEach((data, productId) => {
        marginByProduct.push({ productId, ...data })
      })
    }

    // Monthly evolution: last 6 months
    const [year, month] = period.split('-').map(Number)
    const monthlyEvolution: Array<{
      period: string
      grossMargin: number
      contributionMargin: number
      totalCosts: number
      totalRevenue: number
    }> = []

    for (let i = 5; i >= 0; i--) {
      let m = month - i
      let y = year
      while (m <= 0) {
        m += 12
        y -= 1
      }
      const p = `${y}-${String(m).padStart(2, '0')}`

      const sheet = await prisma.costSheet.findUnique({
        where: { entityId_period: { entityId, period: p } },
        include: { lines: true },
      })

      let periodRevenue = 0
      let periodCosts = 0
      let periodGrossMargin = 0
      let periodContributionMargin = 0

      if (sheet) {
        for (const line of sheet.lines) {
          periodRevenue += line.revenue
          periodCosts += line.amount
          periodGrossMargin += line.grossMargin
          periodContributionMargin += line.contributionMargin
        }
      }

      monthlyEvolution.push({
        period: p,
        grossMargin: periodGrossMargin,
        contributionMargin: periodContributionMargin,
        totalCosts: periodCosts,
        totalRevenue: periodRevenue,
      })
    }

    return NextResponse.json({
      totalRevenue,
      totalCosts,
      grossMargin,
      contributionMargin,
      marginByProduct,
      costBreakdown,
      monthlyEvolution,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
