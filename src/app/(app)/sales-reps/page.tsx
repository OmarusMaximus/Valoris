"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogDescription,
} from "@/components/ui/dialog"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import {
  Loader2,
  UserCheck,
  Search,
  Plus,
  ExternalLink,
} from "lucide-react"

type SalesRep = {
  id: string
  code: string
  firstName: string
  lastName: string
  region: string
  email: string
  totalRevenue: number
  totalQty: number
  clientCount: number
  articleCount: number
}

type FormData = {
  code: string
  firstName: string
  lastName: string
  region: string
  email: string
}

const emptyForm: FormData = {
  code: "",
  firstName: "",
  lastName: "",
  region: "",
  email: "",
}

export default function SalesRepsPage() {
  const router = useRouter()
  const { selectedEntityId } = useAppStore()
  const [reps, setReps] = useState<SalesRep[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchReps = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedEntityId) params.set("entityId", selectedEntityId)
      const res = await fetch(`/api/sales-reps?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReps(Array.isArray(data) ? data : data.salesReps || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId])

  useEffect(() => {
    fetchReps()
  }, [fetchReps])

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, entityId: selectedEntityId }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setForm(emptyForm)
        fetchReps()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const filtered = reps.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.email || "").toLowerCase().includes(q)
    )
  })

  const totalRevenue = filtered.reduce((s, r) => s + (r.totalRevenue || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commerciaux</h1>
          <p className="text-sm text-slate-500">
            Gestion et suivi des commerciaux
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un commercial
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Commerciaux</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">CA Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Clients couverts</p>
            <p className="text-2xl font-bold">
              {filtered.reduce((s, r) => s + (r.clientCount || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, code ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center text-slate-500">
              <UserCheck className="mb-2 h-10 w-10" />
              <p className="text-sm">Aucun commercial trouve</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">CA Total</TableHead>
                  <TableHead className="text-right">Qte totale</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                  <TableHead className="text-right">Articles</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rep) => (
                  <TableRow
                    key={rep.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/sales-reps/${rep.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      {rep.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {rep.firstName} {rep.lastName}
                    </TableCell>
                    <TableCell>{rep.region || "-"}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {rep.email || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(rep.totalRevenue || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(rep.totalQty || 0, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rep.clientCount || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {rep.articleCount || 0}
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Sales Rep Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un commercial</DialogTitle>
            <DialogDescription>
              Renseignez les informations du nouveau commercial.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rep-code">Code</Label>
              <Input
                id="rep-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="COM-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prenom</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  placeholder="Prenom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rep-email">Email</Label>
                <Input
                  id="rep-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep-region">Region</Label>
                <Input
                  id="rep-region"
                  value={form.region}
                  onChange={(e) =>
                    setForm({ ...form, region: e.target.value })
                  }
                  placeholder="Region"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                saving || !form.code || !form.firstName || !form.lastName
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
