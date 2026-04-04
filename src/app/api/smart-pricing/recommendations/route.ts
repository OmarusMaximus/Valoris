import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type ElasticityClassification = 'INELASTIC' | 'MODERATELY_ELASTIC' | 'ELASTIC'
type VolumeTrend = 'GROWING' | 'STABLE' | 'DECLINING'
type MarginLevel = 'HEALTHY' | 'WARNING' | 'CRITICAL'
type RecommendationType =
  | 'PRICE_INCREASE_POTENTIAL'
  | 'COST_OPTIMIZATION'
  | 'TARGETED_PROMOTION'
  | 'PROGRESSIVE_INCREASE'
  | 'CAPITALIZE_GROWTH'
  | 'MARGIN_ALERT'

function classifyElasticity(e: number): ElasticityClassification {
  const abs = Math.abs(e)
  if (abs < 0.5) return 'INELASTIC'
  if (abs < 1) return 'MODERATELY_ELASTIC'
  return 'ELASTIC'
}

function classifyMargin(marginPct: number): MarginLevel {
  if (marginPct >= 0.35) return 'HEALTHY'
  if (marginPct >= 0.20) return 'WARNING'
  return 'CRITICAL'
}

function assessVolumeTrend(volumes: number[]): VolumeTrend {
  if (volumes.length < 3) return 'STABLE'
  const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2))
  const secondHalf = volumes.slice(Math.floor(volumes.length / 2))
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  if (avgFirst === 0) return 'STABLE'
  const change = (avgSecond - avgFirst) / avgFirst
  if (change > 0.10) return 'GROWING'
  if (change < -0.10) return 'DECLINING'
  return 'STABLE'
}

