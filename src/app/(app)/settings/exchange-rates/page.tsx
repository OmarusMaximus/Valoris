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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

const CURRENCIES = ["EUR", "CHF", "MAD", "XOF", "KES", "USD"]

const CURRENCY_LABELS: Record<string, string> = {
  EUR: "Euro (\u20ac)",
  CHF: "Franc suisse (CHF)",
  MAD: "Dirham (MAD)",
  XOF: "Franc CFA (XOF)",
  KES: "Shilling (KES)",
  USD: "Dollar ($)",
}

const COMMON_PAIRS = [
  { from: "EUR", to: "XOF", defaultRate: 655.957 },
  { from: "EUR", to: "MAD", defaultRate: 10.85 },
  { from: "EUR", to: "CHF", defaultRate: 0.94 },
  { from: "EUR", to: "KES", defaultRate: 155.5 },
  { from: "EUR", to: "USD", defaultRate: 1.08 },
]

type ExchangeRate = {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  period: string
}

type RateForm = {
  fromCurrency: string
  toCurrency: string
  rate: string
  period: string
}

const emptyForm: RateForm = {
  fromCurrency: "EUR",
  toCurrency: "XOF",
  rate: "",
  period: "",
}

export default function ExchangeRatesPage() {
  const { selectedPeriod } = useAppStore()
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState(selectedPeriod)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null)
  const [form, setForm] = useState<RateForm>(emptyForm)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copyFromPeriod, setCopyFromPeriod] = useState("")
  const [copyToPeriod, setCopyToPeriod] = useState("")
  const [copying, setCopying] = useState(false)

  // Generate period options
  const periodOptions: string[] = []
  const now = new Date()
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    periodOptions.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    )
  }

  const fetchRates = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterPeriod
        ? `/api/exchange-rates?period=${filterPeriod}`
        : "/api/exchange-rates"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Erreur")
      setRates(await res.json())
    } catch {
      setRates([])
    } finally {
      setLoading(false)
    }
  }, [filterPeriod])

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  const openNew = () => {
    setEditingRate(null)
    setForm({ ...emptyForm, period: filterPeriod })
    setDialogOpen(true)
  }

  const openEdit = (rate: ExchangeRate) => {
    setEditingRate(rate)
    setForm({
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: String(rate.rate),
      period: rate.period,
    })
    setDialogOpen(true)
  }

  const saveRate = async () => {
    setSaving(true)
    try {
      if (editingRate) {
        await fetch(`/api/exchange-rates/${editingRate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromCurrency: form.fromCurrency,
            toCurrency: form.toCurrency,
            rate: parseFloat(form.rate),
            period: form.period,
          }),
        })
      } else {
        await fetch("/api/exchange-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromCurrency: form.fromCurrency,
            toCurrency: form.toCurrency,
            rate: parseFloat(form.rate),
            period: form.period,
          }),
        })
      }
      setDialogOpen(false)
      fetchRates()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  const deleteRate = async (id: string) => {
    if (!confirm("Supprimer ce taux de change ?")) return
    try {
      await fetch(`/api/exchange-rates/${id}`, { method: "DELETE" })
      fetchRates()
    } catch {
      // error handled silently
    }
  }

  const quickAdd = async (from: string, to: string, defaultRate: number) => {
    setSaving(true)
    try {
      await fetch("/api/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCurrency: from,
          toCurrency: to,
          rate: defaultRate,
          period: filterPeriod,
        }),
      })
      fetchRates()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  const copyRates = async () => {
    if (!copyFromPeriod || !copyToPeriod) return
    setCopying(true)
    try {
      const res = await fetch(`/api/exchange-rates?period=${copyFromPeriod}`)
      if (!res.ok) throw new Error("Erreur")
      const sourceRates: ExchangeRate[] = await res.json()

      for (const rate of sourceRates) {
        await fetch("/api/exchange-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
            rate: rate.rate,
            period: copyToPeriod,
          }),
        })
      }

      setCopyDialogOpen(false)
      if (filterPeriod === copyToPeriod) {
        fetchRates()
      }
    } catch {
      // error handled silently
    } finally {
      setCopying(false)
    }
  }

  // Determine which common pairs are missing for the selected period
  const existingPairs = new Set(
    rates.map((r) => `${r.fromCurrency}-${r.toCurrency}`)
  )
  const missingPairs = COMMON_PAIRS.filter(
    (p) => !existingPairs.has(`${p.from}-${p.to}`)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Taux de change
          </h1>
          <p className="text-slate-500">
            Gestion des taux de change entre devises
          </p>
        </div>
      </div>

      {/* Period filter + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-sm text-slate-600">Periode :</Label>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCopyDialogOpen(true)}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copier les taux
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un taux
          </Button>
        </div>
      </div>

      {/* Quick-add common pairs */}
      {missingPairs.length > 0 && filterPeriod && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Paires courantes manquantes pour {filterPeriod}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missingPairs.map((pair) => (
                <Button
                  key={`${pair.from}-${pair.to}`}
                  variant="outline"
                  size="sm"
                  onClick={() => quickAdd(pair.from, pair.to, pair.defaultRate)}
                  disabled={saving}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {pair.from} &rarr; {pair.to} ({pair.defaultRate})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rates table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : rates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p className="text-sm">
                Aucun taux de change pour cette periode
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De</TableHead>
                  <TableHead>Vers</TableHead>
                  <TableHead className="text-right">Taux</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <Badge variant="outline">{rate.fromCurrency}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rate.toCurrency}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {rate.rate.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rate.period}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(rate)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRate(rate.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Modifier le taux" : "Nouveau taux de change"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>De (devise source)</Label>
                <Select
                  value={form.fromCurrency}
                  onValueChange={(v) =>
                    setForm({ ...form, fromCurrency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CURRENCY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vers (devise cible)</Label>
                <Select
                  value={form.toCurrency}
                  onValueChange={(v) =>
                    setForm({ ...form, toCurrency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CURRENCY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taux (1 source = X cible)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  placeholder="655.957"
                />
              </div>
              <div className="space-y-2">
                <Label>Periode</Label>
                <Select
                  value={form.period}
                  onValueChange={(v) => setForm({ ...form, period: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveRate}
              disabled={
                saving ||
                !form.fromCurrency ||
                !form.toCurrency ||
                !form.rate ||
                !form.period ||
                form.fromCurrency === form.toCurrency
              }
            >
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingRate ? "Modifier" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Rates Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copier les taux vers une autre periode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Copier depuis</Label>
              <Select
                value={copyFromPeriod}
                onValueChange={setCopyFromPeriod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Periode source" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Copier vers</Label>
              <Select value={copyToPeriod} onValueChange={setCopyToPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Periode cible" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500">
              Les taux existants pour la periode cible seront mis a jour.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCopyDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={copyRates}
              disabled={copying || !copyFromPeriod || !copyToPeriod}
            >
              {copying && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Copier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
