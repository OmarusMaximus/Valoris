import prisma from './prisma'

export const CURRENCIES = ['EUR', 'CHF', 'MAD', 'XOF', 'KES', 'USD'] as const
export type Currency = typeof CURRENCIES[number]

export const CURRENCY_LABELS: Record<string, string> = {
  EUR: 'Euro (\u20ac)',
  CHF: 'Franc suisse (CHF)',
  MAD: 'Dirham (MAD)',
  XOF: 'Franc CFA (XOF)',
  KES: 'Shilling (KES)',
  USD: 'Dollar ($)',
}

// Get exchange rate for a period. Falls back to most recent rate if period not found.
export async function getExchangeRate(from: string, to: string, period: string): Promise<number> {
  if (from === to) return 1
  // Try exact period
  let rate = await prisma.exchangeRate.findUnique({
    where: { fromCurrency_toCurrency_period: { fromCurrency: from, toCurrency: to, period } }
  })
  if (rate) return rate.rate
  // Try reverse
  rate = await prisma.exchangeRate.findUnique({
    where: { fromCurrency_toCurrency_period: { fromCurrency: to, toCurrency: from, period } }
  })
  if (rate) return 1 / rate.rate
  // Fallback to latest rate
  const latest = await prisma.exchangeRate.findFirst({
    where: { OR: [{ fromCurrency: from, toCurrency: to }, { fromCurrency: to, toCurrency: from }] },
    orderBy: { period: 'desc' }
  })
  if (latest) {
    return latest.fromCurrency === from ? latest.rate : 1 / latest.rate
  }
  return 1 // default
}

// Convert amount between currencies
export async function convertCurrency(amount: number, from: string, to: string, period: string): Promise<number> {
  const rate = await getExchangeRate(from, to, period)
  return amount * rate
}

// Get all rates for a period
export async function getRatesForPeriod(period: string) {
  return prisma.exchangeRate.findMany({ where: { period }, orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }] })
}
