"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useAppStore } from "@/store/app-store"
import { cn, formatCurrency, formatNumber, getPeriodLabel } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  FileSpreadsheet,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  BarChart3,
} from "lucide-react"

type CostLine = {
  id: string
  product: string
  costCategory: string
  amount: number
  unitCost: number
  quantity: number
}

type ProductMargin = {
  product: string
  revenue: number
  totalProductionCost: number
  grossMargin: number
  commercialCosts: number
  contributionMargin: number
}

type WorkflowEvent = {
  id: string
  action: string
  performedBy: string
  performedAt: string
  reason: string | null
}

type CostSheet = {
  id: string
  period: string
  entityName: string
  costingMethod: string
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED"
  submittedBy: string | null
  validatedBy: string | null
  rejectionReason: string | null
  costLines: CostLine[]
  margins: ProductMargin[]
  workflow: WorkflowEvent[]
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

const WORKFLOW_STEPS: CostSheet["status"][] = ["DRAFT", "SUBMITTED", "VALIDATED"]

export default function CostSheetDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useAppStore()

  const [costSheet, setCostSheet] = useState<CostSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const fetchCostSheet = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cost-sheets/${id}`)
      if (!res.ok) throw new Error("Erreur chargement")
      const data = await res.json()
      setCostSheet(data)
    } catch {
      setCostSheet(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCostSheet()
  }, [fetchCostSheet])

  const performAction = async (action: string, reason?: string) => {
    setActionLoading(true)
    try {
      const body: Record<string, string> = { action }
      if (reason) body.rejectionReason = reason
      const res = await fetch(`/api/cost-sheets/${id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Erreur action")
      setRejectDialogOpen(false)
      setRejectionReason("")
      await fetchCostSheet()
    } catch {
      // error handled silently
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!costSheet) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <FileSpreadsheet className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Fiche de cout introuvable</p>
      </div>
    )
  }

  // Group cost lines by product
  const productGroups: Record<string, CostLine[]> = {}
  for (const line of costSheet.costLines) {
    if (!productGroups[line.product]) productGroups[line.product] = []
    productGroups[line.product].push(line)
  }
  const grandTotal = costSheet.costLines.reduce((sum, l) => sum + l.amount, 0)

  const currentStepIndex = WORKFLOW_STEPS.indexOf(
    costSheet.status === "REJECTED" ? "SUBMITTED" : costSheet.status
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fiche de cout</h1>
        <p className="text-slate-500">{getPeriodLabel(costSheet.period)}</p>
      </div>

      {/* Header info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-500">Entite</p>
              <p className="font-medium">{costSheet.entityName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Periode</p>
              <p className="font-medium">{getPeriodLabel(costSheet.period)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Methode</p>
              <p className="font-medium">{costSheet.costingMethod}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Statut</p>
              <Badge variant={STATUS_BADGE_MAP[costSheet.status]}>
                {STATUS_LABELS[costSheet.status]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">Ventilation des couts</TabsTrigger>
          <TabsTrigger value="margins">Marges</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        {/* Cost Breakdown Tab */}
        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventilation des couts par produit</CardTitle>
            </CardHeader>
            <CardContent>
              {costSheet.costLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileSpreadsheet className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucune ligne de cout</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categorie de cout</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-right">Cout unitaire</TableHead>
                        <TableHead className="text-right">Quantite</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(productGroups).map(([product, lines]) => {
                        const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
                        return (
                          <>{/* Fragment with key on first row */}
                            <TableRow key={`header-${product}`} className="bg-slate-50">
                              <TableCell colSpan={4} className="font-semibold text-slate-700">
                                {product}
                              </TableCell>
                            </TableRow>
                            {lines.map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className="pl-8">{line.costCategory}</TableCell>
                                <TableCell className="text-right">{formatCurrency(line.amount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(line.unitCost)}</TableCell>
                                <TableCell className="text-right">{formatNumber(line.quantity, 0)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow key={`subtotal-${product}`} className="border-t-2">
                              <TableCell className="pl-8 font-medium text-slate-600">
                                Sous-total {product}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(subtotal)}
                              </TableCell>
                              <TableCell />
                              <TableCell />
                            </TableRow>
                          </>
                        )
                      })}
                      <TableRow className="bg-slate-100 border-t-2">
                        <TableCell className="font-bold">Total general</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(grandTotal)}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Margins Tab */}
        <TabsContent value="margins">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analyse des marges par produit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {costSheet.margins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <BarChart3 className="h-10 w-10 mb-3" />
                  <p className="text-sm">Aucune donnee de marge disponible</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Chiffre d&apos;affaires</TableHead>
                        <TableHead className="text-right">Cout de production</TableHead>
                        <TableHead className="text-right">Marge brute</TableHead>
                        <TableHead className="text-right">Couts commerciaux</TableHead>
                        <TableHead className="text-right">Marge contributive</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costSheet.margins.map((m) => (
                        <TableRow key={m.product}>
                          <TableCell className="font-medium">{m.product}</TableCell>
                          <TableCell className="text-right">{formatCurrency(m.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(m.totalProductionCost)}</TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold",
                            m.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(m.grossMargin)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(m.commercialCosts)}</TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold",
                            m.contributionMargin >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(m.contributionMargin)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Simple bar chart visualization */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium text-slate-700">Comparaison des marges</h4>
                    {costSheet.margins.map((m) => {
                      const maxValue = Math.max(
                        ...costSheet.margins.map((x) => Math.max(Math.abs(x.grossMargin), Math.abs(x.contributionMargin)))
                      )
                      const grossWidth = maxValue > 0 ? (Math.abs(m.grossMargin) / maxValue) * 100 : 0
                      const contribWidth = maxValue > 0 ? (Math.abs(m.contributionMargin) / maxValue) * 100 : 0

                      return (
                        <div key={m.product} className="space-y-1">
                          <p className="text-sm font-medium">{m.product}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-24 shrink-0">Marge brute</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  m.grossMargin >= 0 ? "bg-emerald-500" : "bg-red-500"
                                )}
                                style={{ width: `${grossWidth}%` }}
                              />
                            </div>
                            <span className={cn(
                              "text-xs font-medium w-20 text-right",
                              m.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {formatCurrency(m.grossMargin)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-24 shrink-0">Marge contrib.</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  m.contributionMargin >= 0 ? "bg-blue-500" : "bg-red-500"
                                )}
                                style={{ width: `${contribWidth}%` }}
                              />
                            </div>
                            <span className={cn(
                              "text-xs font-medium w-20 text-right",
                              m.contributionMargin >= 0 ? "text-blue-600" : "text-red-600"
                            )}>
                              {formatCurrency(m.contributionMargin)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow de validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stepper */}
              <div className="flex items-center justify-center gap-2">
                {WORKFLOW_STEPS.map((step, index) => {
                  const isActive = index <= currentStepIndex
                  const isCurrent = step === costSheet.status
                  const isRejected = costSheet.status === "REJECTED" && step === "SUBMITTED"

                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                            isRejected
                              ? "border-red-500 bg-red-50"
                              : isActive
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 bg-white",
                            isCurrent && !isRejected && "ring-2 ring-emerald-200"
                          )}
                        >
                          {isRejected ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : step === "DRAFT" ? (
                            <Clock className="h-5 w-5 text-slate-500" />
                          ) : step === "SUBMITTED" ? (
                            <Send className="h-5 w-5 text-slate-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                        <span className={cn(
                          "text-xs mt-1",
                          isRejected ? "text-red-600 font-medium" :
                          isActive ? "text-emerald-600 font-medium" : "text-slate-400"
                        )}>
                          {isRejected ? "Rejete" : STATUS_LABELS[step]}
                        </span>
                      </div>
                      {index < WORKFLOW_STEPS.length - 1 && (
                        <ArrowRight className={cn(
                          "h-4 w-4 mb-5",
                          isActive && index < currentStepIndex ? "text-emerald-500" : "text-slate-300"
                        )} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Rejection reason */}
              {costSheet.status === "REJECTED" && costSheet.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Motif du rejet :</p>
                  <p className="text-sm text-red-700 mt-1">{costSheet.rejectionReason}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                {costSheet.status === "DRAFT" && user?.role === "FPA_ANALYST" && (
                  <Button
                    onClick={() => performAction("SUBMIT")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Soumettre pour validation
                  </Button>
                )}
                {costSheet.status === "SUBMITTED" && user?.role === "FPA_DIRECTOR" && (
                  <>
                    <Button
                      onClick={() => performAction("VALIDATE")}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Valider
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                  </>
                )}
              </div>

              {/* Workflow history */}
              {costSheet.workflow.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Historique</h4>
                  <div className="space-y-3">
                    {costSheet.workflow.map((event) => (
                      <div key={event.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-slate-700">
                            <span className="font-medium">{event.performedBy}</span>{" "}
                            — {event.action}
                          </p>
                          {event.reason && (
                            <p className="text-slate-500 mt-0.5">Raison : {event.reason}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(event.performedAt).toLocaleString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la fiche de cout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Motif du rejet</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Indiquez le motif du rejet..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => performAction("REJECT", rejectionReason)}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
