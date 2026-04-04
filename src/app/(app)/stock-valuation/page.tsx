"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { formatCurrency, formatNumber, formatPercent, getPeriodLabel } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Package,
  Loader2,
  RefreshCw,
  Boxes,
  Info,
} from "lucide-react"

type PSFValuation = {
  id: string
  product: string
  mpCostEngaged: number
  advancementPercent: number
  transformationCost: number
  totalPSFValue: number
}

type FinishedProductValuation = {
  id: string
  product: string
  stockQty: number
  unitCost: number
  totalValue: number
  method: "CUMP" | "FIFO" | "STANDARD"
}

type StockValuationData = {
  psf: PSFValuation[]
  finishedProducts: FinishedProductValuation[]
}

export default function StockValuationPage() {
  const { selectedEntityId, selectedPeriod } = useAppStore()

  const [data, setData] = useState<StockValuationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedEntityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("entityId", selectedEntityId)
      params.set("period", selectedPeriod)
      const res = await fetch(`/api/stock-valuation?${params.toString()}`)
      if (!res.ok) throw new Error("Erreur chargement")
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedPeriod])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const calculateValuations = async () => {
    setCalculating(true)
    try {
      const res = await fetch("/api/stock-valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selectedEntityId,
          period: selectedPeriod,
        }),
      })
      if (!res.ok) throw new Error("Erreur calcul")
      await fetchData()
    } catch {
      // error handled silently
    } finally {
      setCalculating(false)
    }
  }

  const totalPSF = data?.psf.reduce((sum, p) => sum + p.totalPSFValue, 0) ?? 0
  const totalFinished = data?.finishedProducts.reduce((sum, p) => sum + p.totalValue, 0) ?? 0

  if (!selectedEntityId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <Boxes className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">
          Veuillez selectionner une entite pour afficher la valorisation des stocks
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const psfList = data?.psf ?? []
  const finishedList = data?.finishedProducts ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Valorisation des stocks</h1>
          <p className="text-slate-500">{getPeriodLabel(selectedPeriod)}</p>
        </div>
        <Button onClick={calculateValuations} disabled={calculating}>
          {calculating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Calculer les valorisations
        </Button>
      </div>

      {/* PSF Valuation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Valorisation PSF (Produits semi-finis)
          </CardTitle>
          <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Valeur PSF = Cout MP engagee + (Cout de transformation x % Avancement)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {psfList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package className="h-10 w-10 mb-3" />
              <p className="text-sm">Aucun produit semi-fini pour cette periode</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Cout MP engagee</TableHead>
                    <TableHead className="text-right">% Avancement</TableHead>
                    <TableHead className="text-right">Cout transformation</TableHead>
                    <TableHead className="text-right">Valeur PSF totale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {psfList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.product}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.mpCostEngaged)}</TableCell>
                      <TableCell className="text-right">{formatPercent(p.advancementPercent / 100)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.transformationCost)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.totalPSFValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-sm text-slate-500">
                  Total PSF :{" "}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(totalPSF)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Finished Product Valuation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Valorisation des produits finis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finishedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Boxes className="h-10 w-10 mb-3" />
              <p className="text-sm">Aucun produit fini pour cette periode</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qte en stock</TableHead>
                    <TableHead className="text-right">Cout unitaire</TableHead>
                    <TableHead className="text-right">Valeur totale</TableHead>
                    <TableHead>Methode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finishedList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.product}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.stockQty, 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.unitCost)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.totalValue)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          p.method === "CUMP" ? "default" :
                          p.method === "FIFO" ? "secondary" :
                          "outline"
                        }>
                          {p.method}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-sm text-slate-500">
                  Total produits finis :{" "}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(totalFinished)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
