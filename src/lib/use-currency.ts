"use client"
import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatCurrency } from '@/lib/utils'

type ExchangeRates = Record<string, number> // "EUR_XOF" -> 655.957

export function useCurrency() {
  const { displayCurrency, selectedPeriod } = useAppStore()
  const [rates, setRates] = useState<ExchangeRates>({})

  useEffect(() => {
    // Fetch all exchange rates for the current period
    fetch(`/api/exchange-rates?period=${selectedPeriod}`)
      .then(r => r.json())
      .then((data: Array<{ fromCurrency: string; toCurrency: string; rate: number }>) => {
        const rateMap: ExchangeRates = {}
        for (const r of data) {
          rateMap[`${r.fromCurrency}_${r.toCurrency}`] = r.rate
          // Also store reverse
          if (r.rate !== 0) {
            rateMap[`${r.toCurrency}_${r.fromCurrency}`] = 1 / r.rate
          }
        }
        setRates(rateMap)
      })
      .catch(() => {})
  }, [selectedPeriod])

  const getRate = useCallback((from: string, to: string): number => {
    if (from === to) return 1
    const direct = rates[`${from}_${to}`]
    if (direct) return direct
    // Try through EUR as pivot
    const fromToEur = rates[`${from}_EUR`] || (rates[`EUR_${from}`] ? 1 / rates[`EUR_${from}`] : null)
    const eurToTo = rates[`EUR_${to}`] || (rates[`${to}_EUR`] ? 1 / rates[`${to}_EUR`] : null)
    if (fromToEur && eurToTo) return fromToEur * eurToTo
    return 1
  }, [rates])

  const convert = useCallback((amount: number, fromCurrency: string = 'EUR'): number => {
    if (!displayCurrency) return amount // devise locale = no conversion
    return amount * getRate(fromCurrency, displayCurrency)
  }, [displayCurrency, getRate])

  const format = useCallback((amount: number, fromCurrency: string = 'EUR'): string => {
    const targetCurrency = displayCurrency || fromCurrency
    const converted = convert(amount, fromCurrency)
    return formatCurrency(converted, targetCurrency)
  }, [displayCurrency, convert])

  return { convert, format, displayCurrency, rates }
}
