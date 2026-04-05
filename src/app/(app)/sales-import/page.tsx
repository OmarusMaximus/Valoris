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
  Plus,
  Package,
  Users,
  UserCheck,
} from "lucide-react"

type EntityOption = { id: string; code: string; name: string }

type ScanResult = {
  totalRows: number
  unknownArticles: Array<{ code: string; name: string }>
  unknownCustomers: Array<{ code: string; name: string; type: string }>
  unknownSalesReps: Array<{ code: string; name: string }>
  hasUnknowns: boolean
} | null

type ImportResult = {
  imported: number
  skipped: number
  errors: string[]
} | null

type ImportStep = "upload" | "review" | "done"

export default function SalesImportPage() {
  const { selectedEntityId } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [entityId, setEntityId] = useState(selectedEntityId || "")
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [step, setStep] = useState<ImportStep>("upload")
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult>(null)

  // Checkboxes for which unknowns to create
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [selectedReps, setSelectedReps] = useState<Set<string>>(new Set())

  // Editable names
  const [articleNames, setArticleNames] = useState<Record<string, string>>({})
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({})
  const [customerTypes, setCustomerTypes] = useState<Record<string, string>>({})
  const [repNames, setRepNames] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/entities").then(r => r.json()).then(setEntities).catch(() => {})
  }, [])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setScanResult(null)
    setImportResult(null)
    setStep("upload")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // Step 1: Scan file for unknowns
  const handleScan = async () => {
    if (!selectedFile || !entityId) return
    setScanning(true)
    setScanResult(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("entityId", entityId)
      formData.append("mode", "scan")
      const res = await fetch("/api/sales-import", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        setScanResult(data)
        // Pre-select all unknowns
        setSelectedArticles(new Set(data.unknownArticles.map((a: { code: string }) => a.code)))
        setSelectedCustomers(new Set(data.unknownCustomers.map((c: { code: string }) => c.code)))
        setSelectedReps(new Set(data.unknownSalesReps.map((r: { code: string }) => r.code)))
        // Pre-fill names
        const an: Record<string, string> = {}
        data.unknownArticles.forEach((a: { code: string; name: string }) => { an[a.code] = a.name })
        setArticleNames(an)
        const cn: Record<string, string> = {}
        const ct: Record<string, string> = {}
        data.unknownCustomers.forEach((c: { code: string; name: string; type: string }) => {
          cn[c.code] = c.name
          ct[c.code] = c.type || "DIRECT"
        })
        setCustomerNames(cn)
        setCustomerTypes(ct)
        const rn: Record<string, string> = {}
        data.unknownSalesReps.forEach((r: { code: string; name: string }) => { rn[r.code] = r.name })
        setRepNames(rn)

        if (data.hasUnknowns) {
          setStep("review")
        } else {
          // No unknowns, proceed directly to import
          await doImport()
        }
      }
    } catch {
      setScanResult(null)
    } finally {
      setScanning(false)
    }
  }

  // Step 2: Create selected unknowns then import
  const handleCreateAndImport = async () => {
    setCreating(true)
    try {
      // Create selected unknowns
      const articles = Array.from(selectedArticles).map(code => ({
        code,
        name: articleNames[code] || code,
      }))
      const customers = Array.from(selectedCustomers).map(code => ({
        code,
        name: customerNames[code] || code,
        type: customerTypes[code] || "DIRECT",
      }))
      const salesReps = Array.from(selectedReps).map(code => ({
        code,
        name: repNames[code] || code,
      }))

      if (articles.length > 0 || customers.length > 0 || salesReps.length > 0) {
        await fetch("/api/sales-import/create-unknowns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId, articles, customers, salesReps }),
        })
      }
    } catch { /* continue to import anyway */ }
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
      const res = await fetch("/api/sales-import", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        setImportResult({ imported: data.imported || 0, skipped: data.skipped || 0, errors: data.errors || [] })
      } else {
        const err = await res.json().catch(() => ({}))
        setImportResult({ imported: 0, skipped: 0, errors: [err.error || `Erreur serveur (${res.status})`] })
      }
      setStep("done")
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Erreur de connexion"] })
      setStep("done")
    } finally {
      setImporting(false)
    }
  }, [selectedFile, entityId])

  const toggleArticle = (code: string) => {
    setSelectedArticles(prev => { const n = new Set(prev); if (n.has(code)) { n.delete(code) } else { n.add(code) } return n })
  }
  const toggleCustomer = (code: string) => {
    setSelectedCustomers(prev => { const n = new Set(prev); if (n.has(code)) { n.delete(code) } else { n.add(code) } return n })
  }
  const toggleRep = (code: string) => {
    setSelectedReps(prev => { const n = new Set(prev); if (n.has(code)) { n.delete(code) } else { n.add(code) } return n })
  }

  const reset = () => {
    setSelectedFile(null)
    setScanResult(null)
    setImportResult(null)
    setStep("upload")
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import des ventes</h1>
        <p className="text-sm text-slate-500">
          Importez l&apos;historique de ventes par article, client et commercial
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {[
          { key: "upload", label: "1. Fichier" },
          { key: "review", label: "2. Vérification" },
          { key: "done", label: "3. Import" },
        ].map((s) => (
          <div key={s.key} className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            step === s.key ? "bg-slate-900 text-white" :
            (s.key === "upload" || (s.key === "review" && (step === "done")) || (s.key === "done" && step === "done"))
              ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
          )}>
            {s.label}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fichier de ventes</CardTitle>
                <CardDescription>
                  L&apos;outil detectera automatiquement les nouveaux articles, clients et commerciaux
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
                      {entities.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.code} - {e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
                    dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
                  )}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className={cn("mb-3 h-10 w-10", dragging ? "text-blue-500" : "text-slate-400")} />
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    {selectedFile ? selectedFile.name : "Glissez un fichier ici ou cliquez pour parcourir"}
                  </p>
                  <p className="text-xs text-slate-500">Formats : .xlsx, .xls</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                  />
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} Ko</p>
                      </div>
                    </div>
                    <Button onClick={handleScan} disabled={scanning || !entityId}>
                      {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
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
                Colonnes attendues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {[
                ["Date", "Date de vente (ex: 15/03/2026, 2026-03-15)"],
                ["Période / Period", "Alternative a la date : YYYY-MM (ex: 2026-03)"],
                ["Code Article", "Code unique de l'article"],
                ["Nom Article", "Nom (pour les nouveaux articles)"],
                ["Code Client", "Code du client (optionnel)"],
                ["Nom Client", "Nom (pour les nouveaux clients)"],
                ["Type Client", "Optionnel : COOPERATIVE / DISTRIBUTEUR / DIRECT / EXPORT"],
                ["Code Commercial", "Code du commercial (optionnel)"],
                ["Nom Commercial", "Nom (pour les nouveaux commerciaux)"],
                ["CA / Revenue", "Chiffre d'affaires"],
                ["Quantite / Qty", "Quantite vendue"],
                ["Prix unitaire", "Optionnel (calcule si absent)"],
                ["Cout variable", "Cout variable unitaire (optionnel)"],
              ].map(([col, desc]) => (
                <div key={col}>
                  <span className="font-mono font-medium text-slate-800">{col}</span>
                  <p className="text-slate-500">{desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Review unknowns */}
      {step === "review" && scanResult && (
        <div className="space-y-4">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  {scanResult.totalRows} lignes analysees —
                  {scanResult.unknownArticles.length + scanResult.unknownCustomers.length + scanResult.unknownSalesReps.length} elements inconnus detectes
                </p>
                <p className="text-xs text-amber-700">
                  Cochez les elements a ajouter a la base, modifiez les noms si besoin, puis lancez l&apos;import.
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
                <CardDescription>Ces codes articles n&apos;existent pas dans la base</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedArticles.size === scanResult.unknownArticles.length}
                          onChange={() => {
                            if (selectedArticles.size === scanResult.unknownArticles.length) {
                              setSelectedArticles(new Set())
                            } else {
                              setSelectedArticles(new Set(scanResult.unknownArticles.map(a => a.code)))
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
                    {scanResult.unknownArticles.map(art => (
                      <TableRow key={art.code}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedArticles.has(art.code)}
                            onChange={() => toggleArticle(art.code)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell><Badge variant="outline">{art.code}</Badge></TableCell>
                        <TableCell>
                          <Input
                            value={articleNames[art.code] || ""}
                            onChange={e => setArticleNames(prev => ({ ...prev, [art.code]: e.target.value }))}
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
                <CardDescription>Ces codes clients n&apos;existent pas dans la base</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.size === scanResult.unknownCustomers.length}
                          onChange={() => {
                            if (selectedCustomers.size === scanResult.unknownCustomers.length) {
                              setSelectedCustomers(new Set())
                            } else {
                              setSelectedCustomers(new Set(scanResult.unknownCustomers.map(c => c.code)))
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
                    {scanResult.unknownCustomers.map(cust => (
                      <TableRow key={cust.code}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedCustomers.has(cust.code)}
                            onChange={() => toggleCustomer(cust.code)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell><Badge variant="outline">{cust.code}</Badge></TableCell>
                        <TableCell>
                          <Input
                            value={customerNames[cust.code] || ""}
                            onChange={e => setCustomerNames(prev => ({ ...prev, [cust.code]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={customerTypes[cust.code] || ""} onValueChange={v => setCustomerTypes(prev => ({ ...prev, [cust.code]: v }))}>
                            <SelectTrigger className="h-8 text-sm w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Non specifie</SelectItem>
                              <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
                              <SelectItem value="DISTRIBUTEUR">Distributeur</SelectItem>
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
                  Nouveaux commerciaux ({scanResult.unknownSalesReps.length})
                </CardTitle>
                <CardDescription>Ces codes commerciaux n&apos;existent pas dans la base</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedReps.size === scanResult.unknownSalesReps.length}
                          onChange={() => {
                            if (selectedReps.size === scanResult.unknownSalesReps.length) {
                              setSelectedReps(new Set())
                            } else {
                              setSelectedReps(new Set(scanResult.unknownSalesReps.map(r => r.code)))
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
                    {scanResult.unknownSalesReps.map(rep => (
                      <TableRow key={rep.code}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedReps.has(rep.code)}
                            onChange={() => toggleRep(rep.code)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell><Badge variant="outline">{rep.code}</Badge></TableCell>
                        <TableCell>
                          <Input
                            value={repNames[rep.code] || ""}
                            onChange={e => setRepNames(prev => ({ ...prev, [rep.code]: e.target.value }))}
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
            <Button variant="outline" onClick={() => setStep("upload")}>
              Retour
            </Button>
            <Button onClick={handleCreateAndImport} disabled={creating || importing}>
              {(creating || importing) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {creating ? "Creation en cours..." : importing ? "Import en cours..." : `Creer (${selectedArticles.size + selectedCustomers.size + selectedReps.size}) et importer`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resultat de l&apos;import</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{importResult.imported}</p>
                    <p className="text-xs text-emerald-600">Lignes importees</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{importResult.skipped}</p>
                    <p className="text-xs text-amber-600">Lignes ignorees</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{importResult.errors.length}</p>
                    <p className="text-xs text-red-600">Erreurs</p>
                  </div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 max-h-48 overflow-y-auto">
                  <h4 className="mb-2 text-sm font-semibold text-red-800">Detail des erreurs</h4>
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
