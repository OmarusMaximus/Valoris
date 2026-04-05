"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import { Loader2, Trophy, ChevronDown, ChevronRight } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

type RepRow = {
  id: string
  rank: number
  name: string
  region: string
  revenue: number
  margin: number
  marginPct: number
  clientCount: number
  articleCount: number
  topClients?: { name: string; revenue: number }[]
  topArticles?: { name: string; revenue: number }[]
}

type ClientRow = {
  id: string
  rank: number
  name: string
  type: string
  revenue: number
  margin: number
  articleCount: number
  topArticles?: { name: string; revenue: number }[]
  salesReps?: string[]
}

type ArticleRow = {
  id: string
  rank: number
  articleName: string
  productName: string
  revenue: number
  quantity: number
  avgPrice: number
  margin: number
  topClients?: { name: string; revenue: number }[]
  topReps?: { name: string; revenue: number }[]
}

const MEDAL_COLORS: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800 border-yellow-300",
  2: "bg-slate-100 text-slate-700 border-slate-300",
  3: "bg-orange-100 text-orange-800 border-orange-300",
}

const TOP10_COLORS = [
  "#f59e0b",
  "#94a3b8",
  "#f97316",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#64748b",
]

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <Badge
        className={cn(
          "min-w-[32px] justify-center border text-xs font-bold",
          MEDAL_COLORS[rank]
        )}
      >
        {rank}
      </Badge>
    )
  }
  return (
    <span className="inline-flex min-w-[32px] justify-center text-sm text-slate-500">
      {rank}
    </span>
  )
}

