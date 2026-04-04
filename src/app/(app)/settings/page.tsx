"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAppStore } from "@/store/app-store"
import { Plus } from "lucide-react"

type CostCategory = {
  id: string; code: string; name: string; type: string
  isVariable: boolean; includeInContributionMargin: boolean; sortOrder: number
}
type AccountMapping = {
  id: string; accountCode: string; accountName: string | null
  source: string; costCategoryId: string; costCategory: CostCategory
}

export default function SettingsPage() {
  const { user } = useAppStore()
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [mappings, setMappings] = useState<AccountMapping[]>([])
  const [mappingSource, setMappingSource] = useState("BOARD_COM")
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [catForm, setCatForm] = useState({ code: "", name: "", type: "MP", isVariable: true, includeInContributionMargin: false, sortOrder: 0 })
  const [mapForm, setMapForm] = useState({ accountCode: "", accountName: "", costCategoryId: "", source: "BOARD_COM" })
  const [costingMethod, setCostingMethod] = useState("CUMP")

  useEffect(() => {
    fetch("/api/cost-categories").then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/account-mappings?source=${mappingSource}`).then(r => r.json()).then(setMappings).catch(() => {})
  }, [mappingSource])

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then((data) => {
      const method = data.find((s: { key: string }) => s.key === "defaultCostingMethod")
      if (method) setCostingMethod(method.value)
    }).catch(() => {})
  }, [])

  const saveCategory = async () => {
    const res = await fetch("/api/cost-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    })
    if (res.ok) {
      const created = await res.json()
      setCategories([...categories, created])
      setCatDialogOpen(false)
      setCatForm({ code: "", name: "", type: "MP", isVariable: true, includeInContributionMargin: false, sortOrder: 0 })
    }
  }

  const saveMapping = async () => {
    const res = await fetch("/api/account-mappings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapForm),
    })
    if (res.ok) {
      fetch(`/api/account-mappings?source=${mappingSource}`).then(r => r.json()).then(setMappings)
      setMapDialogOpen(false)
      setMapForm({ accountCode: "", accountName: "", costCategoryId: "", source: "BOARD_COM" })
    }
  }

  const updateCostingMethod = async (method: string) => {
    if (user?.role !== "FPA_DIRECTOR" && user?.role !== "ADMIN") return
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "defaultCostingMethod", value: method }),
    })
    if (res.ok) setCostingMethod(method)
  }

  const typeLabels: Record<string, string> = {
    MP: "Matières premières", MOD: "Main d'oeuvre directe", OVERHEAD_PROD: "Frais production",
    COMMERCIAL: "Commercial", LOGISTICS: "Logistique", ADMIN: "Administratif", OTHER: "Autre"
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Catégories de coûts</TabsTrigger>
          <TabsTrigger value="mapping">Mapping comptes</TabsTrigger>
          <TabsTrigger value="method">Méthode de costing</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catégories de coûts</CardTitle>
              <Button onClick={() => setCatDialogOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Variable/Fixe</TableHead>
                    <TableHead>Marge contribution</TableHead>
                    <TableHead>Ordre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-mono">{cat.code}</TableCell>
                      <TableCell>{cat.name}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[cat.type] || cat.type}</Badge></TableCell>
                      <TableCell><Badge variant={cat.isVariable ? "default" : "secondary"}>{cat.isVariable ? "Variable" : "Fixe"}</Badge></TableCell>
                      <TableCell>{cat.includeInContributionMargin ? <Badge variant="success">Oui</Badge> : "Non"}</TableCell>
                      <TableCell>{cat.sortOrder}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mapping des comptes</CardTitle>
              <div className="flex gap-2">
                <Select value={mappingSource} onValueChange={setMappingSource}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOARD_COM">Board.com</SelectItem>
                    <SelectItem value="SAGE_X3">Sage X3</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setMapDialogOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code compte</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Catégorie de coût</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.accountCode}</TableCell>
                      <TableCell>{m.accountName || "-"}</TableCell>
                      <TableCell><Badge>{m.costCategory?.name || m.costCategoryId}</Badge></TableCell>
                      <TableCell>{m.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="method">
          <Card>
            <CardHeader>
              <CardTitle>Méthode de costing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Méthode actuelle</Label>
                <Select value={costingMethod} onValueChange={updateCostingMethod} disabled={user?.role !== "FPA_DIRECTOR" && user?.role !== "ADMIN"}>
                  <SelectTrigger className="w-[300px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUMP">CUMP (Coût Unitaire Moyen Pondéré)</SelectItem>
                    <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                    <SelectItem value="STANDARD">Standard (Coût standard prédéfini)</SelectItem>
                  </SelectContent>
                </Select>
                {user?.role !== "FPA_DIRECTOR" && user?.role !== "ADMIN" && (
                  <p className="text-sm text-amber-600">Seule la Directrice FP&A peut modifier la méthode de costing.</p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3 mt-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">CUMP</CardTitle></CardHeader>
                  <CardContent className="text-sm text-slate-600">
                    Le CUMP calcule le coût unitaire en divisant la valeur totale du stock (stock initial + entrées) par la quantité totale. Méthode la plus courante en France.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">FIFO</CardTitle></CardHeader>
                  <CardContent className="text-sm text-slate-600">
                    First In, First Out : les premiers articles entrés sont les premiers sortis. Reflète mieux les coûts actuels en période d&apos;inflation.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Standard</CardTitle></CardHeader>
                  <CardContent className="text-sm text-slate-600">
                    Coût prédéfini basé sur des estimations. Permet d&apos;analyser les écarts entre coûts réels et standards (variance analysis).
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle catégorie de coût</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code</Label><Input value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })} /></div>
              <div><Label>Nom</Label><Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={catForm.type} onValueChange={v => setCatForm({ ...catForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ordre</Label><Input type="number" value={catForm.sortOrder} onChange={e => setCatForm({ ...catForm, sortOrder: parseInt(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveCategory}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mapping Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau mapping</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Code compte</Label><Input value={mapForm.accountCode} onChange={e => setMapForm({ ...mapForm, accountCode: e.target.value })} /></div>
            <div><Label>Libellé</Label><Input value={mapForm.accountName} onChange={e => setMapForm({ ...mapForm, accountName: e.target.value })} /></div>
            <div>
              <Label>Catégorie de coût</Label>
              <Select value={mapForm.costCategoryId} onValueChange={v => setMapForm({ ...mapForm, costCategoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={mapForm.source} onValueChange={v => setMapForm({ ...mapForm, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOARD_COM">Board.com</SelectItem>
                  <SelectItem value="SAGE_X3">Sage X3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveMapping}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
