"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  BookOpen,
  Workflow,
  Rocket,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Factory,
  Upload,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Bell,
  Shield,
  Leaf,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

type UserInfo = {
  id: string
  email: string
  role: string
  entityId: string | null
  firstName: string
  lastName: string
}

const TOTAL_STEPS = 5

const roleDescriptions: Record<string, string> = {
  ADMIN: "Vous avez acces a toute la configuration systeme",
  FPA_DIRECTOR: "Vous validez les feuilles de costing et definissez la methode de costing",
  FPA_ANALYST: "Vous importez les donnees comptables, effectuez les reaffectations et calculez les couts",
  PRODUCTION_MANAGER: "Vous saisissez les donnees de production mensuelle",
  SUPPLY_MANAGER: "Vous saisissez les prix et volumes des matieres premieres",
  SUBSIDIARY_MANAGER: "Vous recevez les notifications de validation des feuilles de costing",
  LOCAL_FINANCE_MANAGER: "Vous recevez les notifications de validation des feuilles de costing",
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrateur",
  FPA_DIRECTOR: "Directeur FP&A",
  FPA_ANALYST: "Analyste FP&A",
  PRODUCTION_MANAGER: "Responsable Production",
  SUPPLY_MANAGER: "Responsable Approvisionnement",
  SUBSIDIARY_MANAGER: "Directeur General",
  LOCAL_FINANCE_MANAGER: "Responsable Finance Local",
}

const roleIcons: Record<string, React.ElementType> = {
  ADMIN: Shield,
  FPA_DIRECTOR: BarChart3,
  FPA_ANALYST: FileSpreadsheet,
  PRODUCTION_MANAGER: Factory,
  SUPPLY_MANAGER: Leaf,
  SUBSIDIARY_MANAGER: User,
  LOCAL_FINANCE_MANAGER: User,
}

const concepts = [
  {
    title: "Cycle de production long",
    description: "Le compostage prend 3-6 mois. Le rendement est calcule sur le cycle complet.",
    icon: Factory,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    iconColor: "text-amber-600",
  },
  {
    title: "Rendement",
    description: "Ratio produit fini / matiere premiere consommee (ex: 0.85 = 85%)",
    icon: BarChart3,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-600",
  },
  {
    title: "PSF (En-cours)",
    description: "Produits semi-finis valorises au cout MP + % avancement transformation",
    icon: Leaf,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    title: "Marge de contribution",
    description: "Inclut couts commerciaux + couts production variables",
    icon: FileSpreadsheet,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
  },
  {
    title: "Methode de costing",
    description: "CUMP (par defaut), FIFO ou Standard",
    icon: Settings,
    color: "bg-slate-50 text-slate-700 border-slate-200",
    iconColor: "text-slate-600",
  },
]

const workflowSteps = [
  {
    step: 1,
    title: "Saisie production",
    roles: ["PRODUCTION_MANAGER", "SUPPLY_MANAGER"],
    icon: Factory,
  },
  {
    step: 2,
    title: "Import comptable",
    roles: ["FPA_ANALYST"],
    icon: Upload,
  },
  {
    step: 3,
    title: "Reaffectations analytiques",
    roles: ["FPA_ANALYST"],
    icon: FileSpreadsheet,
  },
  {
    step: 4,
    title: "Valorisation stocks",
    roles: ["FPA_ANALYST"],
    icon: BarChart3,
  },
  {
    step: 5,
    title: "Calcul couts de revient",
    roles: ["FPA_ANALYST"],
    icon: Rocket,
  },
  {
    step: 6,
    title: "Workflow validation",
    roles: ["FPA_ANALYST", "FPA_DIRECTOR"],
    icon: CheckCircle2,
  },
]

type ActionCard = {
  label: string
  href: string
  icon: React.ElementType
  description: string
}

function getActionsForRole(role: string): ActionCard[] {
  switch (role) {
    case "PRODUCTION_MANAGER":
    case "SUPPLY_MANAGER":
      return [
        { label: "Saisir les donnees de production", href: "/production", icon: Factory, description: "Enregistrez les volumes et donnees de production mensuelles" },
        { label: "Consulter le catalogue produits", href: "/products", icon: Leaf, description: "Parcourez les produits et leurs nomenclatures" },
      ]
    case "FPA_ANALYST":
      return [
        { label: "Importer des donnees comptables", href: "/import", icon: Upload, description: "Importez les donnees du P&L depuis Board.com ou Sage X3" },
        { label: "Creer une feuille de costing", href: "/cost-sheets", icon: FileSpreadsheet, description: "Calculez et soumettez les couts de revient" },
        { label: "Consulter le tableau de bord", href: "/", icon: BarChart3, description: "Vue d'ensemble des indicateurs cles" },
      ]
    case "FPA_DIRECTOR":
      return [
        { label: "Configurer l'environnement", href: "/setup", icon: Settings, description: "Parametrez les entites, categories et methodes" },
        { label: "Consulter le tableau de bord", href: "/", icon: BarChart3, description: "Vue d'ensemble et suivi des validations" },
        { label: "Definir la methode de costing", href: "/settings", icon: Settings, description: "Choisissez entre CUMP, FIFO ou Standard" },
      ]
    case "ADMIN":
      return [
        { label: "Configurer l'environnement metier", href: "/setup", icon: Settings, description: "Parametrage initial des donnees de reference" },
        { label: "Gerer les parametres", href: "/settings", icon: Shield, description: "Configuration systeme et administration" },
      ]
    case "SUBSIDIARY_MANAGER":
    case "LOCAL_FINANCE_MANAGER":
      return [
        { label: "Consulter le tableau de bord", href: "/", icon: BarChart3, description: "Vue d'ensemble des indicateurs cles" },
        { label: "Voir les notifications", href: "/notifications", icon: Bell, description: "Suivez les validations de feuilles de costing" },
      ]
    default:
      return [
        { label: "Consulter le tableau de bord", href: "/", icon: BarChart3, description: "Vue d'ensemble des indicateurs cles" },
      ]
  }
}

