"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { formatNumber, formatPercent, getPeriodLabel, formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Save, Loader2, Factory, Check } from "lucide-react"

type Product = {
  id: string
  code: string
  name: string
  unit: string
  family: string
}

type ProductionEntry = {
  id?: string
  productId: string
  qtyProduced: number
  qtyConsumedMP: number
  unitPriceMP: number
  qtyPSF: number
  psfAdvancement: number
  stockInitial: number
  stockFinal: number
}

type RowState = ProductionEntry & {
  product: Product
  dirty: boolean
  saving: boolean
  saved: boolean
}

export default function ProductionPage() {
  const { selectedEntityId, selectedPeriod } = useAppStore()
  const [rows, setRows] = useState<RowState[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedEntityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [productsRes, entriesRes] = await Promise.all([
        fetch(`/api/products?entityId=${selectedEntityId}&families=produit_fini,produit_semi_fini`),
        fetch(
          `/api/production?entityId=${selectedEntityId}&period=${selectedPeriod}`
        ),
      ])

      const products: Product[] = productsRes.ok ? await productsRes.json() : []
      const entries: ProductionEntry[] = entriesRes.ok ? await entriesRes.json() : []

      const entryMap = new Map<string, ProductionEntry>()
      for (const entry of entries) {
        entryMap.set(entry.productId, entry)
      }

      const initialRows: RowState[] = products.map((product) => {
        const existing = entryMap.get(product.id)
        return {
          product,
          productId: product.id,
          id: existing?.id,
          qtyProduced: existing?.qtyProduced ?? 0,
          qtyConsumedMP: existing?.qtyConsumedMP ?? 0,
          unitPriceMP: existing?.unitPriceMP ?? 0,
          qtyPSF: existing?.qtyPSF ?? 0,
          psfAdvancement: existing?.psfAdvancement ?? 0,
          stockInitial: existing?.stockInitial ?? 0,
          stockFinal: existing?.stockFinal ?? 0,
          dirty: false,
          saving: false,
          saved: false,
        }
      })

      setRows(initialRows)
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedPeriod])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateRow = (index: number, field: keyof ProductionEntry, value: number) => {
    setRows((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: value,
        dirty: true,
        saved: false,
      }
      return updated
    })
  }

  const saveRow = async (index: number) => {
    const row = rows[index]
    setRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], saving: true }
      return updated
    })

    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          productId: row.productId,
          entityId: selectedEntityId,
          period: selectedPeriod,
          qtyProduced: row.qtyProduced,
          qtyConsumedMP: row.qtyConsumedMP,
          unitPriceMP: row.unitPriceMP,
          qtyPSF: row.qtyPSF,
          psfAdvancement: row.psfAdvancement,
          stockInitial: row.stockInitial,
          stockFinal: row.stockFinal,
        }),
      })

      if (res.ok) {
        const saved = await res.json()
        setRows((prev) => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            id: saved.id,
            dirty: false,
            saving: false,
            saved: true,
          }
          return updated
        })
      } else {
        setRows((prev) => {
          const updated = [...prev]
          updated[index] = { ...updated[index], saving: false }
          return updated
        })
      }
    } catch {
      setRows((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], saving: false }
        return updated
      })
    }
  }

  const getYield = (row: RowState): number => {
    if (row.qtyConsumedMP === 0) return 0
    return row.qtyProduced / row.qtyConsumedMP
  }

  const totals = rows.reduce(
    (acc, row) => ({
      qtyProduced: acc.qtyProduced + row.qtyProduced,
      qtyConsumedMP: acc.qtyConsumedMP + row.qtyConsumedMP,
      totalCostMP: acc.totalCostMP + row.qtyConsumedMP * row.unitPriceMP,
      qtyPSF: acc.qtyPSF + row.qtyPSF,
      stockInitial: acc.stockInitial + row.stockInitial,
      stockFinal: acc.stockFinal + row.stockFinal,
    }),
    {
      qtyProduced: 0,
      qtyConsumedMP: 0,
      totalCostMP: 0,
      qtyPSF: 0,
      stockInitial: 0,
      stockFinal: 0,
    }
  )

  if (!selectedEntityId) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        <p>Veuillez sélectionner une entité.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saisie production</h1>
        <p className="text-sm text-slate-500">{getPeriodLabel(selectedPeriod)}</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Factory className="mb-2 h-10 w-10" />
            <p>Aucun produit fini ou semi-fini trouvé pour cette entité</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Données de production</CardTitle>
            <CardDescription>
              Saisissez les quantités produites et consommées pour chaque produit
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Produit</TableHead>
                  <TableHead className="text-right min-w-[100px]">Qté produite</TableHead>
                  <TableHead className="text-right min-w-[100px]">Qté MP consommée</TableHead>
                  <TableHead className="text-right min-w-[100px]">PU MP</TableHead>
                  <TableHead className="text-right min-w-[80px]">Qté PSF</TableHead>
                  <TableHead className="text-right min-w-[100px]">Avancement PSF (%)</TableHead>
                  <TableHead className="text-right min-w-[100px]">Stock initial</TableHead>
                  <TableHead className="text-right min-w-[100px]">Stock final</TableHead>
                  <TableHead className="text-right min-w-[80px]">Rendement</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const yieldVal = getYield(row)
                  return (
                    <TableRow key={row.productId}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{row.product.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{row.product.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right w-24 ml-auto"
                          value={row.qtyProduced || ""}
                          onChange={(e) =>
                            updateRow(index, "qtyProduced", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right w-24 ml-auto"
                          value={row.qtyConsumedMP || ""}
                          onChange={(e) =>
                            updateRow(index, "qtyConsumedMP", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right w-24 ml-auto"
                          value={row.unitPriceMP || ""}
                          onChange={(e) =>
                            updateRow(index, "unitPriceMP", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right w-20 ml-auto"
                          value={row.qtyPSF || ""}
                          onChange={(e) =>
                            updateRow(index, "qtyPSF", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          className="text-right w-20 ml-auto"
                          value={row.psfAdvancement || ""}
                          onChange={(e) =>
                            updateRow(index, "psfAdvancement", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right w-24 ml-auto"
                          value={row.stockInitial || ""}
                          onChange={(e) =>
                            updateRow(index, "stockInitial", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right w-24 ml-auto"
                          value={row.stockFinal || ""}
                          onChange={(e) =>
                            updateRow(index, "stockFinal", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            yieldVal === 0
                              ? "secondary"
                              : yieldVal >= 0.9
                              ? "success"
                              : "warning"
                          }
                        >
                          {yieldVal === 0 ? "—" : formatPercent(yieldVal)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={row.saved ? "ghost" : "outline"}
                          size="sm"
                          onClick={() => saveRow(index)}
                          disabled={row.saving || (!row.dirty && !row.saved)}
                        >
                          {row.saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : row.saved ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résumé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Total produit</p>
                <p className="text-lg font-bold">{formatNumber(totals.qtyProduced)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total MP consommée</p>
                <p className="text-lg font-bold">{formatNumber(totals.qtyConsumedMP)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Coût total MP</p>
                <p className="text-lg font-bold">{formatCurrency(totals.totalCostMP)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Stock initial total</p>
                <p className="text-lg font-bold">{formatNumber(totals.stockInitial)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Stock final total</p>
                <p className="text-lg font-bold">{formatNumber(totals.stockFinal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
