"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAppStore } from "@/store/app-store"
import { cn, formatNumber } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wand2,
  ArrowRight,
  History,
  Eye,
} from "lucide-react"
import { Label } from "@/components/ui/label"

type ImportLine = {
  id: string
  lineNumber: number
  rawLabel: string
  rawAmount: number
  mappedCategoryId: string | null
  mappedCategoryName: string | null
  status: "mapped" | "unmapped" | "error"
  errorMessage?: string | null
}

type ImportSession = {
  id: string
  source: string
  fileName: string
  status: "pending" | "mapping" | "validated" | "error"
  totalLines: number
  mappedLines: number
  createdAt: string
  lines?: ImportLine[]
}

type CostCategory = {
  id: string
  name: string
  code: string
  type: string
}

const SOURCE_OPTIONS = [
  { value: "board", label: "Board.com" },
  { value: "sagex3", label: "Sage X3" },
]

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" }
> = {
  pending: { label: "En attente", variant: "secondary" },
  mapping: { label: "Mapping en cours", variant: "warning" },
  validated: { label: "Validé", variant: "success" },
  error: { label: "Erreur", variant: "destructive" },
}

export default function ImportPage() {
  const { selectedEntityId, selectedPeriod } = useAppStore()
  const [activeTab, setActiveTab] = useState("import")

  // Import state
  const [source, setSource] = useState("board")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentSession, setCurrentSession] = useState<ImportSession | null>(null)
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [autoMapping, setAutoMapping] = useState(false)
  const [validating, setValidating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // History state
  const [sessions, setSessions] = useState<ImportSession[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [viewingSession, setViewingSession] = useState<ImportSession | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/products/categories")
      if (res.ok) {
        const json = await res.json()
        setCategories(json)
      }
    } catch {
      // silently handle
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!selectedEntityId) return
    setLoadingHistory(true)
    try {
      const res = await fetch(
        `/api/import?entityId=${selectedEntityId}`
      )
      if (res.ok) {
        const json = await res.json()
        setSessions(json)
      }
    } catch {
      // silently handle
    } finally {
      setLoadingHistory(false)
    }
  }, [selectedEntityId])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory()
    }
  }, [activeTab, fetchHistory])

  const handleFileSelect = (selectedFile: File) => {
    const validExtensions = [".xlsx", ".xls"]
    const ext = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase()
    if (!validExtensions.includes(ext)) {
      return
    }
    setFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedEntityId) return
    setUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("source", source)
      formData.append("entityId", selectedEntityId)
      formData.append("period", selectedPeriod)

      setUploadProgress(30)

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      })

      setUploadProgress(80)

      if (res.ok) {
        const session = await res.json()
        setCurrentSession(session)
        setUploadProgress(100)
      } else {
        const error = await res.json()
        throw new Error(error.message || "Erreur lors de l'import")
      }
    } catch {
      // silently handle
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleAutoMap = async () => {
    if (!currentSession) return
    setAutoMapping(true)
    try {
      const res = await fetch(`/api/import/${currentSession.id}/map`, {
        method: "POST",
      })
      if (res.ok) {
        const updated = await res.json()
        setCurrentSession(updated)
      }
    } catch {
      // silently handle
    } finally {
      setAutoMapping(false)
    }
  }

  const handleManualMap = async (lineId: string, categoryId: string) => {
    if (!currentSession) return
    try {
      const res = await fetch(`/api/import/${currentSession.id}/lines/${lineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      })
      if (res.ok) {
        setCurrentSession((prev) => {
          if (!prev || !prev.lines) return prev
          return {
            ...prev,
            lines: prev.lines.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    mappedCategoryId: categoryId,
                    mappedCategoryName:
                      categories.find((c) => c.id === categoryId)?.name || null,
                    status: "mapped" as const,
                  }
                : line
            ),
            mappedLines: prev.mappedLines + 1,
          }
        })
      }
    } catch {
      // silently handle
    }
  }

  const handleValidate = async () => {
    if (!currentSession) return
    setValidating(true)
    try {
      const res = await fetch(`/api/import/${currentSession.id}/validate`, {
        method: "POST",
      })
      if (res.ok) {
        const updated = await res.json()
        setCurrentSession(updated)
      }
    } catch {
      // silently handle
    } finally {
      setValidating(false)
    }
  }

  const viewSessionDetails = async (session: ImportSession) => {
    try {
      const res = await fetch(`/api/import/${session.id}`)
      if (res.ok) {
        const data = await res.json()
        setViewingSession(data)
        setCurrentSession(data)
        setActiveTab("import")
      }
    } catch {
      // silently handle
    }
  }

  const resetImport = () => {
    setFile(null)
    setCurrentSession(null)
    setViewingSession(null)
    setUploadProgress(0)
  }

  if (!selectedEntityId) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        <p>Veuillez sélectionner une entité.</p>
      </div>
    )
  }

  const mappingProgress = currentSession
    ? currentSession.totalLines > 0
      ? (currentSession.mappedLines / currentSession.totalLines) * 100
      : 0
    : 0

  const allMapped = currentSession
    ? currentSession.mappedLines === currentSession.totalLines
    : false

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import de données</h1>
        <p className="text-sm text-slate-500">
          Importez vos données comptables depuis Board.com ou Sage X3
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="import">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {!currentSession ? (
            <>
              {/* Source + Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Source des données</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>Fichier</Label>
                    <div
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
                        dragOver
                          ? "border-blue-400 bg-blue-50"
                          : file
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-300 hover:border-slate-400"
                      )}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOver(true)
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                        }}
                      />
                      {file ? (
                        <>
                          <FileSpreadsheet className="mb-2 h-10 w-10 text-emerald-500" />
                          <p className="font-medium text-emerald-700">{file.name}</p>
                          <p className="text-xs text-emerald-600">
                            {formatNumber(file.size / 1024)} Ko
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="mb-2 h-10 w-10 text-slate-400" />
                          <p className="font-medium text-slate-600">
                            Glissez un fichier ici ou cliquez pour parcourir
                          </p>
                          <p className="text-xs text-slate-400">
                            Formats acceptés : .xlsx, .xls
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {uploading && (
                    <Progress value={uploadProgress} className="w-full" />
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleUpload}
                      disabled={!file || uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Importer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Mapping View */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Mapping des lignes - {currentSession.fileName}
                      </CardTitle>
                      <CardDescription>
                        Source : {SOURCE_OPTIONS.find((s) => s.value === currentSession.source)?.label || currentSession.source}
                        {" | "}
                        {currentSession.mappedLines}/{currentSession.totalLines} lignes mappées
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={resetImport}>
                        Nouvel import
                      </Button>
                    </div>
                  </div>
                  <Progress value={mappingProgress} className="mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleAutoMap}
                      disabled={autoMapping || currentSession.status === "validated"}
                    >
                      {autoMapping ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Auto Map
                    </Button>
                    <Button
                      onClick={handleValidate}
                      disabled={
                        validating ||
                        !allMapped ||
                        currentSession.status === "validated"
                      }
                    >
                      {validating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Valider l&apos;import
                    </Button>
                    {currentSession.status === "validated" && (
                      <Badge variant="success" className="ml-2">
                        Import validé
                      </Badge>
                    )}
                  </div>

                  {/* Lines table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="min-w-[220px]">Catégorie de coût</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(currentSession.lines || []).map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="text-slate-500 text-xs">
                            {line.lineNumber}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {line.rawLabel}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatNumber(line.rawAmount, 2)}
                          </TableCell>
                          <TableCell>
                            {line.status === "mapped" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : line.status === "error" ? (
                              <div className="flex items-center gap-1">
                                <XCircle className="h-4 w-4 text-red-500" />
                                {line.errorMessage && (
                                  <span className="text-xs text-red-500">
                                    {line.errorMessage}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            {line.status === "mapped" ? (
                              <span className="text-sm text-emerald-700">
                                {line.mappedCategoryName}
                              </span>
                            ) : currentSession.status !== "validated" ? (
                              <Select
                                value={line.mappedCategoryId || ""}
                                onValueChange={(v) => handleManualMap(line.id, v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Assigner une catégorie..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      <span className="font-mono text-xs">{cat.code}</span>
                                      {" "}
                                      <ArrowRight className="inline h-3 w-3" />
                                      {" "}
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-slate-400">Non mappé</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des imports</CardTitle>
              <CardDescription>
                Liste des sessions d&apos;import précédentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <History className="mb-2 h-10 w-10" />
                  <p>Aucun import effectué</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Lignes</TableHead>
                      <TableHead className="text-right">Mappées</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => {
                      const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending
                      return (
                        <TableRow key={session.id}>
                          <TableCell className="text-sm">
                            {new Date(session.createdAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                              {session.fileName}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {SOURCE_OPTIONS.find((s) => s.value === session.source)?.label || session.source}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {session.totalLines}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {session.mappedLines}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewSessionDetails(session)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
