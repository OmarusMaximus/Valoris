"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn, formatCurrency } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import { Loader2, Users, Search, Plus, ChevronDown, ChevronRight } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type Customer = {
  id: string
  code: string
  name: string
  type: string
  region: string
  totalRevenue: number
  totalMargin: number
  articles?: { name: string; revenue: number; margin: number }[]
  monthlyTrend?: { month: string; revenue: number }[]
}

const TYPE_COLORS: Record<string, string> = {
  COOPERATIVE: "bg-blue-100 text-blue-800",
  DISTRIBUTEUR: "bg-amber-100 text-amber-800",
  DIRECT: "bg-green-100 text-green-800",
  EXPORT: "bg-purple-100 text-purple-800",
}

const TYPE_OPTIONS = ["Tous", "COOPERATIVE", "DISTRIBUTEUR", "DIRECT", "EXPORT"]

type FormData = {
  code: string
  name: string
  type: string
  region: string
}

const emptyForm: FormData = { code: "", name: "", type: "DIRECT", region: "" }

export default function CustomersPage() {
  const { selectedEntityId } = useAppStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("Tous")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedEntityId) params.set("entityId", selectedEntityId)
      const res = await fetch(`/api/customers?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(Array.isArray(data) ? data : data.customers || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/customers/${id}`)
      if (res.ok) {
        const detail = await res.json()
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  articles: detail.articles || [],
                  monthlyTrend: detail.monthlyTrend || [],
                }
              : c
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
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, entityId: selectedEntityId }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setForm(emptyForm)
        fetchCustomers()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const filtered = customers.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "Tous" || c.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">
            Gestion et suivi des clients
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un client
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher par nom ou code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "Tous" ? "Tous les types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Users className="mb-2 h-10 w-10" />
              <p className="text-sm">Aucun client trouve</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">CA Total</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <>
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleExpand(customer.id)}
                    >
                      <TableCell>
                        {expandedId === customer.id ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs",
                            TYPE_COLORS[customer.type] || "bg-slate-100 text-slate-800"
                          )}
                        >
                          {customer.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.region}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-medium",
                            customer.totalMargin >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          )}
                        >
                          {formatCurrency(customer.totalMargin)}
                        </span>
                      </TableCell>
                    </TableRow>
                    {expandedId === customer.id && (
                      <TableRow key={`${customer.id}-detail`}>
                        <TableCell colSpan={7} className="bg-slate-50 p-4">
                          {detailLoading ? (
                            <div className="flex h-[100px] items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                          ) : (
                            <div className="grid gap-6 lg:grid-cols-2">
                              {/* Revenue by article */}
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                                  CA par article
                                </h4>
                                {customer.articles &&
                                customer.articles.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Article</TableHead>
                                        <TableHead className="text-right">
                                          CA
                                        </TableHead>
                                        <TableHead className="text-right">
                                          Marge
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {customer.articles.map((a, i) => (
                                        <TableRow key={i}>
                                          <TableCell className="text-sm">
                                            {a.name}
                                          </TableCell>
                                          <TableCell className="text-right text-sm">
                                            {formatCurrency(a.revenue)}
                                          </TableCell>
                                          <TableCell className="text-right text-sm">
                                            {formatCurrency(a.margin)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    Aucune donnee
                                  </p>
                                )}
                              </div>
                              {/* Monthly trend */}
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                                  Tendance mensuelle
                                </h4>
                                {customer.monthlyTrend &&
                                customer.monthlyTrend.length > 0 ? (
                                  <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={customer.monthlyTrend}>
                                      <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11 }}
                                      />
                                      <YAxis tick={{ fontSize: 11 }} />
                                      <Tooltip
                                        formatter={(v) =>
                                          formatCurrency(Number(v))
                                        }
                                      />
                                      <Bar
                                        dataKey="revenue"
                                        fill="#3b82f6"
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

      {/* Add Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un client</DialogTitle>
            <DialogDescription>
              Renseignez les informations du nouveau client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="CLI-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nom du client"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
                    <SelectItem value="DISTRIBUTEUR">Distributeur</SelectItem>
                    <SelectItem value="DIRECT">Direct</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
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
              disabled={saving || !form.code || !form.name}
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
