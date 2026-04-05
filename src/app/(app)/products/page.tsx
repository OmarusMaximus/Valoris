"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useAppStore } from "@/store/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Loader2, Package } from "lucide-react"
import Link from "next/link"

type Product = {
  id: string
  code: string | null
  name: string
  categoryId: string | null
  category?: { id: string; name: string } | null
  entityId: string
  unit: string
  family: string | null
  formulation: string | null
  origin: string | null
  active: boolean
}

type Category = {
  id: string
  name: string
  code: string
}

const FAMILY_LABELS: Record<string, string> = {
  AMEO: "AMEO",
  BIOSTIMULANT: "Biostimulants",
  BIOCONTROLE: "Biocontrôle",
  CORRECTEUR_CARENCES: "Correcteurs carences",
  DIVERS: "Divers",
}

const FORMULATION_LABELS: Record<string, string> = {
  POUDRE: "Poudre",
  GRANULE: "Granulé",
  WP: "WP",
  LIQUIDE: "Liquide",
  KIT: "Kit",
}

const ORIGIN_LABELS: Record<string, string> = {
  GROUPE_LOCAL: "Groupe (local)",
  GROUPE_IMPORTE: "Groupe (importé)",
  TIERS: "Tiers",
}

const UNIT_OPTIONS = [
  { value: "KG", label: "Kilogramme (KG)" },
  { value: "L", label: "Litre (L)" },
  { value: "UNIT", label: "Unité (UNIT)" },
]

const FAMILY_OPTIONS = Object.entries(FAMILY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const FORMULATION_OPTIONS = Object.entries(FORMULATION_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const ORIGIN_OPTIONS = Object.entries(ORIGIN_LABELS).map(([value, label]) => ({
  value,
  label,
}))

type ProductFormData = {
  code: string
  name: string
  categoryId: string
  entityId: string
  unit: string
  family: string
  formulation: string
  origin: string
}

const emptyForm: ProductFormData = {
  code: "",
  name: "",
  categoryId: "",
  entityId: "",
  unit: "KG",
  family: "",
  formulation: "",
  origin: "",
}

export default function ProductsPage() {
  const { selectedEntityId } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!selectedEntityId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/products?entityId=${selectedEntityId}`)
      if (res.ok) {
        const json = await res.json()
        setProducts(json)
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/products/categories")
      if (res.ok) {
        const json = await res.json()
        setCategories(json)
      }
    } catch {
      // silently handle
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
    )
  }, [products, search])

  const openCreateDialog = () => {
    setEditingProduct(null)
    setForm({ ...emptyForm, entityId: selectedEntityId || "" })
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setForm({
      code: product.code || "",
      name: product.name,
      categoryId: product.categoryId || "",
      entityId: product.entityId,
      unit: product.unit,
      family: product.family || "",
      formulation: product.formulation || "",
      origin: product.origin || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products"
      const method = editingProduct ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setDialogOpen(false)
        fetchProducts()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (product: Product) => {
    try {
      await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, active: false }),
      })
      fetchProducts()
    } catch {
      // silently handle
    }
  }

  if (!selectedEntityId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <p>Veuillez sélectionner une entité.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
          <p className="text-sm text-slate-500">
            Gérez vos produits et matières premières
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un produit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">Liste des produits</CardTitle>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Package className="mb-2 h-10 w-10" />
              <p>{search ? "Aucun produit trouvé" : "Aucun produit enregistré"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead>Formulation</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">
                      {product.code || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/products/${product.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell>{product.category?.name || "—"}</TableCell>
                    <TableCell>
                      {product.family ? (FAMILY_LABELS[product.family] || product.family) : "—"}
                    </TableCell>
                    <TableCell>
                      {product.formulation ? (FORMULATION_LABELS[product.formulation] || product.formulation) : "—"}
                    </TableCell>
                    <TableCell>
                      {product.origin ? (ORIGIN_LABELS[product.origin] || product.origin) : "—"}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "success" : "secondary"}>
                        {product.active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(product)}
                          disabled={!product.active}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Modifier le produit" : "Ajouter un produit"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Modifiez les informations du produit."
                : "Remplissez les informations pour créer un nouveau produit."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code <span className="text-xs text-slate-400">(optionnel)</span></Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nom du produit"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <SearchableSelect
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
                options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                placeholder="Sélectionner une catégorie"
                onAdd={() => {
                  const name = window.prompt("Nom de la nouvelle catégorie :")
                  if (name) {
                    // Category creation would need an API call; for now just prompt
                    window.alert("Veuillez créer la catégorie via les paramètres.")
                  }
                }}
                addLabel="Ajouter une catégorie"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unité</Label>
                <SearchableSelect
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v })}
                  options={UNIT_OPTIONS}
                  placeholder="Sélectionner une unité"
                  onAdd={() => {
                    const val = window.prompt("Code de la nouvelle unité (ex: T, ML) :")
                    if (val) {
                      UNIT_OPTIONS.push({ value: val.toUpperCase(), label: val.toUpperCase() })
                      setForm((f) => ({ ...f, unit: val.toUpperCase() }))
                    }
                  }}
                  addLabel="Ajouter une unité"
                />
              </div>
              <div className="space-y-2">
                <Label>Famille</Label>
                <SearchableSelect
                  value={form.family}
                  onValueChange={(v) => setForm({ ...form, family: v })}
                  options={FAMILY_OPTIONS}
                  placeholder="Sélectionner"
                  onAdd={() => {
                    const val = window.prompt("Code de la nouvelle famille :")
                    if (val) {
                      FAMILY_OPTIONS.push({ value: val.toUpperCase(), label: val })
                      setForm((f) => ({ ...f, family: val.toUpperCase() }))
                    }
                  }}
                  addLabel="Ajouter une famille"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formulation</Label>
                <SearchableSelect
                  value={form.formulation}
                  onValueChange={(v) => setForm({ ...form, formulation: v })}
                  options={FORMULATION_OPTIONS}
                  placeholder="Sélectionner"
                  onAdd={() => {
                    const val = window.prompt("Code de la nouvelle formulation :")
                    if (val) {
                      FORMULATION_OPTIONS.push({ value: val.toUpperCase(), label: val })
                      setForm((f) => ({ ...f, formulation: val.toUpperCase() }))
                    }
                  }}
                  addLabel="Ajouter une formulation"
                />
              </div>
              <div className="space-y-2">
                <Label>Origine</Label>
                <SearchableSelect
                  value={form.origin}
                  onValueChange={(v) => setForm({ ...form, origin: v })}
                  options={ORIGIN_OPTIONS}
                  placeholder="Sélectionner"
                  onAdd={() => {
                    const val = window.prompt("Code de la nouvelle origine :")
                    if (val) {
                      ORIGIN_OPTIONS.push({ value: val.toUpperCase(), label: val })
                      setForm((f) => ({ ...f, origin: val.toUpperCase() }))
                    }
                  }}
                  addLabel="Ajouter une origine"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingProduct ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
