"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, formatCurrency, formatPercent } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import { Users, Loader2, Plus, Search, ChevronDown, ChevronRight, TrendingUp } from "lucide-react"
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

const TYPE_OPTIONS = [
  { value: "ALL", label: "Tous les types" },
  { value: "COOPERATIVE", label: "Coopérative" },
  { value: "DISTRIBUTEUR", label: "Distributeur" },
  { value: "DIRECT", label: "Direct" },
  { value: "EXPORT", label: "Export" },
]

type CustomerFormData = {
  code: string
  name: string
  type: string
  region: string
}

const emptyForm: CustomerFormData = {
  code: "",
  name: "",
  type: "DIRECT",
  region: "",
}

export default function CustomersPage() {
  const { selectedEntityId } = useAppStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CustomerFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchCustomers = async () => {
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
  }

  useEffect(() => {
    fetchCustomers()
  }, [selectedEntityId])

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.region?.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === "ALL" || c.type === typeFilter
      return matchSearch && matchType
    })
  }, [customers, search, typeFilter])

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          entityId: selectedEntityId,
        }),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">
            Gestion et suivi des clients par entité
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true) }}>
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
                placeholder="Rechercher par nom, code ou région..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
              <p className="text-sm">Aucun client trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead className="text-right">CA Total</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => {
                  const isExpanded = expandedId === customer.id
                  const marginPct =
                    customer.totalRevenue > 0
                      ? customer.totalMargin / customer.totalRevenue
                      : 0
                  return (
                    <>
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
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
                        <TableCell>{customer.region || "—"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customer.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium">
                              {formatCurrency(customer.totalMargin)}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                marginPct >= 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              )}
                            >
                              {formatPercent(marginPct)}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${customer.id}-detail`}>
                          <TableCell colSpan={7} className="bg-slate-50 p-4">
                            <div className="grid gap-6 lg:grid-cols-2">
                              {/* Revenue by article */}
                              <div>
                                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                                  CA par article
                                </h4>
                                {customer.articles && customer.articles.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Article</TableHead>
                                        <TableHead className="text-right">CA</TableHead>
                                        <TableHead className="text-right">Marge</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {customer.articles.map((art, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="text-sm">{art.name}</TableCell>
                                          <TableCell className="text-right text-sm">
                                            {formatCurrency(art.revenue)}
                                          </TableCell>
                                          <TableCell className="text-right text-sm">
                                            {formatCurrency(art.margin)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    Aucune donnée de vente
                                  </p>
                                )}
                              </div>
                              {/* Monthly trend */}
                              <div>
                                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                                  Tendance mensuelle
                                </h4>
                                {customer.monthlyTrend && customer.monthlyTrend.length > 0 ? (
                                  <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={customer.monthlyTrend}>
                                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                      <YAxis tick={{ fontSize: 11 }} />
                                      <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                      />
                                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="flex h-[200px] items-center justify-center">
                                    <div className="text-center text-slate-400">
                                      <TrendingUp className="mx-auto mb-2 h-8 w-8" />
                                      <p className="text-sm">Aucune tendance disponible</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
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
                    <SelectItem value="COOPERATIVE">Coopérative</SelectItem>
                    <SelectItem value="DISTRIBUTEUR">Distributeur</SelectItem>
                    <SelectItem value="DIRECT">Direct</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Région</Label>
                <Input
                  id="region"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="Région"
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
