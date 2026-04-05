"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatCurrency, formatNumber, getPeriodLabel } from "@/lib/utils"
import {
  Loader2,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Package,
  UserCheck,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

const TYPE_COLORS: Record<string, string> = {
  COOPERATIVE: "bg-blue-100 text-blue-800",
  DISTRIBUTEUR: "bg-amber-100 text-amber-800",
  DIRECT: "bg-green-100 text-green-800",
  EXPORT: "bg-purple-100 text-purple-800",
}

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#ddd6fe",
  "#ede9fe",
  "#4f46e5",
  "#4338ca",
  "#3730a3",
  "#312e81",
]

type SalesData = {
  customer: {
    id: string
    code: string
    name: string
    type: string | null
    region: string | null
    country: string | null
  }
  totalRevenue: number
  totalQty: number
  totalMargin: number
  articleCount: number
  repCount: number
  salesByArticle: {
    name: string
    code: string
    revenue: number
    qty: number
    avgPrice: number
  }[]
  salesByPeriod: {
    period: string
    month: string
    revenue: number
    qty: number
  }[]
  topArticles: {
    name: string
    code: string
    revenue: number
    qty: number
    avgPrice: number
  }[]
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/customers/${id}/sales`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux clients
        </Button>
        <div className="flex h-[300px] flex-col items-center justify-center text-slate-500">
          <p>Client introuvable</p>
        </div>
      </div>
    )
  }

  const { customer } = data
  const marginPercent =
    data.totalRevenue > 0 ? (data.totalMargin / data.totalRevenue) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/customers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {customer.name}
            </h1>
            {customer.type && (
              <Badge
                className={cn(
                  "text-xs",
                  TYPE_COLORS[customer.type] || "bg-slate-100 text-slate-800"
                )}
              >
                {customer.type}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {customer.code}
            {customer.region ? ` - ${customer.region}` : ""}
            {customer.country ? ` (${customer.country})` : ""}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">CA Total</p>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(data.totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Marge estimee</p>
            </div>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                data.totalMargin >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              {formatCurrency(data.totalMargin)}
            </p>
            <p className="text-xs text-slate-400">
              {formatNumber(marginPercent, 1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Articles vendus</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{data.articleCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Commerciaux</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{data.repCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="articles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="articles">Ventes par article</TabsTrigger>
          <TabsTrigger value="monthly">Evolution mensuelle</TabsTrigger>
          <TabsTrigger value="top">Top articles</TabsTrigger>
        </TabsList>

        {/* Tab 1: Sales by Article */}
        <TabsContent value="articles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventes par article</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.salesByArticle.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
                  Aucune vente enregistree
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Quantite</TableHead>
                      <TableHead className="text-right">Prix moyen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesByArticle.map((article, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">
                          {article.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {article.name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(article.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(article.qty, 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(article.avgPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Monthly Evolution */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Evolution mensuelle du CA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.salesByPeriod.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
                  Aucune donnee mensuelle
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.salesByPeriod}>
                    <XAxis
                      dataKey="period"
                      tickFormatter={(v) => {
                        const parts = v.split("-")
                        return parts.length === 2
                          ? `${parts[1]}/${parts[0].slice(2)}`
                          : v
                      }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      labelFormatter={(label) => getPeriodLabel(String(label))}
                    />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Top Articles */}
        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top articles par CA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topArticles.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
                  Aucune donnee
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, data.topArticles.length * 40)}>
                  <BarChart
                    data={data.topArticles}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={110}
                    />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {data.topArticles.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
