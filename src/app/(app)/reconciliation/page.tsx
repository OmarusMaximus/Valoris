"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { formatCurrency, formatNumber, formatPercent, cn, getPeriodLabel } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Boxes,
  ShieldAlert,
  ArrowRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"

// ---------- Types ----------

type QuantityItem = {
  productId: string
  productName: string
  accountingQty: number
  productionQty: number
  delta: number
  deltaPercent: number
  severity: "OK" | "WARNING" | "CRITICAL"
}

type AmountItem = {
  costCategoryCode: string
  costCategoryName: string
  importAmount: number
  costSheetAmount: number
  delta: number
  deltaPercent: number
  severity: "OK" | "WARNING" | "CRITICAL"
}

type VariationAlert = {
  productId: string
  productName: string
  type: "COST_SPIKE" | "COST_DROP" | "MARGIN_ALERT" | "REVENUE_ANOMALY" | "VOLUME_ANOMALY"
  metric: string
  previousValue: number
  currentValue: number
  change: number
  changePercent: number
  severity: "WARNING" | "CRITICAL"
  comparison: "M-1" | "N-1"
  description: string
}

type ReconciliationData = {
  period: string
  entityId: string
  quantityReconciliation: {
    status: "OK" | "WARNING" | "CRITICAL"
    items: QuantityItem[]
  }
  amountReconciliation: {
    status: "OK" | "WARNING" | "CRITICAL"
    items: AmountItem[]
  }
  variationAlerts: {
    totalAlerts: number
    critical: number
    warning: number
    items: VariationAlert[]
  }
}

// ---------- Helpers ----------

const severityColor = {
  OK: "bg-emerald-100 text-emerald-800 border-emerald-200",
  WARNING: "bg-amber-100 text-amber-800 border-amber-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
}

const severityDot = {
  OK: "bg-emerald-500",
  WARNING: "bg-amber-500",
  CRITICAL: "bg-red-500",
}

const alertTypeConfig: Record<VariationAlert["type"], { icon: typeof TrendingUp; color: string; label: string }> = {
  COST_SPIKE: { icon: TrendingUp, color: "text-red-600", label: "Hausse de cout" },
  COST_DROP: { icon: TrendingDown, color: "text-emerald-600", label: "Baisse de cout" },
  MARGIN_ALERT: { icon: AlertTriangle, color: "text-amber-600", label: "Variation de marge" },
  REVENUE_ANOMALY: { icon: DollarSign, color: "text-blue-600", label: "Anomalie CA" },
  VOLUME_ANOMALY: { icon: Boxes, color: "text-purple-600", label: "Anomalie volume" },
}

