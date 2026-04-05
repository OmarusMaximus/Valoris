"use client"

import { useEffect, useState, useCallback } from "react"
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
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type SalesRep = {
  id: string
  code: string
  firstName: string
  lastName: string
  region: string
  email: string
  totalRevenue: number
  clientCount: number
  topClients?: { name: string; revenue: number }[]
  topArticles?: { name: string; revenue: number }[]
  monthlyTrend?: { month: string; revenue: number }[]
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
  const { selectedEntityId } = useAppStore()
  const [reps, setReps] = useState<SalesRep[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
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

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/sales-reps/${id}`)
      if (res.ok) {
        const detail = await res.json()
        setReps((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  topClients: detail.topClients || [],
                  topArticles: detail.topArticles || [],
                  monthlyTrend: detail.monthlyTrend || [],
                }
              : r
          )
        )
      }
    } catch {
      // silently handle
    } finally {
      setDetailLoading(false)
    }
  }

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
      r.email.toLowerCase().includes(q)
    )
  })

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
                  <TableHead className="w-8" />
                  <TableHead>Code</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">CA Total</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rep) => (
                  <>
                    <TableRow
                      key={rep.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleExpand(rep.id)}
                    >
                      <TableCell>
                        {expandedId === rep.id ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {rep.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {rep.firstName} {rep.lastName}
                      </TableCell>
                      <TableCell>{rep.region}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {rep.email}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(rep.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(rep.clientCount, 0)}
                      </TableCell>
                    </TableRow>
                    {expandedId === rep.id && (
                      <TableRow key={`${rep.id}-detail`}>
                        <TableCell colSpan={7} className="bg-slate-50 p-4">
                          {detailLoading ? (
                            <div className="flex h-[100px] items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                          ) : (
                            <div className="grid gap-6 lg:grid-cols-3">
                              {/* Top Clients */}
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                                  Top clients
                                </h4>
                                {rep.topClients && rep.topClients.length > 0 ? (
                                  <div className="space-y-2">
                                    {rep.topClients.map((c, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                                      >
                                        <span className="text-sm">
                                          {c.name}
                                        </span>
                                        <span className="text-sm font-medium">
                                          {formatCurrency(c.revenue)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    Aucune donnee
                                  </p>
                                )}
                              </div>
                              {/* Top Articles */}
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                                  Top articles
                                </h4>
                                {rep.topArticles &&
                                rep.topArticles.length > 0 ? (
                                  <div className="space-y-2">
                                    {rep.topArticles.map((a, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                                      >
                                        <span className="text-sm">
                                          {a.name}
                                        </span>
                                        <span className="text-sm font-medium">
                                          {formatCurrency(a.revenue)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    Aucune donnee
                                  </p>
                                )}
                              </div>
                              {/* Monthly Chart */}
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                                  CA mensuel
                                </h4>
                                {rep.monthlyTrend &&
                                rep.monthlyTrend.length > 0 ? (
                                  <ResponsiveContainer
                                    width="100%"
                                    height={180}
                                  >
                                    <BarChart data={rep.monthlyTrend}>
                                      <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11 }}
                                      />
                                      <YAxis tick={{ fontSize: 11 }} />
                                      <Tooltip
                                        formatter={(v: number) =>
                                          formatCurrency(v)
                                        }
                                      />
                                      <Bar
                                        dataKey="revenue"
                                        fill="#6366f1"
                                        radius={[4, 4, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    Aucune donnee
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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
