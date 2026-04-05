"use client"

import { useRef, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "lucide-react"

type ImportResult = {
  imported: number
  skipped: number
  errors: string[]
} | null

type ImportHistoryItem = {
  id: string
  fileName: string
  date: string
  imported: number
  skipped: number
  errors: number
}

const EXPECTED_COLUMNS = [
  { name: "date", description: "Date de la vente (YYYY-MM-DD)" },
  { name: "customer_code", description: "Code client" },
  { name: "customer_name", description: "Nom du client" },
  { name: "sales_rep_code", description: "Code commercial" },
  { name: "article_code", description: "Code article" },
  { name: "quantity", description: "Quantite vendue" },
  { name: "unit_price", description: "Prix unitaire HT" },
  { name: "total_amount", description: "Montant total HT" },
  { name: "discount", description: "Remise (%) - optionnel" },
]

export default function SalesImportPage() {
  const { selectedEntityId } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [entityId, setEntityId] = useState(selectedEntityId || "")
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult>(null)
  const [history, setHistory] = useState<ImportHistoryItem[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return
    try {
      const params = new URLSearchParams()
      if (entityId) params.set("entityId", entityId)
      const res = await fetch(`/api/sales-import/history?${params}`)
      if (res.ok) {
        const data = await res.json()
        setHistory(Array.isArray(data) ? data : data.imports || [])
      }
    } catch {
      // silently handle
    } finally {
      setHistoryLoaded(true)
    }
  }, [entityId, historyLoaded])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (entityId) formData.append("entityId", entityId)
      const res = await fetch("/api/sales-import", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setResult({
          imported: data.imported || 0,
          skipped: data.skipped || 0,
          errors: data.errors || [],
        })
        setHistoryLoaded(false)
        loadHistory()
      } else {
        const err = await res.json().catch(() => ({}))
        setResult({
          imported: 0,
          skipped: 0,
          errors: [err.error || `Erreur serveur (${res.status})`],
        })
      }
    } catch {
      setResult({
        imported: 0,
        skipped: 0,
        errors: ["Erreur de connexion au serveur"],
      })
    } finally {
      setUploading(false)
    }
  }

  // Load history on mount
  useState(() => {
    loadHistory()
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import ventes</h1>
        <p className="text-sm text-slate-500">
          Importez vos donnees de ventes depuis un fichier Excel ou CSV
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fichier de ventes</CardTitle>
              <CardDescription>
                Selectionnez un fichier Excel (.xlsx) ou CSV contenant les
                donnees de ventes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entity Select */}
              <div className="space-y-2">
                <Label>Entite</Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selectionner une entite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FR">Valoris France</SelectItem>
                    <SelectItem value="CH">Valoris Suisse</SelectItem>
                    <SelectItem value="MA">Valoris Maroc</SelectItem>
                    <SelectItem value="ML">Valoris Mali</SelectItem>
                    <SelectItem value="CI">Valoris Cote d&apos;Ivoire</SelectItem>
                    <SelectItem value="SN">Valoris Senegal</SelectItem>
                    <SelectItem value="KE">Valoris Kenya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dropzone */}
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
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
                  Formats acceptes: .xlsx, .xls, .csv
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} Ko
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleUpload} disabled={uploading || !entityId}>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Importer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultat de l&apos;import</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="text-2xl font-bold text-emerald-700">
                        {result.imported}
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
                        {result.skipped}
                      </p>
                      <p className="text-xs text-amber-600">Lignes ignorees</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <XCircle className="h-6 w-6 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-700">
                        {result.errors.length}
                      </p>
                      <p className="text-xs text-red-600">Erreurs</p>
                    </div>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-red-800">
                      Detail des erreurs
                    </h4>
                    <ul className="space-y-1">
                      {result.errors.map((err, i) => (
                        <li
                          key={i}
                          className="text-sm text-red-700"
                        >
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historique des imports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">{item.fileName}</p>
                          <p className="text-xs text-slate-500">{item.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          {item.imported} importees
                        </Badge>
                        {item.skipped > 0 && (
                          <Badge
                            className="bg-amber-100 text-amber-800 text-xs"
                          >
                            {item.skipped} ignorees
                          </Badge>
                        )}
                        {item.errors > 0 && (
                          <Badge
                            className="bg-red-100 text-red-800 text-xs"
                          >
                            {item.errors} erreurs
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Format Info Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-blue-500" />
                Format attendu
              </CardTitle>
              <CardDescription>
                Votre fichier doit contenir les colonnes suivantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {EXPECTED_COLUMNS.map((col) => (
                  <div key={col.name}>
                    <p className="font-mono text-sm font-medium text-slate-900">
                      {col.name}
                    </p>
                    <p className="text-xs text-slate-500">{col.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  La premiere ligne du fichier doit contenir les en-tetes de
                  colonnes. Les colonnes peuvent etre dans n&apos;importe quel ordre.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
