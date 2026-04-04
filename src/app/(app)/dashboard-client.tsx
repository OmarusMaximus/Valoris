"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { formatCurrency, formatPercent, getPeriodLabel } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type DashboardData = {
  totalRevenue: number
  totalCosts: number
  grossMargin: number
  grossMarginPercent: number
  contributionMargin: number
  contributionMarginPercent: number
  marginByProduct: Array<{
    name: string
    grossMargin: number
    contributionMargin: number
  }>
  monthlyEvolution: Array<{
    period: string
    label: string
    grossMargin: number
    contributionMargin: number
  }>
  costBreakdown: Array<{
    name: string
    type: string
    value: number
  }>
}

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
]

export function DashboardClient() {
  const { selectedEntityId, selectedPeriod } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!selectedEntityId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("entityId", selectedEntityId)
      params.set("period", selectedPeriod)

      const res = await fetch(`/api/dashboard?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Erreur lors du chargement du tableau de bord")
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      )
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedPeriod])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!selectedEntityId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <Package className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">
          Veuillez selectionner une entite pour afficher le tableau de bord
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-500">
        <p className="text-lg font-medium">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 text-sm underline hover:no-underline"
        >
          Reessayer
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <BarChart3 className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">
          Aucune donnee disponible pour la periode {getPeriodLabel(selectedPeriod)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500">{getPeriodLabel(selectedPeriod)}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Chiffre d&apos;affaires
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Couts totaux
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalCosts)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Marge brute
            </CardTitle>
            {data.grossMarginPercent >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  data.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(data.grossMargin)}
              </span>
              <Badge
                variant={
                  data.grossMarginPercent >= 0 ? "success" : "destructive"
                }
              >
                {formatPercent(data.grossMarginPercent)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Marge de contribution
            </CardTitle>
            {data.contributionMarginPercent >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  data.contributionMargin >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(data.contributionMargin)}
              </span>
              <Badge
                variant={
                  data.contributionMarginPercent >= 0
                    ? "success"
                    : "destructive"
                }
              >
                {formatPercent(data.contributionMarginPercent)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Margin by Product */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marge par produit</CardTitle>
          </CardHeader>
          <CardContent>
            {data.marginByProduct.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Aucune donnee produit
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.marginByProduct}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar
                    dataKey="grossMargin"
                    name="Marge brute"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="contributionMargin"
                    name="Marge contribution"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyEvolution.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Aucune donnee historique
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="grossMargin"
                    name="Marge brute"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="contributionMargin"
                    name="Marge contribution"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Repartition des couts par categorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.costBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Aucune donnee de couts
            </p>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.costBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(1)}%)`
                    }
                    labelLine
                  >
                    {data.costBreakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
