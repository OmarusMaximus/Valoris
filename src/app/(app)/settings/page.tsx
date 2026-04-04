"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Pencil,
  Loader2,
  Settings,
  AlertTriangle,
} from "lucide-react"

// --- Types ---

type CostCategory = {
  id: string
  code: string
  name: string
  type: string
  isVariable: boolean
  includeInContributionMargin: boolean
  sortOrder: number
}

type AccountMapping = {
  id: string
  accountCode: string
  accountName: string | null
  source: string
  costCategoryId: string
  costCategory: CostCategory
}

type Entity = {
  id: string
  name: string
  code: string
  currency: string
}

type UserItem = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

type CatForm = {
  code: string
  name: string
  type: string
  isVariable: boolean
  includeInContributionMargin: boolean
  sortOrder: number
}

type MapForm = {
  accountCode: string
  accountName: string
  costCategoryId: string
  source: string
}

const emptyCatForm: CatForm = {
  code: "",
  name: "",
  type: "MP",
  isVariable: true,
  includeInContributionMargin: false,
  sortOrder: 0,
}

const emptyMapForm: MapForm = {
  accountCode: "",
  accountName: "",
  costCategoryId: "",
  source: "BOARD_COM",
}

const TYPE_LABELS: Record<string, string> = {
  MP: "Matieres premieres",
  MOD: "Main d'oeuvre directe",
  OVERHEAD_PROD: "Frais production",
  COMMERCIAL: "Commercial",
  LOGISTICS: "Logistique",
  ADMIN: "Administratif",
  OTHER: "Autre",
}

const COSTING_METHODS = [
  {
    value: "CUMP",
    label: "CUMP (Cout Unitaire Moyen Pondere)",
    description:
      "Le CUMP calcule le cout unitaire en divisant la valeur totale du stock (stock initial + entrees) par la quantite totale. Methode la plus courante en France.",
  },
  {
    value: "FIFO",
    label: "FIFO (First In, First Out)",
    description:
      "First In, First Out : les premiers articles entres sont les premiers sortis. Reflete mieux les couts actuels en periode d'inflation.",
  },
  {
    value: "STANDARD",
    label: "Cout Standard",
    description:
      "Cout predefini base sur des estimations. Permet d'analyser les ecarts entre couts reels et standards (variance analysis).",
  },
]

