"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { formatCurrency, formatNumber, cn, getPeriodLabel } from "@/lib/utils"
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
  Loader2,
  TrendingUp,
  Boxes,
  DollarSign,
  ChevronDown,
  ChevronRight,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"

// ---------- Types ----------

type CostDrillDown = {
  categoryType: string
  categoryName: string
  actualAmount: number
  refAmount: number
  variance: number
}

type ProductVariance = {
  productId: string
  productName: string
  family: string
  actualQty: number
  actualRevenue: number
  actualUnitPrice: number
  actualCost: number
  actualUnitCost: number
  actualMargin: number
  refQty: number
  refRevenue: number
  refUnitPrice: number
  refCost: number
  refUnitCost: number
  refMargin: number
  totalVariance: number
  volumeEffect: number
  priceEffect: number
  costEffect: number
  costDrillDown: CostDrillDown[]
}

type Summary = {
  actualRevenue: number
  actualCost: number
  actualMargin: number
  refRevenue: number
  refCost: number
  refMargin: number
  totalVariance: number
  volumeEffect: number
  priceEffect: number
  costEffect: number
}

type VarianceData = {
  period: string
  comparison: string
  view: string
  summary: Summary
  byProduct: ProductVariance[]
}

type ComparisonMode = "N1" | "STANDARD"
type ViewMode = "MTD" | "YTD"

// ---------- Helpers ----------

function varianceColor(value: number): string {
  if (value > 0) return "text-emerald-600"
  if (value < 0) return "text-red-600"
  return "text-slate-500"
}

function varianceBg(value: number): string {
  if (value > 0) return "bg-emerald-50 border-emerald-200"
  if (value < 0) return "bg-red-50 border-red-200"
  return "bg-slate-50 border-slate-200"
}

function pctOfTotal(value: number, total: number): string {
  if (total === 0) return "-"
  const pct = (value / Math.abs(total)) * 100
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
}

// ---------- Component ----------

