import prisma from './prisma'

export type CostingMethod = 'CUMP' | 'FIFO' | 'STANDARD'

export interface CostCalculationResult {
  productId: string
  productName: string
  mpCost: number
  modCost: number
  overheadCost: number
  totalProductionCost: number
  unitCost: number
  quantity: number
  commercialCost: number
  contributionMargin: number
  grossMargin: number
}

/**
 * Calculate CUMP (Coût Unitaire Moyen Pondéré) for a product
 * CUMP = (Stock initial valorisé + Entrées valorisées) / (Qty stock initial + Qty entrées)
 */
export function calculateCUMP(
  initialStockQty: number,
  initialStockValue: number,
  entryQty: number,
  entryValue: number
): number {
  const totalQty = initialStockQty + entryQty
  if (totalQty === 0) return 0
  return (initialStockValue + entryValue) / totalQty
}

/**
 * Valorize PSF (Semi-finished / en-cours)
 * PSF Value = MP cost engaged + (transformation costs * % advancement)
 */
export function valuatePSF(
  mpCostEngaged: number,
  transformationCosts: number,
  advancementPct: number
): { mpCost: number; transformationCost: number; totalValue: number } {
  const transformationCost = transformationCosts * advancementPct
  return {
    mpCost: mpCostEngaged,
    transformationCost,
    totalValue: mpCostEngaged + transformationCost,
  }
}

/**
 * Calculate yield (rendement) over production cycle
 * Rendement = qty produced / qty MP consumed
 */
export function calculateYield(qtyProduced: number, qtyConsumedMP: number): number | null {
  if (qtyConsumedMP === 0) return null
  return qtyProduced / qtyConsumedMP
}

/**
 * Full cost calculation for a cost sheet
 */
export async function calculateCostSheet(
  entityId: string,
  period: string,
  _costingMethod: CostingMethod
): Promise<CostCalculationResult[]> {
  // Get all products for entity
  const products = await prisma.product.findMany({
    where: { entityId, active: true, category: { type: 'FINISHED_PRODUCT' } },
    include: { category: true },
  })

  // Get production entries for this period
  const productionEntries = await prisma.productionEntry.findMany({
    where: { entityId, period },
  })

  // Get import lines mapped to cost categories
  const importSession = await prisma.importSession.findFirst({
    where: { entityId, period, status: 'MAPPED' },
    include: {
      lines: { where: { mapped: true }, include: { costCategory: true } },
    },
  })

  // Get reallocations
  const reallocations = await prisma.reallocation.findMany({
    where: { entityId, period },
  })

  const results: CostCalculationResult[] = []

  for (const product of products) {
    const entry = productionEntries.find((e) => e.productId === product.id)
    const quantity = entry?.qtyProduced || 0

    // Aggregate costs by category type
    let mpCost = 0
    let modCost = 0
    let overheadCost = 0
    let commercialCost = 0

    if (importSession) {
      for (const line of importSession.lines) {
        if (!line.costCategory) continue
        // Simple proportional allocation by product (in production, would be more sophisticated)
        const share = quantity > 0 ? 1 / products.length : 0

        switch (line.costCategory.type) {
          case 'MP':
            mpCost += line.amount * share
            break
          case 'MOD':
            modCost += line.amount * share
            break
          case 'OVERHEAD_PROD':
            overheadCost += line.amount * share
            break
          case 'COMMERCIAL':
            commercialCost += line.amount * share
            break
        }
      }
    }

    // Use production entry MP cost if available
    if (entry && entry.qtyConsumedMP > 0) {
      mpCost = entry.qtyConsumedMP * entry.unitPriceMP
    }

    // Apply reallocations
    for (const realloc of reallocations) {
      // Simple: if target matches product family, add
      if (realloc.targetAxis === product.family) {
        overheadCost += realloc.amount / products.filter((p) => p.family === product.family).length
      }
    }

    const totalProductionCost = mpCost + modCost + overheadCost
    const unitCost = quantity > 0 ? totalProductionCost / quantity : 0

    results.push({
      productId: product.id,
      productName: product.name,
      mpCost,
      modCost,
      overheadCost,
      totalProductionCost,
      unitCost,
      quantity,
      commercialCost,
      contributionMargin: 0, // Set when revenue is known
      grossMargin: 0,
    })
  }

  return results
}
