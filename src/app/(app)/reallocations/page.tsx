"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { formatCurrency, getPeriodLabel } from "@/lib/utils"
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
  Trash2,
  Loader2,
  ArrowLeftRight,
  BookOpen,
} from "lucide-react"

type Reallocation = {
  id: string
  description: string
  sourceAxis: string
  targetAxis: string
  amount: number
  period: string
  entityId: string
}

type ReallocationRule = {
  id: string
  name: string
  costCategory: string
  sourceAxis: string
  targetAxis: string
  method: "PERCENTAGE" | "VOLUME" | "HEADCOUNT" | "MANUAL"
  percentage: number | null
  active: boolean
}

type ReallocationForm = {
  description: string
  sourceAxis: string
  targetAxis: string
  amount: string
}

type RuleForm = {
  name: string
  costCategory: string
  sourceAxis: string
  targetAxis: string
  method: "PERCENTAGE" | "VOLUME" | "HEADCOUNT" | "MANUAL"
  percentage: string
  active: boolean
}

const emptyReallocationForm: ReallocationForm = {
  description: "",
  sourceAxis: "",
  targetAxis: "",
  amount: "",
}

const emptyRuleForm: RuleForm = {
  name: "",
  costCategory: "",
  sourceAxis: "",
  targetAxis: "",
  method: "PERCENTAGE",
  percentage: "",
  active: true,
}

