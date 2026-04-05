"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string; sublabel?: string }>
  placeholder?: string
  searchPlaceholder?: string
  onAdd?: () => void
  addLabel?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  onAdd,
  addLabel = "Ajouter",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on click outside
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
  )

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal"
        onClick={() => { if (!disabled) setOpen(!open) }}
        disabled={disabled}
        type="button"
      >
        <span className="truncate">
          {selected ? selected.label : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center border-b border-slate-200 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <input
              className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                Aucun résultat
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-slate-100 text-left",
                    value === option.value && "bg-slate-100"
                  )}
                  onClick={() => {
                    onValueChange(option.value)
                    setOpen(false)
                    setSearch("")
                  }}
                  type="button"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <div>{option.label}</div>
                    {option.sublabel && (
                      <div className="text-xs text-slate-400">{option.sublabel}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          {onAdd && (
            <div className="border-t border-slate-200 p-1">
              <button
                className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                onClick={() => {
                  onAdd()
                  setOpen(false)
                  setSearch("")
                }}
                type="button"
              >
                <Plus className="mr-2 h-4 w-4" />
                {addLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
