"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  Package,
  Users,
  UserCheck,
  Settings2,
  RotateCcw,
  Trash2,
  History,
  Sparkles,
  Copy,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type EntityOption = { id: string; code: string; name: string }

type PreviewResult = {
  columns: string[]
  preview: Record<string, unknown>[]
  suggestedMapping: Record<string, string | null>
}

type ScanResult = {
  totalRows: number
  unknownArticles: Array<{ code: string; name: string }>
  unknownCustomers: Array<{ code: string; name: string; type: string }>
  unknownSalesReps: Array<{ code: string; name: string }>
  hasUnknowns: boolean
}

type ImportResult = {
  imported: number
  skipped: number
  duplicateCount: number
  batchId: string | null
  warnings: string[]
  errors: string[]
}

type CleanupResult = {
  success: boolean
  summary: Record<string, number>
  totalChanges: number
}

type ImportStep = 1 | 2 | 3 | 4

type ImportBatchRecord = {
  id: string
  entityId: string | null
  fileName: string
  rowCount: number
  imported: number
  skipped: number
  status: string
  createdAt: string
  recordCount: number
}

type TargetField =
  | "date"
  | "period"
  | "entityCode"
  | "articleCode"
  | "articleName"
  | "customerCode"
  | "customerName"
  | "customerType"
  | "salesRepCode"
  | "salesRepName"
  | "revenue"
  | "quantity"
  | "unitPrice"
  | "variableCost"
  | "salesCurrency"

const TARGET_FIELDS: Array<{
  key: TargetField
  label: string
  required: boolean
}> = [
  { key: "date", label: "Date", required: true },
  { key: "period", label: "Periode (YYYY-MM)", required: true },
  { key: "entityCode", label: "Code societe", required: false },
  { key: "articleCode", label: "Code article", required: true },
  { key: "articleName", label: "Nom article", required: false },
  { key: "customerCode", label: "Code client", required: false },
  { key: "customerName", label: "Nom client", required: false },
  { key: "customerType", label: "Type client", required: false },
  { key: "salesRepCode", label: "Code commercial", required: false },
  { key: "salesRepName", label: "Nom commercial", required: false },
  { key: "revenue", label: "CA / Montant HT", required: true },
  { key: "quantity", label: "Quantite", required: true },
  { key: "unitPrice", label: "Prix unitaire", required: false },
  { key: "variableCost", label: "Cout variable", required: false },
  { key: "salesCurrency", label: "Devise de vente", required: false },
]

const UNMAPPED = "__unmapped__"