export default function SettingsPage() {
  const { user } = useAppStore()

  // Cost categories
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null)
  const [catForm, setCatForm] = useState<CatForm>(emptyCatForm)

  // Account mappings
  const [mappings, setMappings] = useState<AccountMapping[]>([])
  const [mappingsLoading, setMappingsLoading] = useState(true)
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<AccountMapping | null>(null)
  const [mapForm, setMapForm] = useState<MapForm>(emptyMapForm)
  const [sourceFilter, setSourceFilter] = useState("ALL")

  // Costing method
  const [costingMethod, setCostingMethod] = useState("CUMP")
  const [methodLoading, setMethodLoading] = useState(true)
  const [methodSaving, setMethodSaving] = useState(false)

  // Entities
  const [entities, setEntities] = useState<Entity[]>([])
  const [entitiesLoading, setEntitiesLoading] = useState(true)

  // Users
  const [users, setUsers] = useState<UserItem[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  // --- Fetchers ---

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const res = await fetch("/api/cost-categories")
      if (!res.ok) throw new Error("Erreur")
      setCategories(await res.json())
    } catch {
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  const fetchMappings = useCallback(async () => {
    setMappingsLoading(true)
    try {
      const res = await fetch("/api/account-mappings")
      if (!res.ok) throw new Error("Erreur")
      setMappings(await res.json())
    } catch {
      setMappings([])
    } finally {
      setMappingsLoading(false)
    }
  }, [])

  const fetchCostingMethod = useCallback(async () => {
    setMethodLoading(true)
    try {
      const res = await fetch("/api/settings")
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      const method = data.find((s: { key: string }) => s.key === "defaultCostingMethod")
      if (method) setCostingMethod(method.value)
    } catch {
      setCostingMethod("CUMP")
    } finally {
      setMethodLoading(false)
    }
  }, [])

  const fetchEntities = useCallback(async () => {
    setEntitiesLoading(true)
    try {
      const res = await fetch("/api/entities")
      if (!res.ok) throw new Error("Erreur")
      setEntities(await res.json())
    } catch {
      setEntities([])
    } finally {
      setEntitiesLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Erreur")
      setUsers(await res.json())
    } catch {
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchMappings()
    fetchCostingMethod()
    fetchEntities()
    fetchUsers()
  }, [fetchCategories, fetchMappings, fetchCostingMethod, fetchEntities, fetchUsers])

  // --- Cost Category actions ---

  const openNewCategory = () => {
    setEditingCategory(null)
    setCatForm(emptyCatForm)
    setCatDialogOpen(true)
  }

  const openEditCategory = (cat: CostCategory) => {
    setEditingCategory(cat)
    setCatForm({
      code: cat.code,
      name: cat.name,
      type: cat.type,
      isVariable: cat.isVariable,
      includeInContributionMargin: cat.includeInContributionMargin,
      sortOrder: cat.sortOrder,
    })
    setCatDialogOpen(true)
  }

  const saveCategory = async () => {
    setSaving(true)
    try {
      if (editingCategory) {
        await fetch(`/api/cost-categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(catForm),
        })
      } else {
        await fetch("/api/cost-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(catForm),
        })
      }
      setCatDialogOpen(false)
      fetchCategories()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  // --- Account Mapping actions ---

  const openNewMapping = () => {
    setEditingMapping(null)
    setMapForm(emptyMapForm)
    setMapDialogOpen(true)
  }

  const openEditMapping = (mapping: AccountMapping) => {
    setEditingMapping(mapping)
    setMapForm({
      accountCode: mapping.accountCode,
      accountName: mapping.accountName ?? "",
      costCategoryId: mapping.costCategoryId,
      source: mapping.source,
    })
    setMapDialogOpen(true)
  }

  const saveMapping = async () => {
    setSaving(true)
    try {
      if (editingMapping) {
        await fetch(`/api/account-mappings/${editingMapping.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapForm),
        })
      } else {
        await fetch("/api/account-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapForm),
        })
      }
      setMapDialogOpen(false)
      fetchMappings()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  // --- Costing method ---

  const updateCostingMethod = async (method: string) => {
    if (user?.role !== "FPA_DIRECTOR" && user?.role !== "ADMIN") return
    setMethodSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "defaultCostingMethod", value: method }),
      })
      if (res.ok) setCostingMethod(method)
    } catch {
      // error handled silently
    } finally {
      setMethodSaving(false)
    }
  }

  const filteredMappings =
    sourceFilter === "ALL"
      ? mappings
      : mappings.filter((m) => m.source === sourceFilter)

  const isDirector = user?.role === "FPA_DIRECTOR" || user?.role === "ADMIN"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Parametres</h1>
        <p className="text-slate-500">Configuration de l&apos;application</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="flex-wrap">
          <TabsTrigger value="categories">Categories de couts</TabsTrigger>
          <TabsTrigger value="mapping">Mapping comptable</TabsTrigger>
          <TabsTrigger value="method">Methode de valorisation</TabsTrigger>
          <TabsTrigger value="entities">Entites</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        {/* Cost Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Categories de couts</CardTitle>
              <Button size="sm" onClick={openNewCategory}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Settings className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucune categorie configuree</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Variable/Fixe</TableHead>
                      <TableHead>Marge contributive</TableHead>
                      <TableHead className="text-right">Ordre</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-mono text-sm">{cat.code}</TableCell>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TYPE_LABELS[cat.type] || cat.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cat.isVariable ? "default" : "secondary"}>
                            {cat.isVariable ? "Variable" : "Fixe"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cat.includeInContributionMargin ? (
                            <Badge variant="success">Oui</Badge>
                          ) : (
                            <Badge variant="secondary">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{cat.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditCategory(cat)}>
                            <Pencil className="h-4 w-4" />
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

        {/* Account Mapping Tab */}
        <TabsContent value="mapping">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Mapping comptable</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes les sources</SelectItem>
                    <SelectItem value="BOARD_COM">Board.com</SelectItem>
                    <SelectItem value="SAGE_X3">Sage X3</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={openNewMapping}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mappingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : filteredMappings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Settings className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucun mapping configure</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code compte</TableHead>
                      <TableHead>Nom du compte</TableHead>
                      <TableHead>Categorie de cout</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-mono text-sm">{mapping.accountCode}</TableCell>
                        <TableCell className="font-medium">{mapping.accountName || "-"}</TableCell>
                        <TableCell>
                          <Badge>{mapping.costCategory?.name || mapping.costCategoryId}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {mapping.source === "BOARD_COM" ? "Board.com" : "Sage X3"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditMapping(mapping)}>
                            <Pencil className="h-4 w-4" />
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

        {/* Costing Method Tab */}
        <TabsContent value="method">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Methode de valorisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {methodLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  {!isDirector && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Seul le Directeur FP&A peut modifier ce parametre.</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {COSTING_METHODS.map((method) => (
                      <div
                        key={method.value}
                        className={`p-4 border rounded-lg transition-colors ${
                          costingMethod === method.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-900">{method.label}</h4>
                              {costingMethod === method.value && (
                                <Badge variant="default">Actuel</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{method.description}</p>
                          </div>
                          {isDirector && costingMethod !== method.value && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCostingMethod(method.value)}
                              disabled={methodSaving}
                              className="ml-4 shrink-0"
                            >
                              {methodSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Selectionner"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entites</CardTitle>
            </CardHeader>
            <CardContent>
              {entitiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : entities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Settings className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucune entite configuree</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Devise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entities.map((entity) => (
                      <TableRow key={entity.id}>
                        <TableCell className="font-mono text-sm">{entity.code}</TableCell>
                        <TableCell className="font-medium">{entity.name}</TableCell>
                        <TableCell>{entity.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Settings className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucun utilisateur</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.firstName} {u.lastName}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.role}</Badge>
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

      {/* Cost Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Modifier la categorie" : "Nouvelle categorie de cout"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                  placeholder="MP_DIRECTE"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="Matieres premieres directes"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={catForm.type}
                  onValueChange={(v) => setCatForm({ ...catForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ordre de tri</Label>
                <Input
                  type="number"
                  value={catForm.sortOrder}
                  onChange={(e) =>
                    setCatForm({ ...catForm, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Variable / Fixe</Label>
              <Select
                value={catForm.isVariable ? "VARIABLE" : "FIXED"}
                onValueChange={(val) =>
                  setCatForm({ ...catForm, isVariable: val === "VARIABLE" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VARIABLE">Variable</SelectItem>
                  <SelectItem value="FIXED">Fixe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="catContrib"
                checked={catForm.includeInContributionMargin}
                onChange={(e) =>
                  setCatForm({ ...catForm, includeInContributionMargin: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="catContrib">Inclus dans la marge contributive</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveCategory} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingCategory ? "Modifier" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Mapping Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? "Modifier le mapping" : "Nouveau mapping comptable"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code compte</Label>
              <Input
                value={mapForm.accountCode}
                onChange={(e) => setMapForm({ ...mapForm, accountCode: e.target.value })}
                placeholder="601100"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom du compte</Label>
              <Input
                value={mapForm.accountName}
                onChange={(e) => setMapForm({ ...mapForm, accountName: e.target.value })}
                placeholder="Achats matieres premieres"
              />
            </div>
            <div className="space-y-2">
              <Label>Categorie de cout</Label>
              <Select
                value={mapForm.costCategoryId}
                onValueChange={(v) => setMapForm({ ...mapForm, costCategoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={mapForm.source}
                onValueChange={(v) => setMapForm({ ...mapForm, source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOARD_COM">Board.com</SelectItem>
                  <SelectItem value="SAGE_X3">Sage X3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveMapping} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingMapping ? "Modifier" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
