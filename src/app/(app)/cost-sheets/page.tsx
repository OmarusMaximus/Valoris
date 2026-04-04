"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/app-store"
import { getPeriodLabel } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Plus,
  Loader2,
  FileSpreadsheet,
} from "lucide-react"

type CostSheet = {
  id: string
  period: string
  entityName: string
  costingMethod: string
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED"
  submittedBy: string | null
  validatedBy: string | null
  createdAt: string
}

const STATUS_BADGE_MAP: Record<CostSheet["status"], "secondary" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary",
  SUBMITTED: "warning",
  VALIDATED: "success",
  REJECTED: "destructive",
}

const STATUS_LABELS: Record<CostSheet["status"], string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Valide",
  REJECTED: "Rejete",
}

export default function CostSheetsPage() {
  const router = useRouter()
  const { selectedEntityId, selectedPeriod } = useAppStore()

  const [costSheets, setCostSheets] = useState<CostSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const fetchCostSheets = useCallback(async () => {
    if (!selectedEntityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("entityId", selectedEntityId)
      params.set("period", selectedPeriod)
      const res = await fetch(`/api/cost-sheets?${params.toString()}`)
      if (!res.ok) throw new Error("Erreur chargement")
      const data = await res.json()
      setCostSheets(data)
    } catch {
      setCostSheets([])
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedPeriod])

  useEffect(() => {
    fetchCostSheets()
  }, [fetchCostSheets])

  const createCostSheet = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/cost-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selectedEntityId,
          period: selectedPeriod,
        }),
      })
      if (!res.ok) throw new Error("Erreur creation")
      const created = await res.json()
      router.push(`/cost-sheets/${created.id}`)
    } catch {
      // error handled silently
    } finally {
      setCreating(false)
    }
  }

  const filtered = statusFilter === "ALL"
    ? costSheets
    : costSheets.filter((cs) => cs.status === statusFilter)

  if (!selectedEntityId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <FileSpreadsheet className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">
          Veuillez selectionner une entite pour afficher les fiches de couts
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fiches de couts</h1>
          <p className="text-slate-500">{getPeriodLabel(selectedPeriod)}</p>
        </div>
        <Button onClick={createCostSheet} disabled={creating}>
          {creating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Nouvelle fiche de cout
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Fiches de couts</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value="DRAFT">Brouillon</SelectItem>
              <SelectItem value="SUBMITTED">Soumis</SelectItem>
              <SelectItem value="VALIDATED">Valide</SelectItem>
              <SelectItem value="REJECTED">Rejete</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FileSpreadsheet className="h-10 w-10 mb-3" />
              <p className="text-sm">Aucune fiche de cout pour cette periode</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Entite</TableHead>
                  <TableHead>Methode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Soumis par</TableHead>
                  <TableHead>Valide par</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cs) => (
                  <TableRow
                    key={cs.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/cost-sheets/${cs.id}`)}
                  >
                    <TableCell className="font-medium">{getPeriodLabel(cs.period)}</TableCell>
                    <TableCell>{cs.entityName}</TableCell>
                    <TableCell>{cs.costingMethod}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_MAP[cs.status]}>
                        {STATUS_LABELS[cs.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{cs.submittedBy ?? "-"}</TableCell>
                    <TableCell>{cs.validatedBy ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/cost-sheets/${cs.id}`)
                        }}
                      >
                        Ouvrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