export default function SalesImportPage() {
  const { selectedEntityId } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [entityId, setEntityId] = useState(selectedEntityId || "")
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [step, setStep] = useState<ImportStep>(1)

  // Step 1 -> preview
  const [previewing, setPreviewing] = useState(false)
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)

  // Step 2 -> mapping
  const [mapping, setMapping] = useState<Record<TargetField, string>>({} as Record<TargetField, string>)

  // Step 3 -> scan / review unknowns
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [creating, setCreating] = useState(false)

  // Checkboxes for which unknowns to create
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [selectedReps, setSelectedReps] = useState<Set<string>>(new Set())

  // Editable names
  const [articleNames, setArticleNames] = useState<Record<string, string>>({})
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({})
  const [customerTypes, setCustomerTypes] = useState<Record<string, string>>({})
  const [repNames, setRepNames] = useState<Record<string, string>>({})

  // Step 4 -> import result
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Import history
  const [importHistory, setImportHistory] = useState<ImportBatchRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Rollback / clear
  const [rollingBack, setRollingBack] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Cleanup
  const [cleanupRules, setCleanupRules] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)

  useEffect(() => {
    fetch("/api/entities")
      .then((r) => r.json())
      .then(setEntities)
      .catch(() => {})
  }, [])

  // Build the clean mapping (only mapped fields) for API calls
  const getCleanMapping = useCallback(() => {
    const clean: Record<string, string> = {}
    for (const [key, val] of Object.entries(mapping)) {
      if (val && val !== UNMAPPED) {
        clean[key] = val
      }
    }
    return clean
  }, [mapping])

  // Validate mapping: at least date or period, articleCode, and revenue or quantity
  const isMappingValid = useCallback(() => {
    const hasDateOrPeriod =
      (mapping.date && mapping.date !== UNMAPPED) ||
      (mapping.period && mapping.period !== UNMAPPED)
    const hasArticleCode =
      mapping.articleCode && mapping.articleCode !== UNMAPPED
    const hasRevenue = mapping.revenue && mapping.revenue !== UNMAPPED
    const hasQuantity = mapping.quantity && mapping.quantity !== UNMAPPED
    return hasDateOrPeriod && hasArticleCode && (hasRevenue || hasQuantity)
  }, [mapping])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setPreviewResult(null)
    setScanResult(null)
    setImportResult(null)
    setStep(1)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // Step 1: Preview file (auto-called on file select)
  const handlePreview = async () => {
    if (!selectedFile || !entityId) return
    setPreviewing(true)
    setPreviewResult(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("entityId", entityId)
      formData.append("mode", "preview")
      const res = await fetch("/api/sales-import", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data: PreviewResult = await res.json()
        setPreviewResult(data)

        // Initialize mapping from suggested mapping
        const initialMapping: Record<string, string> = {}
        for (const field of TARGET_FIELDS) {
          const suggested = data.suggestedMapping[field.key]
          initialMapping[field.key] = suggested || UNMAPPED
        }
        setMapping(initialMapping as Record<TargetField, string>)

        setStep(2)
      }
    } catch {
      // Ignore
    } finally {
      setPreviewing(false)
    }
  }

  // Step 2 -> Step 3: Scan for unknowns
  const handleScan = async () => {
    if (!selectedFile || !entityId) return
    setScanning(true)
    setScanResult(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("entityId", entityId)
      formData.append("mode", "scan")
      formData.append("mapping", JSON.stringify(getCleanMapping()))
      const res = await fetch("/api/sales-import", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data: ScanResult = await res.json()
        setScanResult(data)

        // Pre-select all unknowns
        setSelectedArticles(
          new Set(data.unknownArticles.map((a) => a.code))
        )
        setSelectedCustomers(
          new Set(data.unknownCustomers.map((c) => c.code))
        )
        setSelectedReps(
          new Set(data.unknownSalesReps.map((r) => r.code))
        )

        // Pre-fill names
        const an: Record<string, string> = {}
        data.unknownArticles.forEach((a) => {
          an[a.code] = a.name
        })
        setArticleNames(an)
        const cn: Record<string, string> = {}
        const ct: Record<string, string> = {}
        data.unknownCustomers.forEach((c) => {
          cn[c.code] = c.name
          ct[c.code] = c.type || "DIRECT"
        })
        setCustomerNames(cn)
        setCustomerTypes(ct)
        const rn: Record<string, string> = {}
        data.unknownSalesReps.forEach((r) => {
          rn[r.code] = r.name
        })
        setRepNames(rn)

        if (data.hasUnknowns) {
          setStep(3)
        } else {
          // No unknowns, skip to import
          setStep(3)
          await doImport()
        }
      }
    } catch {
      // Ignore
    } finally {
      setScanning(false)
    }
  }

  // Step 3: Create selected unknowns then import
  const handleCreateAndImport = async () => {
    setCreating(true)
    try {
      const articles = Array.from(selectedArticles).map((code) => ({
        code,
        name: articleNames[code] || code,
      }))
      const customers = Array.from(selectedCustomers).map((code) => ({
        code,
        name: customerNames[code] || code,
        type: customerTypes[code] || "DIRECT",
      }))
      const salesReps = Array.from(selectedReps).map((code) => ({
        code,
        name: repNames[code] || code,
      }))

      if (
        articles.length > 0 ||
        customers.length > 0 ||
        salesReps.length > 0
      ) {
        await fetch("/api/sales-import/create-unknowns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId, articles, customers, salesReps }),
        })
      }
    } catch {
      /* continue to import anyway */
    }
    setCreating(false)

    await doImport()
  }

  const doImport = useCallback(async () => {
    if (!selectedFile || !entityId) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("entityId", entityId)
      formData.append("mode", "import")
      formData.append("mapping", JSON.stringify(getCleanMapping()))
      const res = await fetch("/api/sales-import", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setImportResult({
          imported: data.imported || 0,
          skipped: data.skipped || 0,
          warnings: data.warnings || [],
          errors: data.errors || [],
        })
      } else {
        const err = await res.json().catch(() => ({}))
        setImportResult({
          imported: 0,
          skipped: 0,
          warnings: [],
          errors: [err.error || `Erreur serveur (${res.status})`],
        })
      }
      setStep(4)
    } catch {
      setImportResult({
        imported: 0,
        skipped: 0,
        warnings: [],
        errors: ["Erreur de connexion"],
      })
      setStep(4)
    } finally {
      setImporting(false)
    }
  }, [selectedFile, entityId, getCleanMapping])

  const toggleArticle = (code: string) => {
    setSelectedArticles((prev) => {
      const n = new Set(prev)
      if (n.has(code)) {
        n.delete(code)
      } else {
        n.add(code)
      }
      return n
    })
  }
  const toggleCustomer = (code: string) => {
    setSelectedCustomers((prev) => {
      const n = new Set(prev)
      if (n.has(code)) {
        n.delete(code)
      } else {
        n.add(code)
      }
      return n
    })
  }
  const toggleRep = (code: string) => {
    setSelectedReps((prev) => {
      const n = new Set(prev)
      if (n.has(code)) {
        n.delete(code)
      } else {
        n.add(code)
      }
      return n
    })
  }

  const updateMapping = (field: TargetField, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }))
  }

  const reset = () => {
    setSelectedFile(null)
    setPreviewResult(null)
    setScanResult(null)
    setImportResult(null)
    setStep(1)
  }

  const stepLabels = [
    { key: 1, label: "1. Fichier" },
    { key: 2, label: "2. Mapping" },
    { key: 3, label: "3. Verification" },
    { key: 4, label: "4. Import" },
  ]

  // Get the mapped column names for the preview table
  const getMappedPreviewColumns = (): Array<{
    field: TargetField
    label: string
    column: string
  }> => {
    return TARGET_FIELDS.filter(
      (f) => mapping[f.key] && mapping[f.key] !== UNMAPPED
    ).map((f) => ({
      field: f.key,
      label: f.label,
      column: mapping[f.key],
    }))
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Import des ventes
        </h1>
        <p className="text-sm text-slate-500">
          Importez l&apos;historique de ventes par article, client et commercial
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {stepLabels.map((s) => (
          <div
            key={s.key}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              step === s.key
                ? "bg-slate-900 text-white"
                : s.key < step
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
            )}
          >
            {s.key < step && (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {s.label}
          </div>
        ))}
      </div>

      {/* ============ Step 1: Upload ============ */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Fichier de ventes
                </CardTitle>
                <CardDescription>
                  Selectionnez votre fichier Excel. Les colonnes seront
                  detectees automatiquement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Entite</Label>
                  <Select value={entityId} onValueChange={setEntityId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selectionner une entite" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.code} - {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
                    dragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-300 bg-slate-50 hover:border-slate-400"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload
                    className={cn(
                      "mb-3 h-10 w-10",
                      dragging ? "text-blue-500" : "text-slate-400"
                    )}
                  />
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    {selectedFile
                      ? selectedFile.name
                      : "Glissez un fichier ici ou cliquez pour parcourir"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Formats : .xlsx, .xls
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileSelect(f)
                    }}
                  />
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} Ko
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handlePreview}
                      disabled={previewing || !entityId}
                    >
                      {previewing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      Analyser le fichier
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-blue-500" />
                Detection automatique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                L&apos;outil detecte automatiquement vos colonnes. Vous pouvez
                ajuster le mapping manuellement.
              </p>
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                <p className="font-medium">Champs obligatoires :</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Date ou Periode</li>
                  <li>Code article</li>
                  <li>CA / Montant HT ou Quantite</li>
                </ul>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-medium">Champs optionnels :</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Nom article</li>
                  <li>Client (code, nom, type)</li>
                  <li>Commercial (code, nom)</li>
                  <li>Prix unitaire, Cout variable</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ Step 2: Column Mapping ============ */}
      {step === 2 && previewResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Mapping des colonnes
              </CardTitle>
              <CardDescription>
                Associez chaque champ Valoris a la colonne correspondante de
                votre fichier.{" "}
                {previewResult.columns.length} colonnes detectees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[250px] font-semibold">
                        Champ Valoris
                      </TableHead>
                      <TableHead className="font-semibold">
                        Colonne du fichier
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TARGET_FIELDS.map((field, idx) => (
                      <TableRow
                        key={field.key}
                        className={cn(
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">
                              {field.label}
                            </span>
                            {field.required && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 bg-red-50"
                              >
                                requis
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping[field.key] || UNMAPPED}
                            onValueChange={(v) =>
                              updateMapping(field.key, v)
                            }
                          >
                            <SelectTrigger className="w-full max-w-md h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNMAPPED}>
                                <span className="text-slate-400">
                                  -- Non mappe --
                                </span>
                              </SelectItem>
                              {previewResult.columns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!isMappingValid() && (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Mappez au minimum : (Date ou Periode) + Code article +
                    (CA/Montant HT ou Quantite)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview table with mapped columns */}
          {getMappedPreviewColumns().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Apercu des donnees ({previewResult.preview.length} premieres
                  lignes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        {getMappedPreviewColumns().map((col) => (
                          <TableHead
                            key={col.field}
                            className="text-xs whitespace-nowrap"
                          >
                            <div>
                              <div className="font-semibold text-slate-700">
                                {col.label}
                              </div>
                              <div className="font-normal text-slate-400">
                                {col.column}
                              </div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewResult.preview.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {getMappedPreviewColumns().map((col) => (
                            <TableCell
                              key={col.field}
                              className="text-xs whitespace-nowrap"
                            >
                              {String(row[col.column] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleScan}
              disabled={!isMappingValid() || scanning}
            >
              {scanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* ============ Step 3: Review unknowns ============ */}
      {step === 3 && scanResult && (
        <div className="space-y-4">
          {scanResult.hasUnknowns ? (
            <>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      {scanResult.totalRows} lignes analysees —{" "}
                      {scanResult.unknownArticles.length +
                        scanResult.unknownCustomers.length +
                        scanResult.unknownSalesReps.length}{" "}
                      elements inconnus detectes
                    </p>
                    <p className="text-xs text-amber-700">
                      Cochez les elements a ajouter a la base, modifiez les
                      noms si besoin, puis lancez l&apos;import.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Unknown Articles */}
              {scanResult.unknownArticles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Nouveaux articles ({scanResult.unknownArticles.length})
                    </CardTitle>
                    <CardDescription>
                      Ces codes articles n&apos;existent pas dans la base
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              checked={
                                selectedArticles.size ===
                                scanResult.unknownArticles.length
                              }
                              onChange={() => {
                                if (
                                  selectedArticles.size ===
                                  scanResult.unknownArticles.length
                                ) {
                                  setSelectedArticles(new Set())
                                } else {
                                  setSelectedArticles(
                                    new Set(
                                      scanResult.unknownArticles.map(
                                        (a) => a.code
                                      )
                                    )
                                  )
                                }
                              }}
                              className="rounded"
                            />
                          </TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Nom</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.unknownArticles.map((art) => (
                          <TableRow key={art.code}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedArticles.has(art.code)}
                                onChange={() => toggleArticle(art.code)}
                                className="rounded"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{art.code}</Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={articleNames[art.code] || ""}
                                onChange={(e) =>
                                  setArticleNames((prev) => ({
                                    ...prev,
                                    [art.code]: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Unknown Customers */}
              {scanResult.unknownCustomers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Nouveaux clients ({scanResult.unknownCustomers.length})
                    </CardTitle>
                    <CardDescription>
                      Ces codes clients n&apos;existent pas dans la base
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              checked={
                                selectedCustomers.size ===
                                scanResult.unknownCustomers.length
                              }
                              onChange={() => {
                                if (
                                  selectedCustomers.size ===
                                  scanResult.unknownCustomers.length
                                ) {
                                  setSelectedCustomers(new Set())
                                } else {
                                  setSelectedCustomers(
                                    new Set(
                                      scanResult.unknownCustomers.map(
                                        (c) => c.code
                                      )
                                    )
                                  )
                                }
                              }}
                              className="rounded"
                            />
                          </TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.unknownCustomers.map((cust) => (
                          <TableRow key={cust.code}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedCustomers.has(cust.code)}
                                onChange={() => toggleCustomer(cust.code)}
                                className="rounded"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{cust.code}</Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={customerNames[cust.code] || ""}
                                onChange={(e) =>
                                  setCustomerNames((prev) => ({
                                    ...prev,
                                    [cust.code]: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={customerTypes[cust.code] || ""}
                                onValueChange={(v) =>
                                  setCustomerTypes((prev) => ({
                                    ...prev,
                                    [cust.code]: v,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8 text-sm w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    Non specifie
                                  </SelectItem>
                                  <SelectItem value="COOPERATIVE">
                                    Cooperative
                                  </SelectItem>
                                  <SelectItem value="DISTRIBUTEUR">
                                    Distributeur
                                  </SelectItem>
                                  <SelectItem value="DIRECT">Direct</SelectItem>
                                  <SelectItem value="EXPORT">Export</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Unknown Sales Reps */}
              {scanResult.unknownSalesReps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Nouveaux commerciaux (
                      {scanResult.unknownSalesReps.length})
                    </CardTitle>
                    <CardDescription>
                      Ces codes commerciaux n&apos;existent pas dans la base
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              checked={
                                selectedReps.size ===
                                scanResult.unknownSalesReps.length
                              }
                              onChange={() => {
                                if (
                                  selectedReps.size ===
                                  scanResult.unknownSalesReps.length
                                ) {
                                  setSelectedReps(new Set())
                                } else {
                                  setSelectedReps(
                                    new Set(
                                      scanResult.unknownSalesReps.map(
                                        (r) => r.code
                                      )
                                    )
                                  )
                                }
                              }}
                              className="rounded"
                            />
                          </TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Nom</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.unknownSalesReps.map((rep) => (
                          <TableRow key={rep.code}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedReps.has(rep.code)}
                                onChange={() => toggleRep(rep.code)}
                                className="rounded"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{rep.code}</Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={repNames[rep.code] || ""}
                                onChange={(e) =>
                                  setRepNames((prev) => ({
                                    ...prev,
                                    [rep.code]: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour au mapping
                </Button>
                <Button
                  onClick={handleCreateAndImport}
                  disabled={creating || importing}
                >
                  {creating || importing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {creating
                    ? "Creation en cours..."
                    : importing
                      ? "Import en cours..."
                      : `Creer (${selectedArticles.size + selectedCustomers.size + selectedReps.size}) et importer`}
                </Button>
              </div>
            </>
          ) : (
            // No unknowns - show auto-proceeding message
            <Card>
              <CardContent className="p-6 flex items-center gap-3">
                {importing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-700">
                      Aucun element inconnu. Import en cours...
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="text-sm text-slate-700">
                      Aucun element inconnu detecte. Passage a l&apos;import...
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============ Step 4: Results ============ */}
      {step === 4 && importResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Resultat de l&apos;import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">
                      {importResult.imported}
                    </p>
                    <p className="text-xs text-emerald-600">
                      Lignes importees
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-700">
                      {importResult.skipped}
                    </p>
                    <p className="text-xs text-amber-600">Lignes ignorees</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">
                      {importResult.errors.length}
                    </p>
                    <p className="text-xs text-red-600">Erreurs</p>
                  </div>
                </div>
              </div>
              {importResult.warnings.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 max-h-48 overflow-y-auto">
                  <h4 className="mb-2 text-sm font-semibold text-amber-800">
                    Elements ignores (choix utilisateur)
                  </h4>
                  <ul className="space-y-1">
                    {importResult.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-amber-700">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 max-h-48 overflow-y-auto">
                  <h4 className="mb-2 text-sm font-semibold text-red-800">
                    Erreurs techniques
                  </h4>
                  <ul className="space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="text-sm text-red-700">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button onClick={reset} variant="outline">
              Nouvel import
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
