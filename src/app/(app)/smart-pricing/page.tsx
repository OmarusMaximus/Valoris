"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/store/app-store"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  BarChart3,
  Lightbulb,
  Activity,
  Star,
  AlertTriangle,
  CheckCircle,
  Target,
} from "lucide-react"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts"

// --- Types ---

type Article = {
  id: string
  name: string
  code: string
  currentPrice?: number
  currentCost?: number
  currentMargin?: number
  recentVolume?: number
}

type ElasticityData = {
  articleId: string
  articleName: string
  elasticity: number
  classification: "INELASTIC" | "MODERATELY_ELASTIC" | "ELASTIC"
  confidence: number
  dataPoints: Array<{ price: number; volume: number; period: string }>
  recommendation: string
}

type ScenarioInput = {
  id: string
  name: string
  type: "augmentation" | "reduction" | "promotion" | "gratuite"
  priceChange: number
  promotionDiscount: number
  promotionDuration: number
  gratuitySplit: string
  useElasticity: boolean
}

type SimulationResult = {
  scenarioName: string
  newPrice: number
  projectedVolume: number
  projectedRevenue: number
  projectedMargin: number
  marginChange: number
  revenueChange: number
  volumeChange: number
  isBest: boolean
}

type Recommendation = {
  articleId: string
  articleName: string
  currentPrice: number
  currentMargin: number
  type: "INCREASE" | "DECREASE" | "PROMOTE" | "MAINTAIN" | "REVIEW"
  priority: "HIGH" | "MEDIUM" | "LOW"
  action: string
  potentialImpact: string
  reasoning: string
}

// --- Constants ---

const SCENARIO_TYPES = [
  { value: "augmentation", label: "Augmentation de prix" },
  { value: "reduction", label: "Reduction de prix" },
  { value: "promotion", label: "Promotion temporaire" },
  { value: "gratuite", label: "Gratuite (offre speciale)" },
]

const CLASSIFICATION_CONFIG: Record<
  ElasticityData["classification"],
  { label: string; variant: "success" | "warning" | "destructive"; description: string }
> = {
  INELASTIC: {
    label: "Inelastique",
    variant: "success",
    description:
      "La demande est peu sensible aux variations de prix. Une augmentation moderee du prix n'entrainera qu'une faible baisse du volume vendu.",
  },
  MODERATELY_ELASTIC: {
    label: "Moderement elastique",
    variant: "warning",
    description:
      "La demande reagit de maniere proportionnelle aux variations de prix. Toute modification de prix doit etre evaluee avec soin.",
  },
  ELASTIC: {
    label: "Elastique",
    variant: "destructive",
    description:
      "La demande est tres sensible aux variations de prix. Une augmentation de prix risque d'entrainer une forte baisse des volumes.",
  },
}

const RECOMMENDATION_TYPE_CONFIG: Record<
  Recommendation["type"],
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "default" }
> = {
  INCREASE: { label: "Augmenter", variant: "success" },
  DECREASE: { label: "Reduire", variant: "warning" },
  PROMOTE: { label: "Promouvoir", variant: "default" },
  MAINTAIN: { label: "Maintenir", variant: "secondary" },
  REVIEW: { label: "A revoir", variant: "destructive" },
}

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

// --- Component ---

