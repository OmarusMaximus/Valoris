import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type ElasticityClassification = 'INELASTIC' | 'MODERATELY_ELASTIC' | 'ELASTIC'

function classifyElasticity(e: number): ElasticityClassification {
  const abs = Math.abs(e)
  if (abs < 0.5) return 'INELASTIC'
  if (abs < 1) return 'MODERATELY_ELASTIC'
  return 'ELASTIC'
}

function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const sumX2 = xs.reduce((a, x) => a + x * x, 0)

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const ssRes = ys.reduce((a, y, i) => a + Math.pow(y - (slope * xs[i] + intercept), 2), 0)
  const meanY = sumY / n
  const ssTot = ys.reduce((a, y) => a + Math.pow(y - meanY, 2), 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  return { slope, intercept, r2 }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const articleId = searchParams.get('articleId')
    const productId = searchParams.get('productId')
    const periodsParam = searchParams.get('periods')
    const periods = periodsParam ? parseInt(periodsParam) : 12

    if (!articleId && !productId) {
      return NextResponse.json(
        { error: 'articleId or productId is required' },
        { status: 400 }
      )
    }

    // Get articles to analyze
    let articleIds: string[] = []
    if (articleId) {
      articleIds = [articleId]
    } else if (productId) {
      const articles = await prisma.article.findMany({
        where: { productId, active: true },
        select: { id: true },
      })
      articleIds = articles.map((a: { id: string }) => a.id)
    }

    if (articleIds.length === 0) {
      return NextResponse.json({ error: 'No articles found' }, { status: 404 })
    }

    // For single article analysis
    const targetId = articleIds[0]
    const article = await prisma.article.findUnique({
      where: { id: targetId },
      include: { product: true },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Get sales history ordered by period
    const salesHistory = await prisma.articleSalesHistory.findMany({
      where: { articleId: targetId },
      orderBy: { period: 'asc' },
    })

    // Limit to last N periods
    const recentHistory = salesHistory.slice(-periods)

    if (recentHistory.length < 2) {
      return NextResponse.json({
        articleId: targetId,
        articleName: article.name,
        elasticity: 0,
        classification: 'INELASTIC' as ElasticityClassification,
        confidence: 0,
        dataPoints: recentHistory.map((h: { period: string; avgPrice: number; qtySold: number; revenue: number }) => ({
          period: h.period,
          price: h.avgPrice,
          volume: h.qtySold,
          revenue: h.revenue,
        })),
        recommendation: 'Insufficient data for elasticity analysis. At least 2 periods of sales history are required.',
      })
    }

    // Calculate period-over-period elasticity
    const elasticities: number[] = []
    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1]
      const curr = recentHistory[i]

      if (prev.avgPrice === 0 || prev.qtySold === 0) continue

      const pctPriceChange = (curr.avgPrice - prev.avgPrice) / prev.avgPrice
      const pctVolumeChange = (curr.qtySold - prev.qtySold) / prev.qtySold

      // Only include meaningful price changes (> 1% to filter noise)
      if (Math.abs(pctPriceChange) > 0.01) {
        elasticities.push(pctVolumeChange / pctPriceChange)
      }
    }

    // Average elasticity
    const avgElasticity = elasticities.length > 0
      ? elasticities.reduce((a, b) => a + b, 0) / elasticities.length
      : 0

    const classification = classifyElasticity(avgElasticity)

    // Calculate confidence based on consistency of elasticity measurements
    const confidence = elasticities.length >= 3
      ? Math.max(0, Math.min(1, 1 - (
          Math.sqrt(elasticities.reduce((a, e) => a + Math.pow(e - avgElasticity, 2), 0) / elasticities.length)
          / (Math.abs(avgElasticity) + 0.1)
        )))
      : elasticities.length >= 1
        ? 0.3
        : 0

    // Scatter plot data
    const dataPoints = recentHistory.map((h: { period: string; avgPrice: number; qtySold: number; revenue: number }) => ({
      period: h.period,
      price: h.avgPrice,
      volume: h.qtySold,
      revenue: h.revenue,
    }))

    // Linear regression for trend line
    const prices = dataPoints.map((d: { price: number }) => d.price)
    const volumes = dataPoints.map((d: { volume: number }) => d.volume)
    const regression = linearRegression(prices, volumes)

    // Generate recommendation
    let recommendation: string
    switch (classification) {
      case 'INELASTIC':
        recommendation = `L'article "${article.name}" est peu sensible au prix (elasticite = ${avgElasticity.toFixed(2)}). Une augmentation de prix moderee est envisageable sans impact significatif sur les volumes.`
        break
      case 'MODERATELY_ELASTIC':
        recommendation = `L'article "${article.name}" est moderement sensible au prix (elasticite = ${avgElasticity.toFixed(2)}). Les ajustements de prix doivent etre progressifs et accompagnes d'actions commerciales.`
        break
      case 'ELASTIC':
        recommendation = `L'article "${article.name}" est tres sensible au prix (elasticite = ${avgElasticity.toFixed(2)}). Toute augmentation de prix risque de reduire significativement les volumes. Privilegier l'optimisation des couts.`
        break
    }

    return NextResponse.json({
      articleId: targetId,
      articleName: article.name,
      elasticity: Math.round(avgElasticity * 100) / 100,
      classification,
      confidence: Math.round(confidence * 100) / 100,
      dataPoints,
      trendLine: {
        slope: regression.slope,
        intercept: regression.intercept,
        r2: regression.r2,
      },
      recommendation,
    })
  } catch (error) {
    console.error('Elasticity analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