function StatusIndicator({ label, status, count }: { label: string; status: "OK" | "WARNING" | "CRITICAL"; count: number }) {
  const Icon = status === "OK" ? CheckCircle2 : status === "WARNING" ? AlertTriangle : ShieldAlert
  const iconColor = status === "OK" ? "text-emerald-600" : status === "WARNING" ? "text-amber-600" : "text-red-600"
  return (
    <Card className="flex-1">
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={cn("h-8 w-8 shrink-0", iconColor)} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", severityColor[status])}>{status}</Badge>
            {count > 0 && (
              <span className="text-sm text-slate-600">{count} anomalie{count > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Tabs ----------

const TABS = [
  { id: "quantities", label: "Quantites" },
  { id: "amounts", label: "Montants" },
  { id: "variations", label: "Alertes de variations" },
] as const

type TabId = (typeof TABS)[number]["id"]

// ---------- Page ----------

export default function ReconciliationPage() {
  const { selectedEntityId, selectedPeriod } = useAppStore()
  const [data, setData] = useState<ReconciliationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("quantities")
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>("ALL")
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>("ALL")

  const fetchData = useCallback(async () => {
    if (!selectedEntityId || !selectedPeriod) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ entityId: selectedEntityId, period: selectedPeriod })
      const res = await fetch(`/api/reconciliation?${params}`)
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedPeriod])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- Loading / Empty ----------

  if (!selectedEntityId || !selectedPeriod) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Veuillez selectionner une entite et une periode.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de la reconciliation...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Aucune donnee disponible.
      </div>
    )
  }

  const totalIssues =
    data.quantityReconciliation.items.filter(i => i.severity !== "OK").length +
    data.amountReconciliation.items.filter(i => i.severity !== "OK").length +
    data.variationAlerts.totalAlerts
  const totalCritical =
    data.quantityReconciliation.items.filter(i => i.severity === "CRITICAL").length +
    data.amountReconciliation.items.filter(i => i.severity === "CRITICAL").length +
    data.variationAlerts.critical

  // Filtered variation alerts
  const filteredAlerts = data.variationAlerts.items.filter(a => {
    if (alertTypeFilter !== "ALL" && a.type !== alertTypeFilter) return false
    if (alertSeverityFilter !== "ALL" && a.severity !== alertSeverityFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-bold text-slate-900">Reconciliation & Alertes</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {getPeriodLabel(selectedPeriod)} &mdash;{" "}
          {totalIssues > 0
            ? `${totalIssues} anomalie${totalIssues > 1 ? "s" : ""} detectee${totalIssues > 1 ? "s" : ""}, dont ${totalCritical} critique${totalCritical > 1 ? "s" : ""}`
            : "Aucune anomalie detectee"}
        </p>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatusIndicator
          label="Quantites"
          status={data.quantityReconciliation.status}
          count={data.quantityReconciliation.items.filter(i => i.severity !== "OK").length}
        />
        <StatusIndicator
          label="Montants"
          status={data.amountReconciliation.status}
          count={data.amountReconciliation.items.filter(i => i.severity !== "OK").length}
        />
        <StatusIndicator
          label="Variations"
          status={data.variationAlerts.critical > 0 ? "CRITICAL" : data.variationAlerts.warning > 0 ? "WARNING" : "OK"}
          count={data.variationAlerts.totalAlerts}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "quantities" && <QuantitiesTab items={data.quantityReconciliation.items} />}
      {activeTab === "amounts" && <AmountsTab items={data.amountReconciliation.items} />}
      {activeTab === "variations" && (
        <VariationsTab
          alerts={filteredAlerts}
          allAlerts={data.variationAlerts}
          typeFilter={alertTypeFilter}
          setTypeFilter={setAlertTypeFilter}
          severityFilter={alertSeverityFilter}
          setSeverityFilter={setAlertSeverityFilter}
        />
      )}
    </div>
  )
}

// ---------- Tab 1: Quantities ----------

function QuantitiesTab({ items }: { items: QuantityItem[] }) {
  const chartData = items.map(i => ({
    name: i.productName.length > 20 ? i.productName.slice(0, 20) + "..." : i.productName,
    production: i.productionQty,
    accounting: i.accountingQty,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliation des quantites</CardTitle>
          <CardDescription>
            Comparaison entre les quantites saisies par la production et les quantites issues de la comptabilite (import Board.com / Sage X3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Aucune donnee de reconciliation pour cette periode.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qte Production</TableHead>
                    <TableHead className="text-right">Qte Comptable</TableHead>
                    <TableHead className="text-right">Ecart</TableHead>
                    <TableHead className="text-right">Ecart %</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.productionQty)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.accountingQty)}</TableCell>
                      <TableCell className={cn("text-right font-medium", item.delta > 0 ? "text-red-600" : item.delta < 0 ? "text-emerald-600" : "")}>
                        {item.delta > 0 ? "+" : ""}{formatNumber(item.delta)}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", Math.abs(item.deltaPercent) > 15 ? "text-red-600" : Math.abs(item.deltaPercent) > 5 ? "text-amber-600" : "text-slate-600")}>
                        {item.deltaPercent > 0 ? "+" : ""}{formatNumber(item.deltaPercent)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs", severityColor[item.severity])}>{item.severity}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production vs Comptabilite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatNumber(Number(v))} />
                  <Bar dataKey="production" fill="#3b82f6" name="Production" barSize={12} />
                  <Bar dataKey="accounting" fill="#f59e0b" name="Comptabilite" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------- Tab 2: Amounts ----------

function AmountsTab({ items }: { items: AmountItem[] }) {
  const chartData = items.map(i => ({
    name: i.costCategoryName.length > 25 ? i.costCategoryName.slice(0, 25) + "..." : i.costCategoryName,
    delta: i.delta,
    severity: i.severity,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliation des montants</CardTitle>
          <CardDescription>
            Comparaison entre les montants importes de la comptabilite et les montants calcules dans les feuilles de costing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Aucune donnee de reconciliation pour cette periode.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categorie de couts</TableHead>
                    <TableHead className="text-right">Montant Import</TableHead>
                    <TableHead className="text-right">Montant Costing</TableHead>
                    <TableHead className="text-right">Ecart</TableHead>
                    <TableHead className="text-right">Ecart %</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.costCategoryCode}>
                      <TableCell className="font-medium">{item.costCategoryName}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.importAmount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.costSheetAmount)}</TableCell>
                      <TableCell className={cn("text-right font-medium", item.delta > 0 ? "text-red-600" : item.delta < 0 ? "text-emerald-600" : "")}>
                        {item.delta > 0 ? "+" : ""}{formatNumber(item.delta)}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", Math.abs(item.deltaPercent) > 10 ? "text-red-600" : Math.abs(item.deltaPercent) > 5 ? "text-amber-600" : "text-slate-600")}>
                        {item.deltaPercent > 0 ? "+" : ""}{formatNumber(item.deltaPercent)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs", severityColor[item.severity])}>{item.severity}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ecarts par categorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatNumber(Number(v))} />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <Bar dataKey="delta" name="Ecart" barSize={16}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.severity === "CRITICAL" ? "#ef4444" : entry.severity === "WARNING" ? "#f59e0b" : "#22c55e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------- Tab 3: Variations ----------

function VariationsTab({
  alerts,
  allAlerts,
  typeFilter,
  setTypeFilter,
  severityFilter,
  setSeverityFilter,
}: {
  alerts: VariationAlert[]
  allAlerts: ReconciliationData["variationAlerts"]
  typeFilter: string
  setTypeFilter: (v: string) => void
  severityFilter: string
  setSeverityFilter: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Summary + Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            <strong>{allAlerts.totalAlerts}</strong> alerte{allAlerts.totalAlerts !== 1 ? "s" : ""}
          </span>
          <Badge className={cn("text-xs", severityColor.CRITICAL)}>
            {allAlerts.critical} critique{allAlerts.critical !== 1 ? "s" : ""}
          </Badge>
          <Badge className={cn("text-xs", severityColor.WARNING)}>
            {allAlerts.warning} avertissement{allAlerts.warning !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types</SelectItem>
              <SelectItem value="COST_SPIKE">Hausse de cout</SelectItem>
              <SelectItem value="COST_DROP">Baisse de cout</SelectItem>
              <SelectItem value="MARGIN_ALERT">Variation de marge</SelectItem>
              <SelectItem value="REVENUE_ANOMALY">Anomalie CA</SelectItem>
              <SelectItem value="VOLUME_ANOMALY">Anomalie volume</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes</SelectItem>
              <SelectItem value="CRITICAL">Critique</SelectItem>
              <SelectItem value="WARNING">Avertissement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alert Cards */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Aucune alerte de variation pour les filtres selectionnes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {alerts.map((alert, idx) => {
            const config = alertTypeConfig[alert.type]
            const AlertIcon = config.icon
            return (
              <Card key={`${alert.productId}-${alert.type}-${alert.comparison}-${idx}`} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 rounded-lg p-2", alert.severity === "CRITICAL" ? "bg-red-50" : "bg-amber-50")}>
                      <AlertIcon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{alert.productName}</span>
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-slate-500">{alert.metric}:</span>
                        <span className="font-medium text-slate-700">{formatNumber(alert.previousValue)}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className={cn("font-semibold", alert.changePercent > 0 ? "text-red-600" : "text-emerald-600")}>
                          {formatNumber(alert.currentValue)}
                        </span>
                        <span className={cn("text-xs font-medium", alert.changePercent > 0 ? "text-red-600" : "text-emerald-600")}>
                          ({alert.changePercent > 0 ? "+" : ""}{formatNumber(alert.changePercent)}%)
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className={cn("text-xs", severityColor[alert.severity])}>{alert.severity}</Badge>
                        <Badge variant="outline" className="text-xs">vs {alert.comparison}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{alert.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