export default function SmartPricingPage() {
  const { selectedEntityId } = useAppStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Smart Pricing</h1>
        <p className="text-slate-500">
          Analyse d&apos;elasticite, simulation de prix et recommandations tarifaires
        </p>
      </div>

      <Tabs defaultValue="elasticity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="elasticity" className="gap-2">
            <Activity className="h-4 w-4" />
            Analyse de la sensibilite prix
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Simulateur de prix
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommandations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elasticity">
          <ElasticityTab />
        </TabsContent>
        <TabsContent value="simulator">
          <SimulatorTab />
        </TabsContent>
        <TabsContent value="recommendations">
          <RecommendationsTab entityId={selectedEntityId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// --- Tab 1: Elasticity Analysis ---

function ElasticityTab() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState<string>("")
  const [elasticity, setElasticity] = useState<ElasticityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingArticles, setLoadingArticles] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      setLoadingArticles(true)
      try {
        const res = await fetch("/api/articles")
        if (res.ok) {
          const data = await res.json()
          setArticles(data)
        }
      } catch {
        // ignore
      } finally {
        setLoadingArticles(false)
      }
    }
    fetchArticles()
  }, [])

  const fetchElasticity = useCallback(async (articleId: string) => {
    if (!articleId) return
    setLoading(true)
    setElasticity(null)
    try {
      const res = await fetch(`/api/smart-pricing/elasticity?articleId=${articleId}`)
      if (res.ok) {
        const data = await res.json()
        setElasticity(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const handleArticleChange = (value: string) => {
    setSelectedArticleId(value)
    fetchElasticity(value)
  }

  const config = elasticity ? CLASSIFICATION_CONFIG[elasticity.classification] : null

  return (
    <div className="space-y-6">
      {/* Article selector */}
      <Card>
        <CardHeader>
          <CardTitle>Selectionner un article</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select value={selectedArticleId} onValueChange={handleArticleChange} disabled={loadingArticles}>
              <SelectTrigger>
                <SelectValue placeholder={loadingArticles ? "Chargement..." : "Choisir un article"} />
              </SelectTrigger>
              <SelectContent>
                {articles.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {elasticity && config && (
        <>
          {/* Elasticity result */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Elasticite-prix</p>
                  <p className="text-5xl font-bold tracking-tight">
                    {formatNumber(Math.abs(elasticity.elasticity), 2)}
                  </p>
                  <div className="mt-3">
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Indice de confiance</p>
                  <p className="text-3xl font-bold">{formatPercent(elasticity.confidence)}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Base sur {elasticity.dataPoints.length} points de donnees
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium mb-1">Recommandation</p>
                    <p className="text-sm text-slate-600">{elasticity.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{config.description}</p>
              <p className="text-sm text-slate-600 mt-2">
                Concretement, pour chaque augmentation de <strong>1%</strong> du prix,
                le volume vendu {elasticity.elasticity < 0 ? "diminue" : "augmente"} d&apos;environ{" "}
                <strong>{formatNumber(Math.abs(elasticity.elasticity), 2)}%</strong>.
              </p>
            </CardContent>
          </Card>

          {/* Scatter chart */}
          {elasticity.dataPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prix vs Volume (historique)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="price"
                        type="number"
                        name="Prix"
                        label={{ value: "Prix", position: "insideBottom", offset: -10 }}
                      />
                      <YAxis
                        dataKey="volume"
                        type="number"
                        name="Volume"
                        label={{ value: "Volume", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ payload }) => {
                          if (!payload || payload.length === 0) return null
                          const d = payload[0].payload as ElasticityData["dataPoints"][0]
                          return (
                            <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
                              <p className="font-medium">{d.period}</p>
                              <p>Prix: {formatNumber(d.price)}</p>
                              <p>Volume: {formatNumber(d.volume, 0)}</p>
                            </div>
                          )
                        }}
                      />
                      <Scatter data={elasticity.dataPoints} fill="#3b82f6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data table */}
          {elasticity.dataPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donnees historiques</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elasticity.dataPoints.map((dp, i) => (
                      <TableRow key={i}>
                        <TableCell>{dp.period}</TableCell>
                        <TableCell className="text-right">{formatNumber(dp.price)}</TableCell>
                        <TableCell className="text-right">{formatNumber(dp.volume, 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !elasticity && selectedArticleId && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            Aucune donnee d&apos;elasticite disponible pour cet article.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Tab 2: Price Simulator ---

function SimulatorTab() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState<string>("")
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioInput[]>([])
  const [results, setResults] = useState<SimulationResult[]>([])
  const [simulating, setSimulating] = useState(false)
  const [loadingArticles, setLoadingArticles] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      setLoadingArticles(true)
      try {
        const res = await fetch("/api/articles")
        if (res.ok) {
          const data = await res.json()
          setArticles(data)
        }
      } catch {
        // ignore
      } finally {
        setLoadingArticles(false)
      }
    }
    fetchArticles()
  }, [])

  const handleArticleChange = (value: string) => {
    setSelectedArticleId(value)
    const article = articles.find((a) => a.id === value) || null
    setSelectedArticle(article)
    setResults([])
  }

  const addScenario = () => {
    const newScenario: ScenarioInput = {
      id: crypto.randomUUID(),
      name: `Scenario ${scenarios.length + 1}`,
      type: "augmentation",
      priceChange: 5,
      promotionDiscount: 0,
      promotionDuration: 1,
      gratuitySplit: "10+1",
      useElasticity: true,
    }
    setScenarios((prev) => [...prev, newScenario])
  }

  const removeScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id))
  }

  const updateScenario = (id: string, field: keyof ScenarioInput, value: string | number | boolean) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const runSimulation = async () => {
    if (!selectedArticleId || scenarios.length === 0) return
    setSimulating(true)
    setResults([])
    try {
      const res = await fetch("/api/smart-pricing/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: selectedArticleId,
          scenarios: scenarios.map((s) => ({
            name: s.name,
            type: s.type,
            priceChange: s.priceChange,
            promotionDiscount: s.promotionDiscount,
            promotionDuration: s.promotionDuration,
            gratuitySplit: s.gratuitySplit,
            useElasticity: s.useElasticity,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResults(Array.isArray(data) ? data : data.results || [])
      }
    } catch {
      // ignore
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Article selector */}
      <Card>
        <CardHeader>
          <CardTitle>Selectionner un article</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select value={selectedArticleId} onValueChange={handleArticleChange} disabled={loadingArticles}>
              <SelectTrigger>
                <SelectValue placeholder={loadingArticles ? "Chargement..." : "Choisir un article"} />
              </SelectTrigger>
              <SelectContent>
                {articles.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Current pricing info */}
      {selectedArticle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarification actuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">Prix actuel</p>
                <p className="text-lg font-semibold">
                  {selectedArticle.currentPrice != null
                    ? formatCurrency(selectedArticle.currentPrice)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Cout de revient</p>
                <p className="text-lg font-semibold">
                  {selectedArticle.currentCost != null
                    ? formatCurrency(selectedArticle.currentCost)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Marge</p>
                <p className="text-lg font-semibold">
                  {selectedArticle.currentMargin != null
                    ? formatPercent(selectedArticle.currentMargin / 100)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Volume recent</p>
                <p className="text-lg font-semibold">
                  {selectedArticle.recentVolume != null
                    ? formatNumber(selectedArticle.recentVolume, 0)
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario builder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Scenarios de simulation</CardTitle>
          <Button onClick={addScenario} size="sm" variant="outline" className="gap-1">
            <Plus className="h-4 w-4" />
            Ajouter un scenario
          </Button>
        </CardHeader>
        <CardContent>
          {scenarios.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Aucun scenario. Cliquez sur &quot;Ajouter un scenario&quot; pour commencer.
            </p>
          ) : (
            <div className="space-y-4">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Input
                      className="max-w-xs font-medium"
                      value={scenario.name}
                      onChange={(e) =>
                        updateScenario(scenario.id, "name", e.target.value)
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeScenario(scenario.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={scenario.type}
                        onValueChange={(v) =>
                          updateScenario(
                            scenario.id,
                            "type",
                            v as ScenarioInput["type"]
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCENARIO_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(scenario.type === "augmentation" || scenario.type === "reduction") && (
                      <div className="space-y-1">
                        <Label className="text-xs">Variation (%)</Label>
                        <Input
                          type="number"
                          value={scenario.priceChange}
                          onChange={(e) =>
                            updateScenario(
                              scenario.id,
                              "priceChange",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    )}

                    {scenario.type === "promotion" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Remise (%)</Label>
                          <Input
                            type="number"
                            value={scenario.promotionDiscount}
                            onChange={(e) =>
                              updateScenario(
                                scenario.id,
                                "promotionDiscount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duree (mois)</Label>
                          <Input
                            type="number"
                            value={scenario.promotionDuration}
                            onChange={(e) =>
                              updateScenario(
                                scenario.id,
                                "promotionDuration",
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    {scenario.type === "gratuite" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Format (ex: 10+1)</Label>
                        <Input
                          value={scenario.gratuitySplit}
                          onChange={(e) =>
                            updateScenario(
                              scenario.id,
                              "gratuitySplit",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs">Utiliser elasticite</Label>
                      <div className="pt-1">
                        <Button
                          type="button"
                          variant={scenario.useElasticity ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            updateScenario(
                              scenario.id,
                              "useElasticity",
                              !scenario.useElasticity
                            )
                          }
                        >
                          {scenario.useElasticity ? "Oui" : "Non"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={runSimulation}
                disabled={simulating || !selectedArticleId}
                className="gap-2"
              >
                {simulating && <Loader2 className="h-4 w-4 animate-spin" />}
                Simuler
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Comparison cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => (
              <Card
                key={i}
                className={r.isBest ? "ring-2 ring-emerald-500" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{r.scenarioName}</CardTitle>
                    {r.isBest && (
                      <Badge variant="success" className="gap-1">
                        <Star className="h-3 w-3" />
                        Meilleur
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Nouveau prix</span>
                    <span className="font-medium">{formatCurrency(r.newPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Volume projete</span>
                    <span className="font-medium">{formatNumber(r.projectedVolume, 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">CA projete</span>
                    <span className="font-medium">{formatCurrency(r.projectedRevenue)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Marge projetee</span>
                    <span className="font-bold">{formatCurrency(r.projectedMargin)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={r.marginChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {r.marginChange >= 0 ? (
                        <TrendingUp className="inline h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="inline h-3 w-3 mr-0.5" />
                      )}
                      Marge {r.marginChange >= 0 ? "+" : ""}{formatNumber(r.marginChange, 1)}%
                    </span>
                    <span className={r.revenueChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                      CA {r.revenueChange >= 0 ? "+" : ""}{formatNumber(r.revenueChange, 1)}%
                    </span>
                    <span className={r.volumeChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                      Vol {r.volumeChange >= 0 ? "+" : ""}{formatNumber(r.volumeChange, 1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparaison des marges projetees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={results.map((r) => ({
                      name: r.scenarioName,
                      margin: r.projectedMargin,
                      revenue: r.projectedRevenue,
                      isBest: r.isBest,
                    }))}
                    margin={{ top: 5, right: 30, bottom: 5, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="margin" name="Marge" radius={[4, 4, 0, 0]}>
                      {results.map((r, i) => (
                        <Cell
                          key={i}
                          fill={r.isBest ? "#10b981" : CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="revenue" name="Chiffre d'affaires" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// --- Tab 3: Recommendations ---

function RecommendationsTab({ entityId }: { entityId: string | null }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true)
      try {
        const params = entityId ? `?entityId=${entityId}` : ""
        const res = await fetch(`/api/smart-pricing/recommendations${params}`)
        if (res.ok) {
          const data = await res.json()
          setRecommendations(
            (Array.isArray(data) ? data : []).sort(
              (a: Recommendation, b: Recommendation) =>
                (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
            )
          )
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchRecommendations()
  }, [entityId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const priorityIcon = (p: string) => {
    if (p === "HIGH") return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (p === "MEDIUM") return <Activity className="h-4 w-4 text-amber-500" />
    return <CheckCircle className="h-4 w-4 text-slate-400" />
  }

  return (
    <div className="space-y-6">
      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            Aucune recommandation disponible pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((rec, i) => {
            const typeConfig = RECOMMENDATION_TYPE_CONFIG[rec.type]
            return (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {priorityIcon(rec.priority)}
                      <CardTitle className="text-base">{rec.articleName}</CardTitle>
                    </div>
                    <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-slate-500">Prix actuel: </span>
                      <span className="font-medium">{formatCurrency(rec.currentPrice)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Marge: </span>
                      <span className="font-medium">{formatPercent(rec.currentMargin / 100)}</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-700">{rec.action}</p>
                    {rec.reasoning && (
                      <p className="text-xs text-slate-500 mt-1">{rec.reasoning}</p>
                    )}
                  </div>
                  {rec.potentialImpact && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-slate-600">Impact potentiel: {rec.potentialImpact}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Best practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Bonnes pratiques tarifaires - Secteur engrais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Segmenter par canal de distribution</strong> : les prix doivent refleter
                la valeur percue et les couts de service de chaque canal (direct, grossiste, cooperative).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Saisonnalite des campagnes agricoles</strong> : ajuster les prix en fonction
                du calendrier cultural. Les periodes de forte demande (debut de campagne) tolerent
                mieux les hausses de prix.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Privilegier les gratuites aux remises</strong> : dans le secteur engrais,
                les offres &quot;X+Y gratuit&quot; sont generalement plus efficaces que les baisses de
                prix directes pour stimuler le volume sans eroder la valeur de marque.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Surveiller les couts matieres premieres</strong> : les prix des intrants
                (phosphates, potasse, azote) sont volatils. Revisez vos prix de vente trimestriellement
                pour maintenir vos marges cibles.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Differencier produits composes vs biostimulants</strong> : les biostimulants
                et produits de biocontrole ont une elasticite-prix plus faible que les engrais
                mineraux classiques, permettant une meilleure valorisation.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Tester avant de generaliser</strong> : utilisez le simulateur pour valider
                l&apos;impact sur une entite pilote avant de deployer une nouvelle politique tarifaire
                sur l&apos;ensemble du groupe.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
