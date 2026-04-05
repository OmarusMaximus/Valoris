"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import {
  Building2,
  Package,
  Layers,
  DollarSign,
  FileSpreadsheet,
  Settings2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Edit as EditIcon,
  Trash2,
} from "lucide-react"

// ─── Types ───
type Entity = { id: string; code: string; name: string; country: string; currency: string }
type Category = { id: string; code: string; name: string; type: string }
type Product = { id: string; code: string; name: string; category: Category; family: string | null; formulation: string | null; origin: string | null; unit: string }
type CostCat = { id: string; code: string; name: string; type: string; isVariable: boolean; includeInContributionMargin: boolean; sortOrder: number }
type Mapping = { id: string; accountCode: string; accountName: string | null; costCategoryId: string; costCategory?: CostCat; source: string }

const STEPS = [
  { key: "entities", label: "Sociétés", icon: Building2 },
  { key: "categories", label: "Catégories produits", icon: Layers },
  { key: "products", label: "Produits", icon: Package },
  { key: "costs", label: "Catégories de coûts", icon: DollarSign },
  { key: "mapping", label: "Mapping comptes", icon: FileSpreadsheet },
  { key: "method", label: "Méthode de costing", icon: Settings2 },
  { key: "summary", label: "Résumé", icon: CheckCircle2 },
]

const CURRENCIES = ["EUR", "CHF", "MAD", "XOF", "KES", "USD"]
const FAMILIES = [
  { value: "AMEO", label: "AMEO" },
  { value: "BIOSTIMULANT", label: "Biostimulants" },
  { value: "BIOCONTROLE", label: "Biocontrôle" },
  { value: "CORRECTEUR_CARENCES", label: "Correcteurs carences" },
  { value: "DIVERS", label: "Divers" },
]
const FORMULATIONS = [
  { value: "POUDRE", label: "Poudre" },
  { value: "GRANULE", label: "Granulé" },
  { value: "WP", label: "WP" },
  { value: "LIQUIDE", label: "Liquide" },
  { value: "KIT", label: "Kit" },
]
const ORIGINS = [
  { value: "GROUPE_LOCAL", label: "Groupe (local)" },
  { value: "GROUPE_IMPORTE", label: "Groupe (importé)" },
  { value: "TIERS", label: "Tiers" },
]
const COST_TYPES = [
  { value: "MP", label: "Matières premières" },
  { value: "MOD", label: "Main d'oeuvre directe" },
  { value: "OVERHEAD_PROD", label: "Frais production" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "LOGISTICS", label: "Logistique" },
  { value: "ADMIN", label: "Administratif" },
  { value: "OTHER", label: "Autre" },
]

