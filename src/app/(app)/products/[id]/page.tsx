"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatNumber, formatPercent, formatCurrency } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Package,
  Tag,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from "recharts"

type Product = {
  id: string
  code: string
  name: string
  category?: { id: string; name: string } | null
  family: string
  formulation?: string
  origin?: string
  unit: string
  active: boolean
  entity?: { id: string; code: string; name: string; currency: string } | null
}

type BomItem = {
  id: string
  componentId: string
  component: Product
  quantity: number
  unit: string
  yieldRate: number
}

type BomFormData = {
  componentId: string
  quantity: string
  unit: string
  yieldRate: string
}

type ArticleItem = {
  id: string
  code: string
  name: string
  photoUrl: string | null
  contentQty: number
  contentUnit: string
  catalogPrice: number
  standardCost: number
  product: { id: string; name: string; family: string }
}

type ArticleFormData = {
  code: string
  name: string
  contentQty: string
  contentUnit: string
  catalogPrice: string
  standardCost: string
}

type MonthlyPerformance = {
  month: string
  total: number
  [articleKey: string]: number | string
}

type CustomerRow = {
  id: string
  name: string
  type: string
  revenue: number
  margin: number
  quantity: number
}

const FAMILY_LABELS: Record<string, string> = {
  engrais_poudre: "Engrais poudre",
  engrais_liquide: "Engrais liquide",
  engrais_granule: "Engrais granule",
  amendement: "Amendement",
  semence: "Semence",
  phyto: "Phytosanitaire",
  matiere_premiere: "Matiere premiere",
  produit_semi_fini: "Produit semi-fini",
  produit_fini: "Produit fini",
  emballage: "Emballage",
  autre: "Autre",
}

const ARTICLE_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#84cc16",
  "#f59e0b",
  "#ef4444",
  "#64748b",
]

const emptyBomForm: BomFormData = {
  componentId: "",
  quantity: "",
  unit: "KG",
  yieldRate: "100",
}