const stepIcons = [User, BookOpen, Workflow, Rocket, CheckCircle2]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [skipOnboarding, setSkipOnboarding] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleComplete = async () => {
    if (completing) return
    setCompleting(true)
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipFuture: skipOnboarding }),
      })
      router.push("/")
    } catch {
      router.push("/")
    }
  }

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) setCurrentStep((s) => s + 1)
  }

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Impossible de charger vos informations.</p>
      </div>
    )
  }

  const RoleIcon = roleIcons[user.role] || User

  return (
    <div className="flex h-full flex-col">
      {/* Main content area */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        <div className="w-full max-w-3xl">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="space-y-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                <Leaf className="h-10 w-10 text-emerald-600" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  Bienvenue sur Valoris, {user.firstName} !
                </h1>
                <p className="mx-auto max-w-xl text-lg text-slate-600">
                  Valoris est votre outil de costing FP&A pour le suivi des couts de production, la valorisation des stocks et le calcul des marges.
                </p>
              </div>
              <Card className="mx-auto max-w-md border-slate-200">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <RoleIcon className="h-6 w-6 text-slate-700" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-500">Votre role</p>
                    <p className="font-semibold text-slate-900">{roleLabels[user.role] || user.role}</p>
                    <p className="mt-1 text-sm text-slate-600">{roleDescriptions[user.role]}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 1: Key Concepts */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                  <BookOpen className="h-7 w-7 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Concepts cles</h2>
                <p className="mt-2 text-slate-600">
                  Les notions essentielles pour comprendre le costing chez Valoris
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {concepts.map((concept) => (
                  <Card key={concept.title} className={cn("border", concept.color)}>
                    <CardContent className="flex gap-4 p-5">
                      <div className="shrink-0 pt-0.5">
                        <concept.icon className={cn("h-6 w-6", concept.iconColor)} />
                      </div>
                      <div>
                        <p className="font-semibold">{concept.title}</p>
                        <p className="mt-1 text-sm opacity-80">{concept.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Workflow Overview */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-50">
                  <Workflow className="h-7 w-7 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Cycle de cloture mensuel</h2>
                <p className="mt-2 text-slate-600">
                  Les 6 etapes de la cloture mensuelle. Vos etapes sont mises en valeur.
                </p>
              </div>
              <div className="space-y-3">
                {workflowSteps.map((ws) => {
                  const isRelevant =
                    ws.roles.includes(user.role) || user.role === "ADMIN"
                  return (
                    <div
                      key={ws.step}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-4 transition-all",
                        isRelevant
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-100 bg-slate-50 opacity-50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isRelevant
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        )}
                      >
                        {ws.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "font-medium",
                              isRelevant ? "text-slate-900" : "text-slate-500"
                            )}
                          >
                            {ws.title}
                          </p>
                          {isRelevant && (
                            <Badge variant="success" className="text-[10px]">
                              Votre role
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {ws.roles.map((r) => roleLabels[r] || r).join(", ")}
                        </p>
                      </div>
                      <ws.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isRelevant ? "text-emerald-600" : "text-slate-300"
                        )}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: First Actions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
                  <Rocket className="h-7 w-7 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Vos premieres actions</h2>
                <p className="mt-2 text-slate-600">
                  Voici par ou commencer en tant que {roleLabels[user.role] || user.role}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {getActionsForRole(user.role).map((action) => (
                  <Link key={action.href} href={action.href}>
                    <Card className="group cursor-pointer border-slate-200 transition-all hover:border-slate-400 hover:shadow-md">
                      <CardContent className="flex items-start gap-4 p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-slate-200">
                          <action.icon className="h-5 w-5 text-slate-700" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 group-hover:text-slate-800">
                            {action.label}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{action.description}</p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {currentStep === 4 && (
            <div className="space-y-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-slate-900">Vous etes pret !</h2>
                <p className="mx-auto max-w-md text-lg text-slate-600">
                  Vous pouvez revenir a ce guide a tout moment depuis le menu Parametres.
                </p>
              </div>
              <div className="mx-auto max-w-sm space-y-4">
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  size="lg"
                >
                  {completing ? "Chargement..." : "Commencer"}
                  {!completing && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                <label className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked={skipOnboarding}
                    onChange={(e) => setSkipOnboarding(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Ne plus afficher ce guide au demarrage
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {/* Previous button */}
          <Button
            variant="ghost"
            onClick={goPrev}
            disabled={currentStep === 0}
            className={cn(
              "gap-2 text-slate-600",
              currentStep === 0 && "invisible"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Precedent
          </Button>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  i === currentStep
                    ? "w-8 bg-slate-800"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400"
                )}
                aria-label={`Etape ${i + 1}`}
              />
            ))}
          </div>

          {/* Next button */}
          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              onClick={goNext}
              className="gap-2 bg-slate-800 text-white hover:bg-slate-700"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-[100px]" />
          )}
        </div>
      </div>
    </div>
  )
}
