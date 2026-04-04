"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { formatNumber, formatPercent } from "@/lib/utils"
import { ArrowLeft, Plus, Trash2, Loader2, Package } from "lucide-react"
import Link from "next/link"

type Product = {
  id: string
  code: string
  name: string
  category?: { id: string; name: string } | null
  family: string
  unit: string
  active: boolean
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

const FAMILY_LABELS: Record<string, string> = {
  engrais_poudre: "Engrais poudre",
  engrais_liquide: "Engrais liquide",
  engrais_granule: "Engrais granulé",
  amendement: "Amendement",
  semence: "Semence",
  phyto: "Phytosanitaire",
  matiere_premiere: "Matière première",
  produit_semi_fini: "Produit semi-fini",
  produit_fini: "Produit fini",
  emballage: "Emballage",
  autre: "Autre",
}

const emptyBomForm: BomFormData = {
  componentId: "",
  quantity: "",
  unit: "KG",
  yieldRate: "100",
}

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [availableComponents, setAvailableComponents] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<BomFormData>(emptyBomForm)
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    fetchProduct()
    fetchComponents()
  }, [fetchProduct, fetchComponents])

  const openAddDialog = () => {
    setForm(emptyBomForm)
    setDialogOpen(true)
  }

  const handleAddBom = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${productId}/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: form.componentId,
          quantity: parseFloat(form.quantity),
          unit: form.unit,
          yieldRate: parseFloat(form.yieldRate) / 100,
        }),
      })
      if (res.ok) {
        setDialogOpen(false)
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
      if (res.ok) {
        fetchProduct()
      }
    } catch {
      // silently handle
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
        <Link href="/products" className="mt-4 text-sm text-blue-600 hover:underline">
          Retour aux produits
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-500">Fiche produit</p>
        </div>
      </div>

      {/* Product Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations produit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Code</p>
              <p className="font-mono text-sm">{product.code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Nom</p>
              <p className="text-sm">{product.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Catégorie</p>
              <p className="text-sm">{product.category?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Famille</p>
              <p className="text-sm">{FAMILY_LABELS[product.family] || product.family}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Unité</p>
              <Badge variant="secondary">{product.unit}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Nomenclature (BOM)</CardTitle>
              <CardDescription>
                Composants nécessaires à la fabrication de ce produit
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un composant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bomItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Package className="mb-2 h-10 w-10" />
              <p className="text-sm">Aucun composant dans la nomenclature</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Composant</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Taux de rendement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{item.component.name}</p>
                        <p className="text-xs text-slate-500 font-mono">
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
                        variant={item.yieldRate >= 0.95 ? "success" : "warning"}
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

      {/* Add BOM Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un composant</DialogTitle>
            <DialogDescription>
              Sélectionnez un composant et définissez les quantités nécessaires.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Composant</Label>
              <Select
                value={form.componentId}
                onValueChange={(v) => setForm({ ...form, componentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un composant" />
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
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v })}
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
              <Label htmlFor="yieldRate">Taux de rendement (%)</Label>
              <Input
                id="yieldRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.yieldRate}
                onChange={(e) => setForm({ ...form, yieldRate: e.target.value })}
                placeholder="100"
              />
              <p className="text-xs text-slate-500">
                Pourcentage de matière effectivement utilisée (ex: 95% = 5% de perte)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddBom}
              disabled={saving || !form.componentId || !form.quantity}
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