const emptyArticleForm: ArticleFormData = {
  code: "",
  name: "",
  contentQty: "",
  contentUnit: "KG",
  catalogPrice: "",
  standardCost: "",
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const { displayCurrency } = useAppStore()

  const [product, setProduct] = useState<Product | null>(null)

  // Resolve currency: displayCurrency from store, or product entity currency, or EUR
  const getCurrency = useCallback(() => {
    if (displayCurrency) return displayCurrency
    return product?.entity?.currency || 'EUR'
  }, [displayCurrency, product])

  const fmtCurrency = useCallback((amount: number) => {
    return formatCurrency(amount, getCurrency())
  }, [getCurrency])
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [availableComponents, setAvailableComponents] = useState<Product[]>([])
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [articlesLoading, setArticlesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [bomDialogOpen, setBomDialogOpen] = useState(false)
  const [articleDialogOpen, setArticleDialogOpen] = useState(false)
  const [bomForm, setBomForm] = useState<BomFormData>(emptyBomForm)
  const [articleForm, setArticleForm] = useState<ArticleFormData>(emptyArticleForm)
  const [saving, setSaving] = useState(false)

  // Performance data
  const [performance, setPerformance] = useState<MonthlyPerformance[]>([])
  const [performanceLoading, setPerformanceLoading] = useState(false)

  // Customer data
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)

  // Summary stats
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalMargin, setTotalMargin] = useState(0)

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (res.ok) {
        const json = await res.json()
        setProduct(json.product || json)
        setBomItems(json.bom || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [productId])

  const fetchArticles = useCallback(async () => {
    setArticlesLoading(true)
    try {
      const res = await fetch(`/api/articles?productId=${productId}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently handle
    } finally {
      setArticlesLoading(false)
    }
  }, [productId])

  const fetchComponents = useCallback(async () => {
    try {
      const res = await fetch(`/api/products?entityId=all&type=component`)
      if (res.ok) {
        const json = await res.json()
        setAvailableComponents(json)
      }
    } catch {
      // silently handle
    }
  }, [])

  const fetchPerformance = useCallback(async () => {
    setPerformanceLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}/performance`)
      if (res.ok) {
        const data = await res.json()
        setPerformance(data.monthly || [])
        setTotalRevenue(data.totalRevenue || 0)
        setTotalMargin(data.totalMargin || 0)
      }
    } catch {
      // silently handle
    } finally {
      setPerformanceLoading(false)
    }
  }, [productId])

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}/customers`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(Array.isArray(data) ? data : data.customers || [])
      }
    } catch {
      // silently handle
    } finally {
      setCustomersLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchProduct()
    fetchComponents()
    fetchArticles()
    fetchPerformance()
    fetchCustomers()
  }, [fetchProduct, fetchComponents, fetchArticles, fetchPerformance, fetchCustomers])

  // Computed summary values
  const avgStandardCost =
    articles.length > 0
      ? articles.reduce((s, a) => s + a.standardCost, 0) / articles.length
      : 0
  const marginPct = totalRevenue > 0 ? ((totalRevenue - (totalRevenue - totalMargin)) / totalRevenue) * 100 : 0

  const handleAddBom = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${productId}/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: bomForm.componentId,
          quantity: parseFloat(bomForm.quantity),
          unit: bomForm.unit,
          yieldRate: parseFloat(bomForm.yieldRate) / 100,
        }),
      })
      if (res.ok) {
        setBomDialogOpen(false)
        setBomForm(emptyBomForm)
        fetchProduct()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBom = async (bomId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/bom/${bomId}`, {
        method: "DELETE",
      })
      if (res.ok) fetchProduct()
    } catch {
      // silently handle
    }
  }

  const handleAddArticle = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          code: articleForm.code,
          name: articleForm.name,
          contentQty: parseFloat(articleForm.contentQty),
          contentUnit: articleForm.contentUnit,
          catalogPrice: parseFloat(articleForm.catalogPrice),
          standardCost: parseFloat(articleForm.standardCost),
        }),
      })
      if (res.ok) {
        setArticleDialogOpen(false)
        setArticleForm(emptyArticleForm)
        fetchArticles()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-500">
        <Package className="mb-2 h-10 w-10" />
        <p>Produit introuvable</p>
        <Link
          href="/products"
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Retour aux produits
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono text-xs">
              {product.code}
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900">
              {product.name}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {FAMILY_LABELS[product.family] || product.family}
            </Badge>
            {product.formulation && (
              <Badge className="bg-indigo-100 text-indigo-800">
                {product.formulation}
              </Badge>
            )}
            {product.origin && (
              <Badge className="bg-teal-100 text-teal-800">
                {product.origin}
              </Badge>
            )}
            {product.category && (
              <Badge className="bg-slate-100 text-slate-700">
                {product.category.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">CA Global</p>
              <p className="text-xl font-bold text-slate-900">
                {fmtCurrency(totalRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-100 p-2">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cout standard moyen</p>
              <p className="text-xl font-bold text-slate-900">
                {fmtCurrency(avgStandardCost)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Marge globale</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-slate-900">
                  {fmtCurrency(totalMargin)}
                </p>
                <Badge
                  className={cn(
                    "text-xs",
                    marginPct >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  )}
                >
                  {marginPct >= 0 ? "+" : ""}
                  {marginPct.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-purple-100 p-2">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Articles</p>
              <p className="text-xl font-bold text-slate-900">
                {articles.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="bom">Nomenclature (BOM)</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Articles ({articles.length})
                  </CardTitle>
                  <CardDescription>
                    Conditionnements commerciaux de ce produit
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setArticleForm(emptyArticleForm)
                    setArticleDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un article
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <div className="flex h-[120px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Tag className="mb-2 h-8 w-8" />
                  <p className="text-sm">Aucun article pour ce produit</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.map((article) => {
                    const margin = article.catalogPrice
                      ? ((article.catalogPrice - article.standardCost) /
                          article.catalogPrice) *
                        100
                      : null
                    return (
                      <div
                        key={article.id}
                        className="cursor-pointer rounded-lg border border-slate-200 p-3 transition-shadow hover:shadow-md"
                        onClick={() => router.push(`/articles/${article.id}`)}
                      >
                        <div className="mb-2 flex h-24 items-center justify-center rounded-md bg-slate-50">
                          {article.photoUrl ? (
                            <img
                              src={article.photoUrl}
                              alt={article.name}
                              className="h-full w-full rounded-md object-cover"
                            />
                          ) : (
                            <Package className="h-10 w-10 text-slate-200" />
                          )}
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900">
                          {article.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {article.code}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {article.contentQty} {article.contentUnit}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {fmtCurrency(article.catalogPrice)}
                            </p>
                            <p className="text-xs text-slate-400">
                              Cout: {fmtCurrency(article.standardCost)}
                            </p>
                          </div>
                          {margin !== null && (
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                margin >= 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              )}
                            >
                              {margin >= 0 ? "+" : ""}
                              {margin.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Nomenclature (BOM)
                  </CardTitle>
                  <CardDescription>
                    Composants necessaires a la fabrication de ce produit
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setBomForm(emptyBomForm)
                    setBomDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un composant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bomItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Package className="mb-2 h-10 w-10" />
                  <p className="text-sm">
                    Aucun composant dans la nomenclature
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Composant</TableHead>
                      <TableHead className="text-right">Quantite</TableHead>
                      <TableHead>Unite</TableHead>
                      <TableHead className="text-right">
                        Taux de rendement
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{item.component.name}</p>
                            <p className="font-mono text-xs text-slate-500">
                              {item.component.code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.quantity)}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              item.yieldRate >= 0.95 ? "success" : "warning"
                            }
                          >
                            {formatPercent(item.yieldRate)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBom(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Performance mensuelle
              </CardTitle>
              <CardDescription>
                CA mensuel par article avec total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : performance.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center text-slate-500">
                  <BarChart3 className="mb-2 h-10 w-10" />
                  <p className="text-sm">
                    Aucune donnee de performance disponible
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={performance}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => fmtCurrency(v)}
                    />
                    <Tooltip
                      formatter={(v) => fmtCurrency(Number(v))}
                    />
                    <Legend />
                    {articles.map((article, i) => (
                      <Bar
                        key={article.id}
                        dataKey={article.code}
                        name={article.name}
                        stackId="articles"
                        fill={ARTICLE_COLORS[i % ARTICLE_COLORS.length]}
                      />
                    ))}
                    <Line
                      dataKey="total"
                      name="Total"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top clients pour ce produit
              </CardTitle>
              <CardDescription>
                Clients classes par chiffre d&apos;affaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="flex h-[200px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : customers.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center text-slate-500">
                  <Users className="mb-2 h-10 w-10" />
                  <p className="text-sm">Aucun client pour ce produit</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                      <TableHead className="text-right">Quantite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((cust) => (
                      <TableRow key={cust.id}>
                        <TableCell className="font-medium">
                          {cust.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {cust.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {fmtCurrency(cust.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-medium",
                              cust.margin >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            )}
                          >
                            {fmtCurrency(cust.margin)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(cust.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add BOM Dialog */}
      <Dialog open={bomDialogOpen} onOpenChange={setBomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un composant</DialogTitle>
            <DialogDescription>
              Selectionnez un composant et definissez les quantites necessaires.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Composant</Label>
              <Select
                value={bomForm.componentId}
                onValueChange={(v) =>
                  setBomForm({ ...bomForm, componentId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un composant" />
                </SelectTrigger>
                <SelectContent>
                  {availableComponents
                    .filter((c) => c.id !== productId)
                    .map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.code} - {comp.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bom-quantity">Quantite</Label>
                <Input
                  id="bom-quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bomForm.quantity}
                  onChange={(e) =>
                    setBomForm({ ...bomForm, quantity: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Unite</Label>
                <Select
                  value={bomForm.unit}
                  onValueChange={(v) => setBomForm({ ...bomForm, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="UNIT">UNIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bom-yieldRate">Taux de rendement (%)</Label>
              <Input
                id="bom-yieldRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={bomForm.yieldRate}
                onChange={(e) =>
                  setBomForm({ ...bomForm, yieldRate: e.target.value })
                }
                placeholder="100"
              />
              <p className="text-xs text-slate-500">
                Pourcentage de matiere effectivement utilisee (ex: 95% = 5% de
                perte)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBomDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddBom}
              disabled={saving || !bomForm.componentId || !bomForm.quantity}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Article Dialog */}
      <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un article</DialogTitle>
            <DialogDescription>
              Definissez un nouveau conditionnement commercial pour ce produit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="article-code">Code</Label>
                <Input
                  id="article-code"
                  value={articleForm.code}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, code: e.target.value })
                  }
                  placeholder="ART-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="article-name">Nom</Label>
                <Input
                  id="article-name"
                  value={articleForm.name}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, name: e.target.value })
                  }
                  placeholder="Nom de l'article"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="article-contentQty">Contenance</Label>
                <Input
                  id="article-contentQty"
                  type="number"
                  step="0.01"
                  min="0"
                  value={articleForm.contentQty}
                  onChange={(e) =>
                    setArticleForm({
                      ...articleForm,
                      contentQty: e.target.value,
                    })
                  }
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label>Unite contenance</Label>
                <Select
                  value={articleForm.contentUnit}
                  onValueChange={(v) =>
                    setArticleForm({ ...articleForm, contentUnit: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="UNIT">UNIT</SelectItem>
                    <SelectItem value="T">T</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="article-catalogPrice">Prix catalogue</Label>
                <Input
                  id="article-catalogPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={articleForm.catalogPrice}
                  onChange={(e) =>
                    setArticleForm({
                      ...articleForm,
                      catalogPrice: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="article-standardCost">Cout standard</Label>
                <Input
                  id="article-standardCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={articleForm.standardCost}
                  onChange={(e) =>
                    setArticleForm({
                      ...articleForm,
                      standardCost: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArticleDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddArticle}
              disabled={
                saving || !articleForm.code || !articleForm.name
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
