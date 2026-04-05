"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { cn, formatCurrency, formatNumber, getPeriodLabel } from "@/lib/utils"
import {
  ArrowLeft,
  Package,
  Loader2,
  Camera,
  ExternalLink,
  Pencil,
  Check,
  X,
  Plus,
  ChevronUp,
  Building2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts"

type Article = {
  id: string
  code: string
  name: string
  photoUrl: string | null
  stockUnit: string
  salesUnit: string
  contentQty: number
  contentUnit: string
  catalogPrice: number
  standardCost: number
  entityId: string | null
  entity: { id: string; code: string; name: string; currency: string } | null
  product: {
    id: string
    name: string
    code: string
    family: string | null
    formulation?: string
    origin?: string
    entity?: { id: string; currency: string }
  }
}

type EntityOption = {
  id: string
  code: string
  name: string
  currency: string
}

type ProductOption = {
  id: string
  name: string
  code: string
}

type CategoryOption = {
  id: string
  name: string
}

type SalesHistoryEntry = {
  period: string
  qtySold: number
  revenue: number
  avgPrice: number
  variableCost: number
}

const FORMULATION_LABELS: Record<string, string> = {
  engrais_poudre: "Poudre",
  engrais_liquide: "Liquide",
  engrais_granule: "Granule",
  amendement: "Amendement",
  semence: "Semence",
  phyto: "Phytosanitaire",
  matiere_premiere: "MP",
  produit_semi_fini: "PSF",
  produit_fini: "PF",
  emballage: "Emballage",
  autre: "Autre",
}

const ORIGIN_LABELS: Record<string, string> = {
  local: "Production locale",
  import: "Import",
  negoce: "Negoce",
}

export default function ArticleDetailPage() {
  const params = useParams()
  const articleId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [article, setArticle] = useState<Article | null>(null)
  const [salesHistory, setSalesHistory] = useState<SalesHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    categoryId: "",
    family: "",
    formulation: "",
    origin: "",
  })
  const [editForm, setEditForm] = useState({
    stockUnit: "",
    salesUnit: "",
    contentQty: "",
    contentUnit: "",
    catalogPrice: "",
    standardCost: "",
    productId: "",
    entityId: "",
  })

  const fetchArticle = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${articleId}`)
      if (res.ok) {
        const data = await res.json()
        setArticle(data)
      }
    } catch {
      // silently handle
    }
  }, [articleId])

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch("/api/entities")
      if (res.ok) {
        const data = await res.json()
        setEntities(Array.isArray(data) ? data : data.entities || [])
      }
    } catch {
      // silently handle
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products")
      if (res.ok) {
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : data.products || [])
      }
    } catch {
      // silently handle
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/products/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(Array.isArray(data) ? data : data.categories || [])
      }
    } catch {
      // silently handle
    }
  }, [])

  const fetchSalesHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${articleId}/sales-history`)
      if (res.ok) {
        const data = await res.json()
        setSalesHistory(data)
      }
    } catch {
      // silently handle
    }
  }, [articleId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchArticle(), fetchSalesHistory()])
      setLoading(false)
    }
    loadData()
  }, [fetchArticle, fetchSalesHistory])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("photo", file)
      const res = await fetch(`/api/articles/${articleId}/photo`, {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        await fetchArticle()
      }
    } catch {
      // silently handle
    } finally {
      setUploading(false)
    }
  }

  const startEditing = () => {
    if (!article) return
    setEditForm({
      stockUnit: article.stockUnit,
      salesUnit: article.salesUnit,
      contentQty: String(article.contentQty),
      contentUnit: article.contentUnit,
      catalogPrice: String(article.catalogPrice),
      standardCost: String(article.standardCost),
      productId: article.product.id,
      entityId: article.entityId || "",
    })
    setShowNewProduct(false)
    setNewProductForm({ name: "", categoryId: "", family: "", formulation: "", origin: "" })
    fetchEntities()
    fetchProducts()
    fetchCategories()
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockUnit: editForm.stockUnit,
          salesUnit: editForm.salesUnit,
          contentQty: parseFloat(editForm.contentQty) || 0,
          contentUnit: editForm.contentUnit,
          catalogPrice: parseFloat(editForm.catalogPrice) || 0,
          standardCost: parseFloat(editForm.standardCost) || 0,
          productId: editForm.productId || undefined,
          entityId: editForm.entityId || null,
        }),
      })
      if (res.ok) {
        setEditing(false)
        await fetchArticle()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const handleCreateProduct = async () => {
    if (!newProductForm.name.trim()) return
    setCreatingProduct(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProductForm.name,
          categoryId: newProductForm.categoryId || undefined,
          family: newProductForm.family || undefined,
          formulation: newProductForm.formulation || undefined,
          origin: newProductForm.origin || undefined,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        await fetchProducts()
        setEditForm((prev) => ({ ...prev, productId: created.id }))
        setShowNewProduct(false)
        setNewProductForm({ name: "", categoryId: "", family: "", formulation: "", origin: "" })
      }
    } catch {
      // silently handle
    } finally {
      setCreatingProduct(false)
    }
  }

  const getArticleCurrency = () => {
    return article?.entity?.currency || article?.product.entity?.currency || "EUR"
  }

  const getSelectedEntityCurrency = () => {
    if (editForm.entityId) {
      const ent = entities.find((e) => e.id === editForm.entityId)
      if (ent) return ent.currency
    }
    return getArticleCurrency()
  }

  const getMargin = () => {
    if (!article || !article.catalogPrice) return null
    return ((article.catalogPrice - article.standardCost) / article.catalogPrice) * 100
  }

  const getShortPeriodLabel = (period: string) => {
    const [year, month] = period.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
  }

  const totalRevenue = salesHistory.reduce((sum, e) => sum + e.revenue, 0)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-500">
        <Package className="mb-2 h-10 w-10" />
        <p>Article introuvable</p>
        <Link href="/articles" className="mt-4 text-sm text-blue-600 hover:underline">
          Retour aux articles
        </Link>
      </div>
    )
  }

  const margin = getMargin()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/articles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fiche article</h1>
          <p className="text-sm text-slate-500">Fiche signaletique de l&apos;article</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Photo + Identity */}
        <div className="space-y-4 lg:col-span-2">
          {/* Photo Area */}
          <Card>
            <CardContent className="p-4">
              <div className="relative group">
                <div className="flex h-[300px] w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                  {article.photoUrl ? (
                    <img
                      src={article.photoUrl}
                      alt={article.name}
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-24 w-24 text-slate-200" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  ) : (
                    <span className="flex items-center gap-2 rounded-md bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      <Camera className="h-4 w-4" />
                      Changer la photo
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              {/* Identity below photo */}
              <div className="mt-4 space-y-3">
                <Badge variant="secondary" className="font-mono">
                  {article.code}
                </Badge>
                <h2 className="text-xl font-bold text-slate-900">{article.name}</h2>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/products/${article.product.id}`}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {article.product.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.product.family && (
                    <Badge variant="secondary">
                      {FORMULATION_LABELS[article.product.family] || article.product.family}
                    </Badge>
                  )}
                  {article.product.formulation && (
                    <Badge variant="outline">
                      {article.product.formulation}
                    </Badge>
                  )}
                  {article.product.origin && (
                    <Badge variant="outline">
                      {ORIGIN_LABELS[article.product.origin] || article.product.origin}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details + Charts */}
        <div className="space-y-6 lg:col-span-3">
          {/* Card 1: Informations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Informations</CardTitle>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={startEditing}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Societe
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {article.entity
                        ? `${article.entity.code} - ${article.entity.name}`
                        : "—"}
                      {article.entity && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {article.entity.currency}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Produit
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      <Link
                        href={`/products/${article.product.id}`}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {article.product.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Unite de stock
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {article.stockUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Unite de vente
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {article.salesUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Contenu
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {article.contentQty} {article.contentUnit}
                    </p>
                  </div>
                  <div className="sm:col-span-2 rounded-lg bg-slate-50 p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Prix catalogue (depart usine)
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {formatCurrency(article.catalogPrice, getArticleCurrency())}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Cout standard
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                          {formatCurrency(article.standardCost, getArticleCurrency())}
                        </p>
                      </div>
                    </div>
                    {margin !== null && (
                      <div className="mt-3 flex items-center gap-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Marge catalogue
                        </p>
                        <Badge
                          variant={margin >= 0 ? "success" : "destructive"}
                          className="text-xs"
                        >
                          {margin >= 0 ? "+" : ""}
                          {margin.toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Entity select */}
                  <div className="space-y-2">
                    <Label className="text-xs">Societe</Label>
                    <Select
                      value={editForm.entityId || "__none__"}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, entityId: v === "__none__" ? "" : v })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Selectionner une societe" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Aucune —</SelectItem>
                        {entities.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.code} - {e.name} ({e.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editForm.entityId && (
                      <p className="text-xs text-slate-500">
                        Devise: {getSelectedEntityCurrency()}
                      </p>
                    )}
                  </div>
                  {/* Product select */}
                  <div className="space-y-2">
                    <Label className="text-xs">Produit</Label>
                    <Select
                      value={editForm.productId}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, productId: v })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Selectionner un produit" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code ? `${p.code} - ` : ""}{p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setShowNewProduct(!showNewProduct)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      {showNewProduct ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Creer un nouveau produit
                    </button>
                  </div>
                  {/* Inline new product form */}
                  {showNewProduct && (
                    <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Nouveau produit
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom *</Label>
                          <Input
                            placeholder="Nom du produit"
                            value={newProductForm.name}
                            onChange={(e) =>
                              setNewProductForm({ ...newProductForm, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Categorie</Label>
                          <Select
                            value={newProductForm.categoryId || "__none__"}
                            onValueChange={(v) =>
                              setNewProductForm({ ...newProductForm, categoryId: v === "__none__" ? "" : v })
                            }
                          >
                            <SelectTrigger><SelectValue placeholder="Categorie" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Aucune —</SelectItem>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Famille</Label>
                          <Select
                            value={newProductForm.family || "__none__"}
                            onValueChange={(v) =>
                              setNewProductForm({ ...newProductForm, family: v === "__none__" ? "" : v })
                            }
                          >
                            <SelectTrigger><SelectValue placeholder="Famille" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Aucune —</SelectItem>
                              {Object.entries(FORMULATION_LABELS).map(([k, label]) => (
                                <SelectItem key={k} value={k}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Formulation</Label>
                          <Input
                            placeholder="Formulation"
                            value={newProductForm.formulation}
                            onChange={(e) =>
                              setNewProductForm({ ...newProductForm, formulation: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Origine</Label>
                          <Select
                            value={newProductForm.origin || "__none__"}
                            onValueChange={(v) =>
                              setNewProductForm({ ...newProductForm, origin: v === "__none__" ? "" : v })
                            }
                          >
                            <SelectTrigger><SelectValue placeholder="Origine" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Aucune —</SelectItem>
                              {Object.entries(ORIGIN_LABELS).map(([k, label]) => (
                                <SelectItem key={k} value={k}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleCreateProduct}
                          disabled={creatingProduct || !newProductForm.name.trim()}
                        >
                          {creatingProduct ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-1 h-4 w-4" />
                          )}
                          Creer et selectionner
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs">Unite de stock</Label>
                    <Select value={editForm.stockUnit} onValueChange={(v) => setEditForm({ ...editForm, stockUnit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNIT">Unité</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="L">Litre</SelectItem>
                        <SelectItem value="CARTON">Carton</SelectItem>
                        <SelectItem value="PALETTE">Palette</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Unite de vente</Label>
                    <Select value={editForm.salesUnit} onValueChange={(v) => setEditForm({ ...editForm, salesUnit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNIT">Unité</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="L">Litre</SelectItem>
                        <SelectItem value="CARTON">Carton</SelectItem>
                        <SelectItem value="PALETTE">Palette</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Contenu (quantite)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.contentQty}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contentQty: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Unite contenu</Label>
                    <Select value={editForm.contentUnit} onValueChange={(v) => setEditForm({ ...editForm, contentUnit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Litre</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="UNIT">Unité</SelectItem>
                        <SelectItem value="ML">ML</SelectItem>
                        <SelectItem value="G">Gramme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Prix catalogue ({getSelectedEntityCurrency()})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.catalogPrice}
                      onChange={(e) =>
                        setEditForm({ ...editForm, catalogPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Cout standard ({getSelectedEntityCurrency()})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.standardCost}
                      onChange={(e) =>
                        setEditForm({ ...editForm, standardCost: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Revenue Evolution */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Evolution du CA</CardTitle>
                {salesHistory.length > 0 && (
                  <span className="text-sm font-medium text-slate-500">
                    Total: {formatCurrency(totalRevenue, getArticleCurrency())}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {salesHistory.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
                  Aucune donnee de vente disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={salesHistory}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="period"
                      tickFormatter={getShortPeriodLabel}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value), getArticleCurrency()), "CA"]}
                      labelFormatter={(label) => getPeriodLabel(String(label))}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Chiffre d'affaires"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Price & Variable Cost Evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Evolution prix et cout variable
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesHistory.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
                  Aucune donnee de vente disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart
                    data={salesHistory}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="period"
                      tickFormatter={getShortPeriodLabel}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(v) => formatNumber(Number(v))}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(Number(value), getArticleCurrency()),
                        String(name) === "avgPrice"
                          ? "Prix moyen de vente"
                          : "Cout variable unitaire",
                      ]}
                      labelFormatter={(label) => getPeriodLabel(String(label))}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                      }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "avgPrice"
                          ? "Prix moyen de vente"
                          : "Cout variable unitaire"
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="avgPrice"
                      fill="#3b82f620"
                      stroke="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="variableCost"
                      fill="#ef444420"
                      stroke="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgPrice"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#3b82f6" }}
                      name="avgPrice"
                    />
                    <Line
                      type="monotone"
                      dataKey="variableCost"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#ef4444" }}
                      name="variableCost"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Sales History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des ventes</CardTitle>
            </CardHeader>
            <CardContent>
              {salesHistory.length === 0 ? (
                <div className="flex h-[120px] items-center justify-center text-sm text-slate-400">
                  Aucune donnee de vente disponible
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead className="text-right">Qte vendue</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">Prix moyen</TableHead>
                        <TableHead className="text-right">Cout variable</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesHistory.map((entry) => {
                        const entryMargin = entry.avgPrice - entry.variableCost
                        const marginPercent = entry.avgPrice
                          ? (entryMargin / entry.avgPrice) * 100
                          : 0
                        return (
                          <TableRow key={entry.period}>
                            <TableCell className="text-sm font-medium">
                              {getPeriodLabel(entry.period)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatNumber(entry.qtySold)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(entry.revenue, getArticleCurrency())}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(entry.avgPrice, getArticleCurrency())}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(entry.variableCost, getArticleCurrency())}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  entryMargin >= 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                )}
                              >
                                {formatCurrency(entryMargin, getArticleCurrency())}{" "}
                                <span className="text-xs">
                                  ({marginPercent >= 0 ? "+" : ""}
                                  {marginPercent.toFixed(1)}%)
                                </span>
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