export default function LeagueTablesPage() {
  const { selectedEntityId, selectedPeriod } = useAppStore()
  const [activeTab, setActiveTab] = useState("reps")
  const [repsData, setRepsData] = useState<RepRow[]>([])
  const [clientsData, setClientsData] = useState<ClientRow[]>([])
  const [articlesData, setArticlesData] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchData = useCallback(
    async (view: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ view })
        if (selectedEntityId) params.set("entityId", selectedEntityId)
        if (selectedPeriod) params.set("period", selectedPeriod)
        const res = await fetch(`/api/league-tables?${params}`)
        if (res.ok) {
          const data = await res.json()
          if (view === "reps") setRepsData(Array.isArray(data) ? data : data.rows || [])
          else if (view === "clients") setClientsData(Array.isArray(data) ? data : data.rows || [])
          else if (view === "articles") setArticlesData(Array.isArray(data) ? data : data.rows || [])
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    },
    [selectedEntityId, selectedPeriod]
  )

  useEffect(() => {
    fetchData(activeTab)
    setExpandedId(null)
  }, [activeTab, fetchData])

  const handleExpandRep = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/league-tables/reps/${id}`)
      if (res.ok) {
        const detail = await res.json()
        setRepsData((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, topClients: detail.topClients || [], topArticles: detail.topArticles || [] } : r
          )
        )
      }
    } catch { /* silently handle */ } finally { setDetailLoading(false) }
  }

  const handleExpandClient = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/league-tables/clients/${id}`)
      if (res.ok) {
        const detail = await res.json()
        setClientsData((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, topArticles: detail.topArticles || [], salesReps: detail.salesReps || [] } : c
          )
        )
      }
    } catch { /* silently handle */ } finally { setDetailLoading(false) }
  }

  const handleExpandArticle = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/league-tables/articles/${id}`)
      if (res.ok) {
        const detail = await res.json()
        setArticlesData((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, topClients: detail.topClients || [], topReps: detail.topReps || [] } : a
          )
        )
      }
    } catch { /* silently handle */ } finally { setDetailLoading(false) }
  }

  // Totals computation
  const repsTotals = {
    revenue: repsData.reduce((s, r) => s + r.revenue, 0),
    margin: repsData.reduce((s, r) => s + r.margin, 0),
    clients: repsData.reduce((s, r) => s + r.clientCount, 0),
    articles: repsData.reduce((s, r) => s + r.articleCount, 0),
  }
  const clientsTotals = {
    revenue: clientsData.reduce((s, c) => s + c.revenue, 0),
    margin: clientsData.reduce((s, c) => s + c.margin, 0),
    articles: clientsData.reduce((s, c) => s + c.articleCount, 0),
  }
  const articlesTotals = {
    revenue: articlesData.reduce((s, a) => s + a.revenue, 0),
    quantity: articlesData.reduce((s, a) => s + a.quantity, 0),
    margin: articlesData.reduce((s, a) => s + a.margin, 0),
  }

  function DrillDown({ items, label }: { items?: { name: string; revenue: number }[]; label: string }) {
    if (!items || items.length === 0) return <p className="text-sm text-slate-400">Aucune donnee</p>
    return (
      <div>
        <h5 className="mb-1 text-xs font-semibold text-slate-500 uppercase">{label}</h5>
        <div className="space-y-1">
          {items.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1.5 text-sm">
              <span>{item.name}</span>
              <span className="font-medium">{formatCurrency(item.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderChart = (data: { name: string; value: number }[]) => {
    const top10 = data.slice(0, 10)
    if (top10.length === 0) return null
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {top10.map((_, i) => (
                  <Cell key={i} fill={TOP10_COLORS[i % TOP10_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">League Tables</h1>
          <p className="text-sm text-slate-500">
            Classements commerciaux, clients et articles
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setExpandedId(null) }}>
        <TabsList>
          <TabsTrigger value="reps">Commerciaux</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
        </TabsList>

        {/* --- Commerciaux Tab --- */}
        <TabsContent value="reps" className="space-y-4">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : repsData.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center text-slate-500">
              <Trophy className="mb-2 h-10 w-10" />
              <p className="text-sm">Aucune donnee pour cette periode</p>
            </div>
          ) : (
            <>
              {renderChart(repsData.slice(0, 10).map((r) => ({ name: r.name, value: r.revenue })))}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead className="w-14">Rang</TableHead>
                        <TableHead>Commercial</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">Marge %</TableHead>
                        <TableHead className="text-right">Clients</TableHead>
                        <TableHead className="text-right">Articles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repsData.map((rep) => (
                        <>
                          <TableRow key={rep.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleExpandRep(rep.id)}>
                            <TableCell>
                              {expandedId === rep.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </TableCell>
                            <TableCell><RankBadge rank={rep.rank} /></TableCell>
                            <TableCell className="font-medium">{rep.name}</TableCell>
                            <TableCell>{rep.region}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(rep.revenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(rep.margin)}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn(rep.marginPct >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {formatPercent(rep.marginPct / 100)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{rep.clientCount}</TableCell>
                            <TableCell className="text-right">{rep.articleCount}</TableCell>
                          </TableRow>
                          {expandedId === rep.id && (
                            <TableRow key={`${rep.id}-detail`}>
                              <TableCell colSpan={9} className="bg-slate-50 p-4">
                                {detailLoading ? (
                                  <div className="flex h-[80px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                                ) : (
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <DrillDown items={rep.topClients} label="Top 5 clients" />
                                    <DrillDown items={rep.topArticles} label="Top 5 articles" />
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                      {/* Totals */}
                      <TableRow className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                        <TableCell />
                        <TableCell />
                        <TableCell>Total</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{formatCurrency(repsTotals.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(repsTotals.margin)}</TableCell>
                        <TableCell className="text-right">
                          {repsTotals.revenue > 0 ? formatPercent(repsTotals.margin / repsTotals.revenue) : "—"}
                        </TableCell>
                        <TableCell className="text-right">{repsTotals.clients}</TableCell>
                        <TableCell className="text-right">{repsTotals.articles}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* --- Clients Tab --- */}
        <TabsContent value="clients" className="space-y-4">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : clientsData.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center text-slate-500">
              <Trophy className="mb-2 h-10 w-10" />
              <p className="text-sm">Aucune donnee pour cette periode</p>
            </div>
          ) : (
            <>
              {renderChart(clientsData.slice(0, 10).map((c) => ({ name: c.name, value: c.revenue })))}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead className="w-14">Rang</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">Articles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientsData.map((client) => (
                        <>
                          <TableRow key={client.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleExpandClient(client.id)}>
                            <TableCell>
                              {expandedId === client.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </TableCell>
                            <TableCell><RankBadge rank={client.rank} /></TableCell>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{client.type}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(client.revenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(client.margin)}</TableCell>
                            <TableCell className="text-right">{client.articleCount}</TableCell>
                          </TableRow>
                          {expandedId === client.id && (
                            <TableRow key={`${client.id}-detail`}>
                              <TableCell colSpan={7} className="bg-slate-50 p-4">
                                {detailLoading ? (
                                  <div className="flex h-[80px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                                ) : (
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <DrillDown items={client.topArticles} label="Top articles" />
                                    <div>
                                      <h5 className="mb-1 text-xs font-semibold text-slate-500 uppercase">Commerciaux</h5>
                                      {client.salesReps && client.salesReps.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {client.salesReps.map((name, i) => (
                                            <Badge key={i} variant="secondary">{name}</Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-slate-400">Aucune donnee</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                      {/* Totals */}
                      <TableRow className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                        <TableCell />
                        <TableCell />
                        <TableCell>Total</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{formatCurrency(clientsTotals.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(clientsTotals.margin)}</TableCell>
                        <TableCell className="text-right">{clientsTotals.articles}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* --- Articles Tab --- */}
        <TabsContent value="articles" className="space-y-4">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : articlesData.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center text-slate-500">
              <Trophy className="mb-2 h-10 w-10" />
              <p className="text-sm">Aucune donnee pour cette periode</p>
            </div>
          ) : (
            <>
              {renderChart(articlesData.slice(0, 10).map((a) => ({ name: a.articleName, value: a.revenue })))}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead className="w-14">Rang</TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">Qte</TableHead>
                        <TableHead className="text-right">Prix moyen</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articlesData.map((article) => (
                        <>
                          <TableRow key={article.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleExpandArticle(article.id)}>
                            <TableCell>
                              {expandedId === article.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </TableCell>
                            <TableCell><RankBadge rank={article.rank} /></TableCell>
                            <TableCell className="font-medium">{article.articleName}</TableCell>
                            <TableCell className="text-sm text-slate-500">{article.productName}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(article.revenue)}</TableCell>
                            <TableCell className="text-right">{formatNumber(article.quantity)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(article.avgPrice)}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn(article.margin >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {formatCurrency(article.margin)}
                              </span>
                            </TableCell>
                          </TableRow>
                          {expandedId === article.id && (
                            <TableRow key={`${article.id}-detail`}>
                              <TableCell colSpan={8} className="bg-slate-50 p-4">
                                {detailLoading ? (
                                  <div className="flex h-[80px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                                ) : (
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <DrillDown items={article.topClients} label="Top clients" />
                                    <DrillDown items={article.topReps} label="Commerciaux" />
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                      {/* Totals */}
                      <TableRow className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                        <TableCell />
                        <TableCell />
                        <TableCell>Total</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{formatCurrency(articlesTotals.revenue)}</TableCell>
                        <TableCell className="text-right">{formatNumber(articlesTotals.quantity)}</TableCell>
                        <TableCell className="text-right">
                          {articlesTotals.quantity > 0 ? formatCurrency(articlesTotals.revenue / articlesTotals.quantity) : "—"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(articlesTotals.margin)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