export default function VarianceAnalysisPage() {
  const { selectedEntityId, selectedPeriod } = useAppStore()

  const [data, setData] = useState<VarianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [comparison, setComparison] = useState<ComparisonMode>("N1")
  const [view, setView] = useState<ViewMode>("MTD")
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!selectedEntityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        entityId: selectedEntityId,
        period: selectedPeriod,
        comparison,
        view,
      })
      const res = await fetch(`/api/variance-analysis?${params.toString()}`)
      if (!res.ok) throw new Error("Erreur chargement")
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedPeriod, comparison, view])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- Waterfall chart data ----------

  const waterfallData = data
    ? [
        {
          name: "Marge Ref.",
          value: data.summary.refMargin,
          fill: "#64748b",
          base: 0,
        },
        {
          name: "Effet Volume",
          value: data.summary.volumeEffect,
          fill: "#3b82f6",
          base: data.summary.refMargin,
        },
        {
          name: "Effet Prix",
          value: data.summary.priceEffect,
          fill: "#10b981",
          base: data.summary.refMargin + data.summary.volumeEffect,
        },
        {
          name: "Effet Cout",
          value: data.summary.costEffect,
          fill: "#f59e0b",
          base:
            data.summary.refMargin +
            data.summary.volumeEffect +
            data.summary.priceEffect,
        },
        {
          name: "Marge Reelle",
          value: data.summary.actualMargin,
          fill: "#64748b",
          base: 0,
        },
      ]
    : []

  // ---------- Render ----------

  if (!selectedEntityId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            Aucune entite selectionnee
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Selectionnez une entite dans le header pour voir les analyses.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Analyse des ecarts de marge
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {getPeriodLabel(selectedPeriod)} &mdash;{" "}
            {comparison === "N1" ? "vs N-1" : "vs Standard"} &mdash; {view}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <Button
              variant={view === "MTD" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("MTD")}
              className="text-xs"
            >
              MTD
            </Button>
            <Button
              variant={view === "YTD" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("YTD")}
              className="text-xs"
            >
              YTD
            </Button>
          </div>
          {/* Comparison toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <Button
              variant={comparison === "N1" ? "default" : "ghost"}
              size="sm"
              onClick={() => setComparison("N1")}
              className="text-xs"
            >
              vs N-1
            </Button>
            <Button
              variant={comparison === "STANDARD" ? "default" : "ghost"}
              size="sm"
              onClick={() => setComparison("STANDARD")}
              className="text-xs"
            >
              vs Standard
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : !data || data.byProduct.length === 0 ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">
              Aucune donnee disponible
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Aucune feuille de costing ou donnees de production trouvees pour
              cette periode.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Variance */}
            <Card
              className={cn(
                "border",
                varianceBg(data.summary.totalVariance),
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Ecart total de marge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {data.summary.totalVariance >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      varianceColor(data.summary.totalVariance),
                    )}
                  >
                    {formatCurrency(data.summary.totalVariance)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Ref: {formatCurrency(data.summary.refMargin)} &rarr; Reel:{" "}
                  {formatCurrency(data.summary.actualMargin)}
                </p>
              </CardContent>
            </Card>

            {/* Volume Effect */}
            <Card className="border border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Boxes className="h-4 w-4 text-blue-500" />
                  Effet Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    varianceColor(data.summary.volumeEffect),
                  )}
                >
                  {formatCurrency(data.summary.volumeEffect)}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {pctOfTotal(
                    data.summary.volumeEffect,
                    data.summary.totalVariance,
                  )}{" "}
                  de l&apos;ecart total
                </p>
              </CardContent>
            </Card>

            {/* Price Effect */}
            <Card className="border border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Effet Prix de vente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    varianceColor(data.summary.priceEffect),
                  )}
                >
                  {formatCurrency(data.summary.priceEffect)}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {pctOfTotal(
                    data.summary.priceEffect,
                    data.summary.totalVariance,
                  )}{" "}
                  de l&apos;ecart total
                </p>
              </CardContent>
            </Card>

            {/* Cost Effect */}
            <Card className="border border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  Effet Cout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    varianceColor(data.summary.costEffect),
                  )}
                >
                  {formatCurrency(data.summary.costEffect)}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {pctOfTotal(
                    data.summary.costEffect,
                    data.summary.totalVariance,
                  )}{" "}
                  de l&apos;ecart total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Waterfall Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Pont de marge &mdash; Reference vers Reel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={waterfallData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(v: number) =>
                        `${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        "Montant",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    {/* Invisible base bar */}
                    <Bar dataKey="base" stackId="waterfall" fill="transparent">
                      {waterfallData.map((entry, index) => (
                        <Cell
                          key={`base-${index}`}
                          fill="transparent"
                        />
                      ))}
                    </Bar>
                    {/* Visible value bar */}
                    <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`val-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Product Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Detail par produit
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Famille</TableHead>
                    <TableHead className="text-right">
                      Marge Reelle
                    </TableHead>
                    <TableHead className="text-right">Marge Ref.</TableHead>
                    <TableHead className="text-right">
                      Ecart Total
                    </TableHead>
                    <TableHead className="text-right">
                      Effet Volume
                    </TableHead>
                    <TableHead className="text-right">Effet Prix</TableHead>
                    <TableHead className="text-right">Effet Cout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProduct.map((p) => (
                    <ProductRow
                      key={p.productId}
                      product={p}
                      expanded={expandedProduct === p.productId}
                      onToggle={() =>
                        setExpandedProduct(
                          expandedProduct === p.productId
                            ? null
                            : p.productId,
                        )
                      }
                    />
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                    <TableCell></TableCell>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(data.summary.actualMargin)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(data.summary.refMargin)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        varianceColor(data.summary.totalVariance),
                      )}
                    >
                      {formatCurrency(data.summary.totalVariance)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        varianceColor(data.summary.volumeEffect),
                      )}
                    >
                      {formatCurrency(data.summary.volumeEffect)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        varianceColor(data.summary.priceEffect),
                      )}
                    >
                      {formatCurrency(data.summary.priceEffect)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        varianceColor(data.summary.costEffect),
                      )}
                    >
                      {formatCurrency(data.summary.costEffect)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ---------- Product Row with Drill-Down ----------

function ProductRow({
  product: p,
  expanded,
  onToggle,
}: {
  product: ProductVariance
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <TableCell className="w-8 px-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </TableCell>
        <TableCell className="font-medium">{p.productName}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {p.family}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(p.actualMargin)}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(p.refMargin)}
        </TableCell>
        <TableCell
          className={cn("text-right font-semibold", varianceColor(p.totalVariance))}
        >
          {formatCurrency(p.totalVariance)}
        </TableCell>
        <TableCell className={cn("text-right", varianceColor(p.volumeEffect))}>
          {formatCurrency(p.volumeEffect)}
        </TableCell>
        <TableCell className={cn("text-right", varianceColor(p.priceEffect))}>
          {formatCurrency(p.priceEffect)}
        </TableCell>
        <TableCell className={cn("text-right", varianceColor(p.costEffect))}>
          {formatCurrency(p.costEffect)}
        </TableCell>
      </TableRow>

      {/* Drill-down panel */}
      {expanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-slate-50 p-0">
            <DrillDownPanel product={p} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ---------- Drill-Down Panel ----------

function DrillDownPanel({ product: p }: { product: ProductVariance }) {
  const maxAmt = Math.max(
    ...p.costDrillDown.map((c) =>
      Math.max(Math.abs(c.actualAmount), Math.abs(c.refAmount)),
    ),
    1,
  )

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cost breakdown table */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">
            Decomposition des couts par categorie
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categorie</TableHead>
                <TableHead className="text-right">Reel</TableHead>
                <TableHead className="text-right">Reference</TableHead>
                <TableHead className="text-right">Ecart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.costDrillDown.map((c) => (
                <TableRow key={c.categoryType}>
                  <TableCell className="text-sm">{c.categoryName}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(c.actualAmount)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(c.refAmount)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium",
                      // For costs, a negative variance (lower cost) is favorable
                      c.variance <= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {formatCurrency(c.variance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mini horizontal bar chart */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">
            Comparaison Reel vs Reference
          </h4>
          <div className="space-y-3">
            {p.costDrillDown.map((c) => (
              <div key={c.categoryType}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>{c.categoryName}</span>
                  <span
                    className={cn(
                      "font-medium",
                      c.variance <= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {c.variance >= 0 ? "+" : ""}
                    {formatCurrency(c.variance)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-right text-[10px] text-slate-400">
                      Reel
                    </span>
                    <div className="h-3 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-slate-600"
                        style={{
                          width: `${Math.max((Math.abs(c.actualAmount) / maxAmt) * 100, 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-right text-[10px] text-slate-400">
                      Ref.
                    </span>
                    <div className="h-3 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-blue-400"
                        style={{
                          width: `${Math.max((Math.abs(c.refAmount) / maxAmt) * 100, 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulas */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Formules utilisees
        </h4>
        <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <div className="rounded bg-blue-50 px-2 py-1.5">
            <span className="font-medium text-blue-700">Effet volume</span> =
            (Vol. reel - Vol. ref.) x Marge unitaire ref.
          </div>
          <div className="rounded bg-emerald-50 px-2 py-1.5">
            <span className="font-medium text-emerald-700">Effet prix</span> =
            (Prix reel - Prix ref.) x Vol. reel
          </div>
          <div className="rounded bg-amber-50 px-2 py-1.5">
            <span className="font-medium text-amber-700">Effet cout</span> =
            -(Cout reel - Cout ref.) x Vol. reel
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Qtites: Reel {formatNumber(p.actualQty)} / Ref.{" "}
          {formatNumber(p.refQty)} | PU Reel{" "}
          {formatCurrency(p.actualUnitPrice)} / Ref.{" "}
          {formatCurrency(p.refUnitPrice)} | CU Reel{" "}
          {formatCurrency(p.actualUnitCost)} / Ref.{" "}
          {formatCurrency(p.refUnitCost)}
        </div>
      </div>
    </div>
  )
}
