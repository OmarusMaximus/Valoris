"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { Package, Plus, Search, Loader2, Tag, Pencil, Trash2, LayoutGrid, List } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
  product: {
    id: string
    name: string
    family: string
  }
}

type Product = {
  id: string
  code: string
  name: string
  family: string
}

const FORMULATION_LABELS: Record<string, string> = {
  engrais_poudre: "Poudre",
  engrais_liquide: "Liquide",
  engrais_granule: "Granulé",
  amendement: "Amendement",
  semence: "Semence",
  phyto: "Phytosanitaire",
  matiere_premiere: "MP",
  produit_semi_fini: "PSF",
  produit_fini: "PF",
  emballage: "Emballage",
  autre: "Autre",
}

function ArticlesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialProductId = searchParams.get("productId") || ""

  const [articles, setArticles] = useState<Article[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [productFilter, setProductFilter] = useState(initialProductId)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: "",
    name: "",
    productId: initialProductId,
    stockUnit: "KG",
    salesUnit: "KG",
    contentQty: "",
    contentUnit: "KG",
    catalogPrice: "",
    standardCost: "",
  })

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (productFilter) params.set("productId", productFilter)
      const res = await fetch(`/api/articles?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data)
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [productFilter])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?entityId=all")
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch {
      // silently handle
    }
  }, [])

  useEffect(() => {
    fetchArticles()
    fetchProducts()
  }, [fetchArticles, fetchProducts])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contentQty: parseFloat(form.contentQty) || 0,
          catalogPrice: parseFloat(form.catalogPrice) || 0,
          standardCost: parseFloat(form.standardCost) || 0,
        }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setForm({
          code: "",
          name: "",
          productId: productFilter,
          stockUnit: "KG",
          salesUnit: "KG",
          contentQty: "",
          contentUnit: "KG",
          catalogPrice: "",
          standardCost: "",
        })
        fetchArticles()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const filteredArticles = articles.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q)
    )
  })

  const getMargin = (article: Article) => {
    if (!article.catalogPrice) return null
    return ((article.catalogPrice - article.standardCost) / article.catalogPrice) * 100
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Articles</h1>
          <p className="text-sm text-slate-500">
            Catalogue des articles (conditionnements)
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher par nom ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={productFilter || "all"}
          onValueChange={(v) => setProductFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Tous les produits" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" className="h-10 w-10" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" className="h-10 w-10" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} article(s) selectionne(s)</span>
          <Button variant="destructive" size="sm" onClick={async () => {
            if (!confirm(`Supprimer ${selectedIds.size} article(s) ?`)) return
            for (const id of Array.from(selectedIds)) {
              await fetch(`/api/articles/${id}`, { method: "DELETE" })
            }
            setSelectedIds(new Set())
            fetchArticles()
          }}>
            <Trash2 className="h-3 w-3 mr-1" /> Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Deselectionner</Button>
        </div>
      )}

      {/* Articles */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="flex h-[40vh] flex-col items-center justify-center text-slate-500">
          <Tag className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">Aucun article</p>
          <p className="mt-1 text-sm">
            {search
              ? "Aucun article ne correspond a votre recherche."
              : "Commencez par ajouter un article."}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* TABLE VIEW */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" className="rounded" checked={selectedIds.size === filteredArticles.length && filteredArticles.length > 0}
                  onChange={() => {
                    if (selectedIds.size === filteredArticles.length) { setSelectedIds(new Set()) }
                    else { setSelectedIds(new Set(filteredArticles.map(a => a.id))) }
                  }} />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Contenu</TableHead>
              <TableHead className="text-right">Prix catalogue</TableHead>
              <TableHead className="text-right">Cout standard</TableHead>
              <TableHead className="text-right">Marge %</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredArticles.map((article) => {
              const margin = getMargin(article)
              return (
                <TableRow key={article.id} className="cursor-pointer" onClick={() => router.push(`/articles/${article.id}`)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" checked={selectedIds.has(article.id)}
                      onChange={() => { setSelectedIds(prev => { const n = new Set(prev); if (n.has(article.id)) { n.delete(article.id) } else { n.add(article.id) } return n }) }} />
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-xs">{article.code}</Badge></TableCell>
                  <TableCell className="font-medium">{article.name}</TableCell>
                  <TableCell className="text-sm text-slate-500">{article.product.name}</TableCell>
                  <TableCell className="text-sm">{article.contentQty} {article.contentUnit}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(article.catalogPrice)}</TableCell>
                  <TableCell className="text-right text-slate-500">{formatCurrency(article.standardCost)}</TableCell>
                  <TableCell className="text-right">
                    {margin !== null && <Badge variant={margin >= 0 ? "success" : "destructive"} className="text-xs">{margin >= 0 ? "+" : ""}{margin.toFixed(1)}%</Badge>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/articles/${article.id}`)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={async () => {
                        if (!confirm(`Supprimer ${article.name} ?`)) return
                        await fetch(`/api/articles/${article.id}`, { method: "DELETE" })
                        fetchArticles()
                      }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        /* GRID VIEW */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArticles.map((article) => {
            const margin = getMargin(article)
            return (
              <Card
                key={article.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/articles/${article.id}`)}
              >
                <CardContent className="p-4">
                  {/* Photo */}
                  <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-slate-50">
                    {article.photoUrl ? (
                      <img
                        src={article.photoUrl}
                        alt={article.name}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <Package className="h-16 w-16 text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {article.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {article.code}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {FORMULATION_LABELS[article.product.family] || article.product.family}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500">
                      {article.product.name}
                    </p>

                    <p className="text-xs text-slate-600">
                      {article.contentQty} {article.contentUnit}
                    </p>

                    <div className="flex items-end justify-between pt-1">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(article.catalogPrice)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Cout: {formatCurrency(article.standardCost)}
                        </p>
                      </div>
                      {margin !== null && (
                        <Badge
                          variant={margin >= 0 ? "success" : "destructive"}
                          className="text-xs"
                        >
                          {margin >= 0 ? "+" : ""}
                          {margin.toFixed(1)}%
                        </Badge>
                      )}
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex justify-end gap-1 pt-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/articles/${article.id}`)
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm(`Supprimer l'article ${article.name} ?`)) return
                          await fetch(`/api/articles/${article.id}`, { method: "DELETE" })
                          fetchArticles()
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel article</DialogTitle>
            <DialogDescription>
              Creer un nouveau conditionnement article.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="ART-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nom de l'article"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Produit parent</Label>
              <Select
                value={form.productId}
                onValueChange={(v) => setForm({ ...form, productId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contenu</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.contentQty}
                  onChange={(e) => setForm({ ...form, contentQty: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label>Unite contenu</Label>
                <Select
                  value={form.contentUnit}
                  onValueChange={(v) => setForm({ ...form, contentUnit: v })}
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
              <div className="space-y-2">
                <Label>Unite stock</Label>
                <Select
                  value={form.stockUnit}
                  onValueChange={(v) => setForm({ ...form, stockUnit: v })}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix catalogue</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.catalogPrice}
                  onChange={(e) => setForm({ ...form, catalogPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Cout standard</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.standardCost}
                  onChange={(e) => setForm({ ...form, standardCost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.code || !form.name || !form.productId}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Chargement...</div>}>
      <ArticlesPageContent />
    </Suspense>
  )
}