function computeElasticity(history: { avgPrice: number; qtySold: number }[]): number {
  if (history.length < 2) return 0
  const elasticities: number[] = []
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]
    const curr = history[i]
    if (prev.avgPrice === 0 || prev.qtySold === 0) continue
    const pctPriceChange = (curr.avgPrice - prev.avgPrice) / prev.avgPrice
    const pctVolumeChange = (curr.qtySold - prev.qtySold) / prev.qtySold
    if (Math.abs(pctPriceChange) > 0.01) {
      elasticities.push(pctVolumeChange / pctPriceChange)
    }
  }
  return elasticities.length > 0
    ? elasticities.reduce((a, b) => a + b, 0) / elasticities.length
    : 0
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const entityId = searchParams.get('entityId')

    // Get all active articles with their products and sales history
    const articleWhere: Record<string, unknown> = { active: true }
    if (entityId) {
      articleWhere.product = { entityId }
    }

    const articles = await prisma.article.findMany({
      where: articleWhere,
      include: {
        product: true,
        salesHistory: {
          orderBy: { period: 'asc' },
        },
      },
    })

    const recommendations: {
      articleId: string
      articleCode: string
      articleName: string
      productName: string
      productFamily: string | null
      currentPrice: number
      standardCost: number
      currentMargin: number
      currentMarginPct: number
      avgVolume: number
      elasticity: number
      elasticityClassification: ElasticityClassification
      volumeTrend: VolumeTrend
      marginLevel: MarginLevel
      type: RecommendationType
      priority: number
      title: string
      description: string
      suggestedAction: string
      potentialImpact: number
      potentialImpactPct: number
    }[] = []

    for (const article of articles) {
      const history = article.salesHistory as {
        period: string
        avgPrice: number
        qtySold: number
        revenue: number
        variableCost: number
      }[]

      if (history.length < 2) continue

      // Current metrics from recent history
      const recentHistory = history.slice(-6)
      const currentPrice = recentHistory[recentHistory.length - 1].avgPrice || article.catalogPrice
      const avgVolume = recentHistory.reduce((s, h) => s + h.qtySold, 0) / recentHistory.length
      const avgVariableCost = recentHistory.reduce((s, h) => s + h.variableCost, 0) / recentHistory.length
      const unitCost = avgVariableCost || article.standardCost
      const currentMargin = currentPrice - unitCost
      const currentMarginPct = currentPrice > 0 ? currentMargin / currentPrice : 0
      const currentRevenue = currentPrice * avgVolume

      // Analysis
      const elasticity = computeElasticity(history)
      const elasticityClassification = classifyElasticity(elasticity)
      const volumeTrend = assessVolumeTrend(history.map(h => h.qtySold))
      const marginLevel = classifyMargin(currentMarginPct)

      // Generate recommendation based on matrix
      let type: RecommendationType
      let priority: number
      let title: string
      let description: string
      let suggestedAction: string
      let potentialImpact: number

      if (marginLevel === 'CRITICAL') {
        if (elasticityClassification === 'INELASTIC') {
          type = 'PROGRESSIVE_INCREASE'
          priority = 1
          title = 'Augmentation progressive recommandee'
          description = `Marge critique (${(currentMarginPct * 100).toFixed(1)}%) mais article peu sensible au prix. Une hausse progressive est possible.`
          suggestedAction = `Augmenter le prix de 5-8% par trimestre sur 2-3 trimestres. Prix cible: ${(currentPrice * 1.15).toFixed(2)}.`
          potentialImpact = currentRevenue * 0.15
        } else {
          type = 'COST_OPTIMIZATION'
          priority = 1
          title = 'Optimiser les couts, prix sensible'
          description = `Marge critique (${(currentMarginPct * 100).toFixed(1)}%) et article sensible au prix. L'augmentation de prix risque de faire chuter les volumes.`
          suggestedAction = `Privilegier la reduction des couts variables (actuellement ${unitCost.toFixed(2)}/unite). Negocier les MP, optimiser le process.`
          potentialImpact = avgVolume * unitCost * 0.10
        }
      } else if (marginLevel === 'HEALTHY' && elasticityClassification === 'INELASTIC') {
        type = 'PRICE_INCREASE_POTENTIAL'
        priority = 2
        title = "Potentiel d'augmentation prix"
        description = `Marge saine (${(currentMarginPct * 100).toFixed(1)}%) et faible sensibilite au prix. Opportunite d'augmentation sans risque volume.`
        suggestedAction = `Augmenter le prix de 3-5%. Impact estime: +${(currentRevenue * 0.04).toFixed(0)} de CA additionnel.`
        potentialImpact = currentRevenue * 0.04
      } else if (marginLevel === 'HEALTHY' && elasticityClassification === 'ELASTIC' && volumeTrend === 'DECLINING') {
        type = 'TARGETED_PROMOTION'
        priority = 2
        title = 'Promotion ciblee recommandee'
        description = `Bonne marge (${(currentMarginPct * 100).toFixed(1)}%) mais volumes en baisse et forte sensibilite prix. Une promotion pourrait relancer les ventes.`
        suggestedAction = `Lancer une promotion -10% sur 2 mois ou une gratuite 10+1 pour relancer les volumes.`
        potentialImpact = avgVolume * currentMargin * 0.15
      } else if (volumeTrend === 'GROWING') {
        type = 'CAPITALIZE_GROWTH'
        priority = 3
        title = 'Capitaliser sur la croissance'
        description = `Volumes en croissance et prix stable. Confirmer le positionnement prix et maximiser les volumes.`
        suggestedAction = `Maintenir le prix actuel (${currentPrice.toFixed(2)}). Renforcer la distribution et la presence commerciale.`
        potentialImpact = avgVolume * currentMargin * 0.10
      } else if (marginLevel === 'WARNING') {
        if (elasticityClassification === 'INELASTIC') {
          type = 'PROGRESSIVE_INCREASE'
          priority = 2
          title = 'Augmentation progressive recommandee'
          description = `Marge a surveiller (${(currentMarginPct * 100).toFixed(1)}%) et faible sensibilite prix. Augmentation possible.`
          suggestedAction = `Augmenter de 3-5% pour ramener la marge au-dessus de 35%.`
          potentialImpact = currentRevenue * 0.04
        } else {
          type = 'MARGIN_ALERT'
          priority = 3
          title = 'Marge sous surveillance'
          description = `Marge en zone d'alerte (${(currentMarginPct * 100).toFixed(1)}%). Article sensible au prix, action sur les couts conseillee.`
          suggestedAction = `Surveiller l'evolution des couts. Envisager une optimisation du mix produit/canal.`
          potentialImpact = avgVolume * unitCost * 0.05
        }
      } else {
        // Healthy margin, moderate or stable - maintain
        type = 'CAPITALIZE_GROWTH'
        priority = 4
        title = 'Position prix equilibree'
        description = `Marge saine (${(currentMarginPct * 100).toFixed(1)}%) et volumes stables. Maintenir le positionnement.`
        suggestedAction = `Maintenir le prix actuel. Suivre l'evolution trimestrielle des volumes et des couts.`
        potentialImpact = 0
      }

      recommendations.push({
        articleId: article.id,
        articleCode: article.code,
        articleName: article.name,
        productName: article.product.name,
        productFamily: article.product.family,
        currentPrice: Math.round(currentPrice * 100) / 100,
        standardCost: Math.round(unitCost * 100) / 100,
        currentMargin: Math.round(currentMargin * 100) / 100,
        currentMarginPct: Math.round(currentMarginPct * 10000) / 10000,
        avgVolume: Math.round(avgVolume * 100) / 100,
        elasticity: Math.round(elasticity * 100) / 100,
        elasticityClassification,
        volumeTrend,
        marginLevel,
        type,
        priority,
        title,
        description,
        suggestedAction,
        potentialImpact: Math.round(potentialImpact * 100) / 100,
        potentialImpactPct: currentRevenue > 0
          ? Math.round((potentialImpact / currentRevenue) * 10000) / 10000
          : 0,
      })
    }

    // Sort by priority (ascending) then by potential impact (descending)
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return b.potentialImpact - a.potentialImpact
    })

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Pricing recommendations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