export default function SetupPage() {
  const [step, setStep] = useState(0)

  // ─── Entities ───
  const [entities, setEntities] = useState<Entity[]>([])
  const [entForm, setEntForm] = useState({ code: "", name: "", country: "", currency: "EUR" })
  const [entLoading, setEntLoading] = useState(false)

  // ─── Categories ───
  const [categories, setCategories] = useState<Category[]>([])
  const [catForm, setCatForm] = useState({ code: "", name: "", type: "FINISHED_PRODUCT" })

  // ─── Products ───
  const [products, setProducts] = useState<Product[]>([])
  const [prodEntity, setProdEntity] = useState("")
  const [prodForm, setProdForm] = useState({ code: "", name: "", categoryId: "", family: "", formulation: "", origin: "", unit: "KG" })

  // ─── Cost Categories ───
  const [costCats, setCostCats] = useState<CostCat[]>([])
  const [ccForm, setCcForm] = useState({ code: "", name: "", type: "MP", isVariable: true, includeInContributionMargin: false })

  // ─── Mappings ───
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [mapSource, setMapSource] = useState("BOARD_COM")
  const [mapForm, setMapForm] = useState({ accountCode: "", accountName: "", costCategoryId: "" })

  // ─── Method ───
  const [method, setMethod] = useState("CUMP")

  // ─── Editing IDs ───
  const [editingEntId, setEditingEntId] = useState<string | null>(null)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingProdId, setEditingProdId] = useState<string | null>(null)
  const [editingCcId, setEditingCcId] = useState<string | null>(null)
  const [editingMapId, setEditingMapId] = useState<string | null>(null)

  // ─── Saving ───
  const [saving, setSaving] = useState(false)

  // ─── Data fetching ───
  const fetchEntities = useCallback(async () => {
    try {
      const r = await fetch("/api/entities")
      if (r.ok) setEntities(await r.json())
    } catch { /* */ }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const r = await fetch("/api/products/categories")
      if (r.ok) setCategories(await r.json())
    } catch { /* */ }
  }, [])

  const fetchProducts = useCallback(async () => {
    if (!prodEntity) return
    try {
      const r = await fetch(`/api/products?entityId=${prodEntity}`)
      if (r.ok) setProducts(await r.json())
    } catch { /* */ }
  }, [prodEntity])

  const fetchCostCats = useCallback(async () => {
    try {
      const r = await fetch("/api/cost-categories")
      if (r.ok) setCostCats(await r.json())
    } catch { /* */ }
  }, [])

  const fetchMappings = useCallback(async () => {
    try {
      const r = await fetch(`/api/account-mappings?source=${mapSource}`)
      if (r.ok) setMappings(await r.json())
    } catch { /* */ }
  }, [mapSource])

  const fetchMethod = useCallback(async () => {
    try {
      const r = await fetch("/api/settings")
      if (r.ok) {
        const settings = await r.json()
        const m = Array.isArray(settings)
          ? settings.find((s: { key: string }) => s.key === "defaultCostingMethod")
          : null
        if (m) setMethod(m.value)
      }
    } catch { /* */ }
  }, [])

  useEffect(() => {
    fetchEntities()
    fetchCategories()
    fetchCostCats()
    fetchMappings()
    fetchMethod()
  }, [fetchEntities, fetchCategories, fetchCostCats, fetchMappings, fetchMethod])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchMappings() }, [fetchMappings])

  // ─── Handlers ───
  const addEntity = async () => {
    if (!entForm.code || !entForm.name || !entForm.country) return
    setEntLoading(true)
    try {
      const r = await fetch("/api/setup/entities", {
        method: editingEntId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEntId ? { id: editingEntId, ...entForm } : entForm),
      })
      if (r.ok) {
        setEntForm({ code: "", name: "", country: "", currency: "EUR" })
        setEditingEntId(null)
        fetchEntities()
      }
    } catch { /* */ }
    setEntLoading(false)
  }

  const deleteEntity = async (id: string) => {
    try {
      const r = await fetch("/api/setup/entities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (r.ok) fetchEntities()
    } catch { /* */ }
  }

  const addCategory = async () => {
    if (!catForm.code || !catForm.name) return
    try {
      const url = editingCatId ? `/api/products/categories/${editingCatId}` : "/api/products/categories"
      const r = await fetch(url, {
        method: editingCatId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      })
      if (r.ok) {
        setCatForm({ code: "", name: "", type: "FINISHED_PRODUCT" })
        setEditingCatId(null)
        fetchCategories()
      }
    } catch { /* */ }
  }

  const deleteCategory = async (id: string) => {
    try {
      const r = await fetch(`/api/products/categories/${id}`, { method: "DELETE" })
      if (r.ok) fetchCategories()
    } catch { /* */ }
  }

  const addProduct = async () => {
    if (!prodForm.name || !prodForm.categoryId || !prodEntity) return
    try {
      const url = editingProdId ? `/api/products/${editingProdId}` : "/api/products"
      const r = await fetch(url, {
        method: editingProdId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prodForm, entityId: prodEntity }),
      })
      if (r.ok) {
        setProdForm({ code: "", name: "", categoryId: "", family: "", formulation: "", origin: "", unit: "KG" })
        setEditingProdId(null)
        fetchProducts()
      }
    } catch { /* */ }
  }

  const deleteProduct = async (id: string) => {
    try {
      const r = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (r.ok) fetchProducts()
    } catch { /* */ }
  }

  const addCostCat = async () => {
    if (!ccForm.code || !ccForm.name) return
    try {
      const url = editingCcId ? `/api/cost-categories/${editingCcId}` : "/api/cost-categories"
      const r = await fetch(url, {
        method: editingCcId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ccForm, sortOrder: costCats.length }),
      })
      if (r.ok) {
        setCcForm({ code: "", name: "", type: "MP", isVariable: true, includeInContributionMargin: false })
        setEditingCcId(null)
        fetchCostCats()
      }
    } catch { /* */ }
  }

  const deleteCostCat = async (id: string) => {
    try {
      const r = await fetch(`/api/cost-categories/${id}`, { method: "DELETE" })
      if (r.ok) fetchCostCats()
    } catch { /* */ }
  }

  const addMapping = async () => {
    if (!mapForm.accountCode || !mapForm.costCategoryId) return
    try {
      const url = editingMapId ? `/api/account-mappings/${editingMapId}` : "/api/account-mappings"
      const r = await fetch(url, {
        method: editingMapId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mapForm, source: mapSource }),
      })
      if (r.ok) {
        setMapForm({ accountCode: "", accountName: "", costCategoryId: "" })
        setEditingMapId(null)
        fetchMappings()
      }
    } catch { /* */ }
  }

  const deleteMapping = async (id: string) => {
    try {
      const r = await fetch(`/api/account-mappings/${id}`, { method: "DELETE" })
      if (r.ok) fetchMappings()
    } catch { /* */ }
  }

  const saveMethod = async (m: string) => {
    setMethod(m)
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "defaultCostingMethod", value: m }),
    })
  }

  const completeSetup = async () => {
    setSaving(true)
    await fetch("/api/setup/complete", { method: "POST" })
    window.location.href = "/"
  }

  // ─── Step content renderers ───
  const renderEntities = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une société</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Code</Label>
              <Input placeholder="FR" value={entForm.code} onChange={e => setEntForm({ ...entForm, code: e.target.value.toUpperCase() })} maxLength={5} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input placeholder="Valoris France" value={entForm.name} onChange={e => setEntForm({ ...entForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input placeholder="France" value={entForm.country} onChange={e => setEntForm({ ...entForm, country: e.target.value })} />
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={entForm.currency} onValueChange={v => setEntForm({ ...entForm, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={addEntity} disabled={entLoading} size="sm">
              <Plus className="h-4 w-4 mr-1" /> {editingEntId ? "Modifier" : "Ajouter"}
            </Button>
            {editingEntId && (
              <Button variant="outline" size="sm" onClick={() => { setEditingEntId(null); setEntForm({ code: "", name: "", country: "", currency: "EUR" }) }}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {entities.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Devise</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map(e => (
              <TableRow key={e.id}>
                <TableCell><Badge variant="outline">{e.code}</Badge></TableCell>
                <TableCell>{e.name}</TableCell>
                <TableCell>{e.country}</TableCell>
                <TableCell>{e.currency}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingEntId(e.id); setEntForm({ code: e.code, name: e.name, country: e.country, currency: e.currency }) }}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => deleteEntity(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )

  const renderCategories = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Code</Label>
              <Input placeholder="CAT_XXX" value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input placeholder="Nom de la catégorie" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={catForm.type} onValueChange={v => setCatForm({ ...catForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINISHED_PRODUCT">Produit fini</SelectItem>
                  <SelectItem value="RAW_MATERIAL">Matière première</SelectItem>
                  <SelectItem value="SEMI_FINISHED">Semi-fini</SelectItem>
                  <SelectItem value="PACKAGING">Emballage</SelectItem>
                  <SelectItem value="THIRD_PARTY">Produit tiers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={addCategory} size="sm">
              <Plus className="h-4 w-4 mr-1" /> {editingCatId ? "Modifier" : "Ajouter"}
            </Button>
            {editingCatId && (
              <Button variant="outline" size="sm" onClick={() => { setEditingCatId(null); setCatForm({ code: "", name: "", type: "FINISHED_PRODUCT" }) }}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {categories.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(c => (
              <TableRow key={c.id}>
                <TableCell><Badge variant="outline">{c.code}</Badge></TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCatId(c.id); setCatForm({ code: c.code, name: c.name, type: c.type }) }}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => deleteCategory(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )

  const renderProducts = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un produit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Société</Label>
            <Select value={prodEntity} onValueChange={v => setProdEntity(v)}>
              <SelectTrigger className="w-[280px]"><SelectValue placeholder="Sélectionner une société" /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.code} - {e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {prodEntity && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label>Code <span className="text-xs text-slate-400">(optionnel)</span></Label>
                  <Input placeholder="Optionnel" value={prodForm.code} onChange={e => setProdForm({ ...prodForm, code: e.target.value })} />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input placeholder="Nom du produit" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={prodForm.categoryId} onValueChange={v => setProdForm({ ...prodForm, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unité</Label>
                  <Select value={prodForm.unit} onValueChange={v => setProdForm({ ...prodForm, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="UNIT">Unité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <Label>Famille</Label>
                  <Select value={prodForm.family} onValueChange={v => setProdForm({ ...prodForm, family: v })}>
                    <SelectTrigger><SelectValue placeholder="Famille" /></SelectTrigger>
                    <SelectContent>
                      {FAMILIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Formulation</Label>
                  <Select value={prodForm.formulation} onValueChange={v => setProdForm({ ...prodForm, formulation: v })}>
                    <SelectTrigger><SelectValue placeholder="Formulation" /></SelectTrigger>
                    <SelectContent>
                      {FORMULATIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Origine</Label>
                  <Select value={prodForm.origin} onValueChange={v => setProdForm({ ...prodForm, origin: v })}>
                    <SelectTrigger><SelectValue placeholder="Origine" /></SelectTrigger>
                    <SelectContent>
                      {ORIGINS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={addProduct} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> {editingProdId ? "Modifier" : "Ajouter"}
                </Button>
                {editingProdId && (
                  <Button variant="outline" size="sm" onClick={() => { setEditingProdId(null); setProdForm({ code: "", name: "", categoryId: "", family: "", formulation: "", origin: "", unit: "KG" }) }}>
                    Annuler
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {products.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Famille</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell><Badge variant="outline">{p.code}</Badge></TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.category?.name}</TableCell>
                <TableCell>{FAMILIES.find(f => f.value === p.family)?.label || "-"}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingProdId(p.id); setProdForm({ code: p.code, name: p.name, categoryId: p.category?.id || "", family: p.family || "", formulation: p.formulation || "", origin: p.origin || "", unit: p.unit }) }}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )

  const renderCostCategories = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une catégorie de coûts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label>Code</Label>
              <Input placeholder="CC_XXX" value={ccForm.code} onChange={e => setCcForm({ ...ccForm, code: e.target.value })} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input placeholder="Nom" value={ccForm.name} onChange={e => setCcForm({ ...ccForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={ccForm.type} onValueChange={v => setCcForm({ ...ccForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-6 mt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ccForm.isVariable} onChange={e => setCcForm({ ...ccForm, isVariable: e.target.checked })} className="rounded" />
              Coût variable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ccForm.includeInContributionMargin} onChange={e => setCcForm({ ...ccForm, includeInContributionMargin: e.target.checked })} className="rounded" />
              Inclure dans marge de contribution
            </label>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={addCostCat} size="sm">
              <Plus className="h-4 w-4 mr-1" /> {editingCcId ? "Modifier" : "Ajouter"}
            </Button>
            {editingCcId && (
              <Button variant="outline" size="sm" onClick={() => { setEditingCcId(null); setCcForm({ code: "", name: "", type: "MP", isVariable: true, includeInContributionMargin: false }) }}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {costCats.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Variable</TableHead>
              <TableHead>Marge contrib.</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costCats.map(c => (
              <TableRow key={c.id}>
                <TableCell><Badge variant="outline">{c.code}</Badge></TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell><Badge variant="secondary">{COST_TYPES.find(t => t.value === c.type)?.label || c.type}</Badge></TableCell>
                <TableCell>{c.isVariable ? <Badge variant="success">Oui</Badge> : <Badge variant="secondary">Non</Badge>}</TableCell>
                <TableCell>{c.includeInContributionMargin ? <Badge variant="success">Oui</Badge> : <Badge variant="secondary">Non</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCcId(c.id); setCcForm({ code: c.code, name: c.name, type: c.type, isVariable: c.isVariable, includeInContributionMargin: c.includeInContributionMargin }) }}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => deleteCostCat(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )

  const renderMapping = () => (
    <div className="space-y-6">
      <div className="flex gap-3 items-end">
        <div>
          <Label>Source comptable</Label>
          <Select value={mapSource} onValueChange={v => setMapSource(v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BOARD_COM">Board.com (P&L)</SelectItem>
              <SelectItem value="SAGE_X3">Sage X3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Code compte</Label>
              <Input placeholder="601xxx" value={mapForm.accountCode} onChange={e => setMapForm({ ...mapForm, accountCode: e.target.value })} />
            </div>
            <div>
              <Label>Libellé compte</Label>
              <Input placeholder="Achats MP" value={mapForm.accountName} onChange={e => setMapForm({ ...mapForm, accountName: e.target.value })} />
            </div>
            <div>
              <Label>Catégorie de coûts</Label>
              <Select value={mapForm.costCategoryId} onValueChange={v => setMapForm({ ...mapForm, costCategoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {costCats.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={addMapping} size="sm">
              <Plus className="h-4 w-4 mr-1" /> {editingMapId ? "Modifier" : "Ajouter"}
            </Button>
            {editingMapId && (
              <Button variant="outline" size="sm" onClick={() => { setEditingMapId(null); setMapForm({ accountCode: "", accountName: "", costCategoryId: "" }) }}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {mappings.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code compte</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Catégorie de coûts</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map(m => (
              <TableRow key={m.id}>
                <TableCell><Badge variant="outline">{m.accountCode}</Badge></TableCell>
                <TableCell>{m.accountName || "-"}</TableCell>
                <TableCell>{m.costCategory ? `${m.costCategory.code} - ${m.costCategory.name}` : m.costCategoryId}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingMapId(m.id); setMapForm({ accountCode: m.accountCode, accountName: m.accountName || "", costCategoryId: m.costCategoryId }) }}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => deleteMapping(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )

  const renderMethod = () => (
    <div className="space-y-4">
      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
        Seule la Directrice FP&A peut modifier cette méthode ultérieurement.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { value: "CUMP", title: "CUMP", desc: "Coût Unitaire Moyen Pondéré — Moyenne pondérée des coûts d'entrée. Méthode la plus courante." },
          { value: "FIFO", title: "FIFO", desc: "First In First Out — Les premiers coûts engagés sortent en premier. Adapté aux stocks périssables." },
          { value: "STANDARD", title: "Standard", desc: "Coût standard prédéfini — Les écarts sont analysés séparément. Pour les environnements stables." },
        ].map(m => (
          <Card
            key={m.value}
            className={`cursor-pointer transition-all ${method === m.value ? "ring-2 ring-emerald-500 bg-emerald-50" : "hover:bg-slate-50"}`}
            onClick={() => saveMethod(m.value)}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {method === m.value && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {m.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderSummary = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Sociétés", count: entities.length, icon: Building2 },
          { label: "Catégories produits", count: categories.length, icon: Layers },
          { label: "Produits", count: products.length, icon: Package },
          { label: "Catégories de coûts", count: costCats.length, icon: DollarSign },
          { label: "Mappings comptes", count: mappings.length, icon: FileSpreadsheet },
          { label: "Méthode de costing", count: null, icon: Settings2, value: method },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                <item.icon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="text-2xl font-bold">
                  {item.count !== null ? item.count : item.value}
                </p>
              </div>
              {(item.count === null || item.count > 0) && (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">Configuration prête !</h3>
          <p className="text-sm text-emerald-700 mb-6">
            Votre environnement métier est configuré. Vous pouvez commencer à utiliser Valoris.
          </p>
          <Button onClick={completeSetup} disabled={saving} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Terminer la configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const stepRenderers = [renderEntities, renderCategories, renderProducts, renderCostCategories, renderMapping, renderMethod, renderSummary]
  const currentStep = STEPS[step]
  const StepIcon = currentStep.icon

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuration initiale</h1>
        <p className="text-slate-500">Configurez votre environnement métier en quelques étapes</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                i === step
                  ? "bg-slate-900 text-white"
                  : i < step
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < step ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepIcon className="h-5 w-5" />
            Étape {step + 1} : {currentStep.label}
          </CardTitle>
          <CardDescription>
            {step === 0 && "Définissez les sociétés du groupe (entités légales, pays, devises)"}
            {step === 1 && "Organisez vos produits en catégories (produit fini, matière première, etc.)"}
            {step === 2 && "Créez votre catalogue de produits pour chaque société"}
            {step === 3 && "Définissez les catégories de coûts pour l'analyse (MP, MOD, frais généraux, etc.)"}
            {step === 4 && "Associez les comptes comptables aux catégories de coûts pour l'import automatique"}
            {step === 5 && "Choisissez la méthode de valorisation des stocks"}
            {step === 6 && "Vérifiez la configuration et lancez Valoris"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stepRenderers[step]()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
        </Button>
        <div className="flex gap-2">
          {step < STEPS.length - 1 && (
            <Button
              variant="ghost"
              onClick={() => setStep(step + 1)}
              className="text-slate-400"
            >
              Passer cette étape
            </Button>
          )}
          {step < STEPS.length - 1 && (
            <Button onClick={() => setStep(step + 1)}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