export default function ReallocationsPage() {
  const { selectedEntityId, selectedPeriod } = useAppStore()

  const [reallocations, setReallocations] = useState<Reallocation[]>([])
  const [rules, setRules] = useState<ReallocationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [rulesLoading, setRulesLoading] = useState(true)

  const [reallocationDialogOpen, setReallocationDialogOpen] = useState(false)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [editingReallocation, setEditingReallocation] = useState<Reallocation | null>(null)
  const [editingRule, setEditingRule] = useState<ReallocationRule | null>(null)
  const [reallocationForm, setReallocationForm] = useState<ReallocationForm>(emptyReallocationForm)
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm)
  const [saving, setSaving] = useState(false)

  const fetchReallocations = useCallback(async () => {
    if (!selectedEntityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("entityId", selectedEntityId)
      params.set("period", selectedPeriod)
      const res = await fetch(`/api/reallocations?${params.toString()}`)
      if (!res.ok) throw new Error("Erreur chargement")
      const data = await res.json()
      setReallocations(data)
    } catch {
      setReallocations([])
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedPeriod])

  const fetchRules = useCallback(async () => {
    setRulesLoading(true)
    try {
      const res = await fetch("/api/reallocations/rules")
      if (!res.ok) throw new Error("Erreur chargement")
      const data = await res.json()
      setRules(data)
    } catch {
      setRules([])
    } finally {
      setRulesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReallocations()
  }, [fetchReallocations])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const totalReallocated = reallocations.reduce((sum, r) => sum + r.amount, 0)

  const openNewReallocation = () => {
    setEditingReallocation(null)
    setReallocationForm(emptyReallocationForm)
    setReallocationDialogOpen(true)
  }

  const openEditReallocation = (r: Reallocation) => {
    setEditingReallocation(r)
    setReallocationForm({
      description: r.description,
      sourceAxis: r.sourceAxis,
      targetAxis: r.targetAxis,
      amount: String(r.amount),
    })
    setReallocationDialogOpen(true)
  }

  const saveReallocation = async () => {
    setSaving(true)
    try {
      const body = {
        description: reallocationForm.description,
        sourceAxis: reallocationForm.sourceAxis,
        targetAxis: reallocationForm.targetAxis,
        amount: parseFloat(reallocationForm.amount),
        entityId: selectedEntityId,
        period: selectedPeriod,
      }

      if (editingReallocation) {
        await fetch(`/api/reallocations/${editingReallocation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/reallocations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      setReallocationDialogOpen(false)
      fetchReallocations()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  const deleteReallocation = async (id: string) => {
    try {
      await fetch(`/api/reallocations/${id}`, { method: "DELETE" })
      fetchReallocations()
    } catch {
      // error handled silently
    }
  }

  const openNewRule = () => {
    setEditingRule(null)
    setRuleForm(emptyRuleForm)
    setRuleDialogOpen(true)
  }

  const openEditRule = (rule: ReallocationRule) => {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      costCategory: rule.costCategory,
      sourceAxis: rule.sourceAxis,
      targetAxis: rule.targetAxis,
      method: rule.method,
      percentage: rule.percentage != null ? String(rule.percentage) : "",
      active: rule.active,
    })
    setRuleDialogOpen(true)
  }

  const saveRule = async () => {
    setSaving(true)
    try {
      const body = {
        name: ruleForm.name,
        costCategory: ruleForm.costCategory,
        sourceAxis: ruleForm.sourceAxis,
        targetAxis: ruleForm.targetAxis,
        method: ruleForm.method,
        percentage: ruleForm.method === "PERCENTAGE" ? parseFloat(ruleForm.percentage) : null,
        active: ruleForm.active,
      }

      if (editingRule) {
        await fetch(`/api/reallocations/rules/${editingRule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/reallocations/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      setRuleDialogOpen(false)
      fetchRules()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  if (!selectedEntityId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <ArrowLeftRight className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">
          Veuillez selectionner une entite pour afficher les reallocations
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reallocations</h1>
        <p className="text-slate-500">{getPeriodLabel(selectedPeriod)}</p>
      </div>

      <Tabs defaultValue="reallocations">
        <TabsList>
          <TabsTrigger value="reallocations">Reallocations</TabsTrigger>
          <TabsTrigger value="rules">Regles</TabsTrigger>
        </TabsList>

        {/* Reallocations Tab */}
        <TabsContent value="reallocations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Reallocations de couts</CardTitle>
              <Button size="sm" onClick={openNewReallocation}>
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle reallocation
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : reallocations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ArrowLeftRight className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucune reallocation pour cette periode</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Centre source</TableHead>
                        <TableHead>Centre cible</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reallocations.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.description}</TableCell>
                          <TableCell>{r.sourceAxis}</TableCell>
                          <TableCell>{r.targetAxis}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditReallocation(r)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteReallocation(r.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <div className="text-sm text-slate-500">
                      Total realloue :{" "}
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(totalReallocated)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Regles de reallocation</CardTitle>
              <Button size="sm" onClick={openNewRule}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une regle
              </Button>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <BookOpen className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucune regle configuree</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Categorie de cout</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Methode</TableHead>
                      <TableHead className="text-right">Pourcentage</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{rule.costCategory}</TableCell>
                        <TableCell>{rule.sourceAxis}</TableCell>
                        <TableCell>{rule.targetAxis}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{rule.method}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {rule.method === "PERCENTAGE" && rule.percentage != null
                            ? `${rule.percentage}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.active ? "success" : "secondary"}>
                            {rule.active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditRule(rule)}
                          >
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
      </Tabs>

      {/* Reallocation Dialog */}
      <Dialog open={reallocationDialogOpen} onOpenChange={setReallocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReallocation ? "Modifier la reallocation" : "Nouvelle reallocation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={reallocationForm.description}
                onChange={(e) =>
                  setReallocationForm({ ...reallocationForm, description: e.target.value })
                }
                placeholder="Description de la reallocation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceAxis">Centre source</Label>
              <Input
                id="sourceAxis"
                value={reallocationForm.sourceAxis}
                onChange={(e) =>
                  setReallocationForm({ ...reallocationForm, sourceAxis: e.target.value })
                }
                placeholder="Axe analytique source"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAxis">Centre cible</Label>
              <Input
                id="targetAxis"
                value={reallocationForm.targetAxis}
                onChange={(e) =>
                  setReallocationForm({ ...reallocationForm, targetAxis: e.target.value })
                }
                placeholder="Axe analytique cible"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                value={reallocationForm.amount}
                onChange={(e) =>
                  setReallocationForm({ ...reallocationForm, amount: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReallocationDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveReallocation} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingReallocation ? "Modifier" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Modifier la regle" : "Ajouter une regle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Nom</Label>
              <Input
                id="ruleName"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="Nom de la regle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleCostCategory">Categorie de cout</Label>
              <Input
                id="ruleCostCategory"
                value={ruleForm.costCategory}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, costCategory: e.target.value })
                }
                placeholder="Categorie de cout"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleSource">Source</Label>
              <Input
                id="ruleSource"
                value={ruleForm.sourceAxis}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, sourceAxis: e.target.value })
                }
                placeholder="Axe source"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleTarget">Cible</Label>
              <Input
                id="ruleTarget"
                value={ruleForm.targetAxis}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, targetAxis: e.target.value })
                }
                placeholder="Axe cible"
              />
            </div>
            <div className="space-y-2">
              <Label>Methode</Label>
              <Select
                value={ruleForm.method}
                onValueChange={(val) =>
                  setRuleForm({
                    ...ruleForm,
                    method: val as RuleForm["method"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Pourcentage</SelectItem>
                  <SelectItem value="VOLUME">Volume</SelectItem>
                  <SelectItem value="HEADCOUNT">Effectifs</SelectItem>
                  <SelectItem value="MANUAL">Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ruleForm.method === "PERCENTAGE" && (
              <div className="space-y-2">
                <Label htmlFor="rulePercentage">Pourcentage (%)</Label>
                <Input
                  id="rulePercentage"
                  type="number"
                  value={ruleForm.percentage}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, percentage: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveRule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingRule ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
