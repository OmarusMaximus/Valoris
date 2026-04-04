"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  GitCompareArrows,
  TrendingUp,
  DollarSign,
  BarChart3,
  FileDown,
} from "lucide-react"

export default function ScenariosPage() {
  const features = [
    {
      icon: GitCompareArrows,
      title: "Comparer les methodes de valorisation",
      description:
        "Comparez les methodes CUMP, FIFO et Standard cote a cote pour evaluer leur impact sur vos couts de revient.",
    },
    {
      icon: DollarSign,
      title: "Simuler les variations de prix matieres premieres",
      description:
        "Modelisez l'impact d'une hausse ou baisse des prix matieres premieres sur vos marges produit.",
    },
    {
      icon: TrendingUp,
      title: "Analyse d'impact sur les marges",
      description:
        "Visualisez l'effet de differents scenarios sur vos marges brutes et contributives par produit.",
    },
    {
      icon: FileDown,
      title: "Export des rapports de comparaison",
      description:
        "Exportez les resultats de vos analyses de scenarios au format Excel ou PDF pour vos presentations.",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scenarios</h1>
        <p className="text-slate-500">Comparateur de scenarios what-if</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Comparateur de scenarios what-if
          </h2>
          <p className="text-slate-500 text-center max-w-md mb-4">
            Disponible prochainement (Phase 5)
          </p>
          <Badge variant="secondary">Phase 5</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature) => (
          <Card key={feature.title} className="opacity-75">
            <CardHeader className="flex flex-row items-start gap-3 pb-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <feature.icon className="h-5 w-5 text-slate-500" />
              </div>
              <CardTitle className="text-sm font-medium">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
