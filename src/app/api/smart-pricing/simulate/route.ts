import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type ScenarioType = 'PRICE_INCREASE' | 'PRICE_DECREASE' | 'PROMOTION' | 'GRATUITY'

type ScenarioInput = {
  name: string
  type: ScenarioType
  priceChange?: number
  promotionDiscount?: number
  promotionDuration?: number
  gratuitySplit?: string
  useElasticity?: boolean
}

function parseGratuity(split: string): { bought: number; free: number } | null {
  const match = split.match(/^(\d+)\+(\d+)$/)
  if (!match) return null
  return { bought: parseInt(match[1]), free: parseInt(match[2]) }
}

async function getElasticity(articleId: string): Promise<number> {
  const salesHistory = await prisma.articleSalesHistory.findMany({
    where: { articleId },
    orderBy: { period: 'asc' },
  })

  if (salesHistory.length < 2) return -0.3 // Default conservative estimate

  const elasticities: number[] = []
  for (let i = 1; i < salesHistory.length; i++) {
    const prev = salesHistory[i - 1]
    const curr = salesHistory[i]
    if (prev.avgPrice === 0 || prev.qtySold === 0) continue
    const pctPriceChange = (curr.avgPrice - prev.avgPrice) / prev.avgPrice
    const pctVolumeChange = (curr.qtySold - prev.qtySold) / prev.qtySold
    if (Math.abs(pctPriceChange) > 0.01) {
      elasticities.push(pctVolumeChange / pctPriceChange)
    }
  }

  return elasticities.length > 0
    ? elasticities.reduce((a, b) => a + b, 0) / elasticities.length
    : -0.3
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { articleId, scenarios } = body as { articleId: string; scenarios: ScenarioInput[] }

    if (!articleId || !scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return NextResponse.json(
        { error: 'articleId and scenarios array are required' },
        { status: 400 }
      )
    }

    // Get article data
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { product: true },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Get recent sales history for baseline
    const salesHistory = await prisma.articleSalesHistory.findMany({
      where: { articleId },
      orderBy: { period: 'desc' },
      take: 6,
    })

    const recentHistory = salesHistory.reverse()

    // Calculate baseline metrics
    const currentPrice = recentHistory.length > 0
      ? recentHistory[recentHistory.length - 1].avgPrice
      : article.catalogPrice
    const currentVolume = recentHistory.length > 0
      ? recentHistory.reduce((sum: number, h: { qtySold: number }) => sum + h.qtySold, 0) / recentHistory.length
      : 0
    const currentRevenue = currentPrice * currentVolume
    const unitCost = recentHistory.length > 0
      ? recentHistory.reduce((sum: number, h: { variableCost: number }) => sum + h.variableCost, 0) / recentHistory.length
      : article.standardCost
    const currentMargin = currentRevenue - (unitCost * currentVolume)
    const currentMarginPct = currentRevenue > 0 ? currentMargin / currentRevenue : 0

    // Get elasticity
    const elasticity = await getElasticity(articleId)

    const results = scenarios.map((scenario: ScenarioInput) => {
      let newPrice = currentPrice
      let projectedVolume = currentVolume
      const projectionMonths = 12

      switch (scenario.type) {
        case 'PRICE_INCREASE': {
          const pctChange = (scenario.priceChange || 0) / 100
          newPrice = currentPrice * (1 + pctChange)
          if (scenario.useElasticity) {
            projectedVolume = currentVolume * (1 + elasticity * pctChange)
          }
          break
        }
        case 'PRICE_DECREASE': {
          const pctChange = Math.abs(scenario.priceChange || 0) / 100
          newPrice = currentPrice * (1 - pctChange)
          if (scenario.useElasticity) {
            projectedVolume = currentVolume * (1 + elasticity * (-pctChange))
          }
          break
        }
        case 'PROMOTION': {
          const discount = (scenario.promotionDiscount || 0) / 100
          const duration = scenario.promotionDuration || 3
          // Blended price over 12 months: N months at discount, rest at full price
          const promoMonths = Math.min(duration, projectionMonths)
          const normalMonths = projectionMonths - promoMonths
          const promoPrice = currentPrice * (1 - discount)
          newPrice = (promoPrice * promoMonths + currentPrice * normalMonths) / projectionMonths
          if (scenario.useElasticity) {
            // Volume boost during promotion
            const promoVolumeBoost = currentVolume * (1 + elasticity * (-discount))
            projectedVolume = (promoVolumeBoost * promoMonths + currentVolume * normalMonths) / projectionMonths
          }
          break
        }
        case 'GRATUITY': {
          const parsed = scenario.gratuitySplit ? parseGratuity(scenario.gratuitySplit) : null
          if (parsed) {
            // Effective price: customer pays for `bought` but gets `bought + free`
            const effectiveMultiplier = parsed.bought / (parsed.bought + parsed.free)
            newPrice = currentPrice * effectiveMultiplier
            // Volume increase from gratuity attractiveness
            if (scenario.useElasticity) {
              const effectiveDiscount = 1 - effectiveMultiplier
              projectedVolume = currentVolume * (1 + Math.abs(elasticity) * effectiveDiscount * 1.5) // Gratuities tend to attract more
            } else {
              projectedVolume = currentVolume * (1 + (1 / (parsed.bought + parsed.free))) // Minimum uplift
            }
          }
          break
        }
      }

      // Ensure volume stays positive
      projectedVolume = Math.max(0, projectedVolume)

      const projectedRevenue = newPrice * projectedVolume
      const projectedMargin = projectedRevenue - (unitCost * projectedVolume)
      const projectedMarginPct = projectedRevenue > 0 ? projectedMargin / projectedRevenue : 0

      // Breakeven volume: volume needed at new price to match current margin
      const breakEvenVolume = (newPrice - unitCost) > 0
        ? currentMargin / (newPrice - unitCost)
        : Infinity

      // Monthly projection
      const monthlyProjection = Array.from({ length: projectionMonths }, (_, i) => {
        let monthPrice = newPrice
        let monthVolume = projectedVolume

        // For promotions, differentiate promo vs normal months
        if (scenario.type === 'PROMOTION') {
          const promoMonths = scenario.promotionDuration || 3
          if (i < promoMonths) {
            const discount = (scenario.promotionDiscount || 0) / 100
            monthPrice = currentPrice * (1 - discount)
            if (scenario.useElasticity) {
              monthVolume = currentVolume * (1 + elasticity * (-discount))
            } else {
              monthVolume = currentVolume
            }
          } else {
            monthPrice = currentPrice
            monthVolume = currentVolume
          }
        }

        monthVolume = Math.max(0, monthVolume)
        const monthRevenue = monthPrice * monthVolume
        const monthMargin = monthRevenue - (unitCost * monthVolume)

        // Generate month label from current date
        const now = new Date()
        const monthDate = new Date(now.getFullYear(), now.getMonth() + i)
        const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`

        return {
          month,
          revenue: Math.round(monthRevenue * 100) / 100,
          volume: Math.round(monthVolume * 100) / 100,
          margin: Math.round(monthMargin * 100) / 100,
        }
      })

      return {
        name: scenario.name,
        type: scenario.type,
        currentPrice: Math.round(currentPrice * 100) / 100,
        newPrice: Math.round(newPrice * 100) / 100,
        currentVolume: Math.round(currentVolume * 100) / 100,
        projectedVolume: Math.round(projectedVolume * 100) / 100,
        currentRevenue: Math.round(currentRevenue * 100) / 100,
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        currentMargin: Math.round(currentMargin * 100) / 100,
        projectedMargin: Math.round(projectedMargin * 100) / 100,
        currentMarginPct: Math.round(currentMarginPct * 10000) / 10000,
        projectedMarginPct: Math.round(projectedMarginPct * 10000) / 10000,
        marginImpact: Math.round((projectedMargin - currentMargin) * 100) / 100,
        revenueImpact: Math.round((projectedRevenue - currentRevenue) * 100) / 100,
        breakEvenVolume: breakEvenVolume === Infinity ? null : Math.round(breakEvenVolume * 100) / 100,
        monthlyProjection,
      }
    })

    return NextResponse.json({
      articleId,
      articleName: article.name,
      unitCost: Math.round(unitCost * 100) / 100,
      elasticity: Math.round(elasticity * 100) / 100,
      scenarios: results,
    })
  } catch (error) {
    console.error('Pricing simulation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
