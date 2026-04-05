"use client"

import { useAppStore } from "@/store/app-store"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"

type EntityOption = { id: string; code: string; name: string }

export function Header() {
  const { selectedEntityId, setSelectedEntity, selectedPeriod, setSelectedPeriod, displayCurrency, setDisplayCurrency } = useAppStore()
  const [entities, setEntities] = useState<EntityOption[]>([])

  useEffect(() => {
    fetch("/api/entities")
      .then((r) => r.json())
      .then((data) => {
        setEntities(data)
        if (!selectedEntityId && data.length > 0) {
          setSelectedEntity(data[0].id)
        }
      })
      .catch(() => {})
  }, [selectedEntityId, setSelectedEntity])

  // Generate period options (last 12 months)
  const periodOptions: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    periodOptions.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    )
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <Select
          value={selectedEntityId || ""}
          onValueChange={(v) => setSelectedEntity(v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sélectionner une entité" />
          </SelectTrigger>
          <SelectContent>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.code} - {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedPeriod}
          onValueChange={(v) => setSelectedPeriod(v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={displayCurrency || "__local__"}
          onValueChange={(v) => setDisplayCurrency(v === "__local__" ? null : v)}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Devise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__local__">Devise locale</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="CHF">CHF</SelectItem>
            <SelectItem value="MAD">MAD</SelectItem>
            <SelectItem value="XOF">XOF</SelectItem>
            <SelectItem value="KES">KES</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">FP&A Costing Tool</span>
      </div>
    </header>
  )
}
