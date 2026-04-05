"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { formatCurrency, formatNumber, getPeriodLabel } from "@/lib/utils"
import {
  Loader2,
  ArrowLeft,
  DollarSign,
  Users,
  Package,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type SalesData = {
  salesRep: {
    id: string
    code: string
    firstName: string
    lastName: string
    email: string | null
    region: string | null
  }
  totalRevenue: number
  totalQty: number
  clientCount: number
  articleCount: number
  salesByCustomer: {
    name: string
    code: string
    revenue: number
    qty: number
  }[]
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
}

export default function SalesRepDetailPage({
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
        const res = await fetch(`/api/sales-reps/${id}/sales`)
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
        <Button variant="ghost" onClick={() => router.push("/sales-reps")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux commerciaux
        </Button>
        <div className="flex h-[300px] flex-col items-center justify-center text-slate-500">
          <p>Commercial introuvable</p>
        </div>
      </div>
    )
  }

  const { salesRep } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/sales-reps")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {salesRep.firstName} {salesRep.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {salesRep.code}
            {salesRep.region ? ` - ${salesRep.region}` : ""}
            {salesRep.email ? ` - ${salesRep.email}` : ""}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
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
              <Users className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Clients</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{data.clientCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Articles</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{data.articleCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Ventes par client</TabsTrigger>
          <TabsTrigger value="articles">Ventes par article</TabsTrigger>
          <TabsTrigger value="monthly">Evolution mensuelle</TabsTrigger>
        </TabsList>

        {/* Tab 1: Sales by Customer */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventes par client</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.salesByCustomer.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
                  Aucune vente enregistree
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Quantite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesByCustomer.map((cust, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">
                          {cust.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {cust.name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cust.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(cust.qty, 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Sales by Article */}
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

        {/* Tab 3: Monthly Evolution */}
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
                    <Bar
                      dataKey="revenue"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
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
