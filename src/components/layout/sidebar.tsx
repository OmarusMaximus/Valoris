"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Tag,
  Users,
  UserCheck,
  FileUp,
  Trophy,
  Factory,
  Upload,
  ArrowLeftRight,
  Warehouse,
  FileSpreadsheet,
  BarChart3,
  AlertTriangle,
  GitCompare,
  Zap,
  Settings,
  Settings2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"

type NavItem = { href: string; icon: React.ElementType; label: string }
type NavGroup = { key: string; label: string; icon: React.ElementType; items: NavItem[] }

const navStructure: (NavItem | NavGroup)[] = [
  { href: "/", icon: LayoutDashboard, label: "Tableau de bord" },
  {
    key: "catalogue",
    label: "Catalogue",
    icon: Package,
    items: [
      { href: "/products", icon: Package, label: "Produits" },
      { href: "/articles", icon: Tag, label: "Articles" },
    ],
  },
  {
    key: "commercial",
    label: "Commercial",
    icon: Users,
    items: [
      { href: "/customers", icon: Users, label: "Clients" },
      { href: "/sales-reps", icon: UserCheck, label: "Commerciaux" },
      { href: "/sales-import", icon: FileUp, label: "Import ventes" },
      { href: "/league-tables", icon: Trophy, label: "League Tables" },
    ],
  },
  {
    key: "production",
    label: "Saisie & Import",
    icon: Factory,
    items: [
      { href: "/production", icon: Factory, label: "Saisie production" },
      { href: "/import", icon: Upload, label: "Import comptable" },
    ],
  },
  {
    key: "analyse",
    label: "Analyse coûts",
    icon: FileSpreadsheet,
    items: [
      { href: "/reallocations", icon: ArrowLeftRight, label: "Réaffectations" },
      { href: "/stock-valuation", icon: Warehouse, label: "Valorisation stocks" },
      { href: "/cost-sheets", icon: FileSpreadsheet, label: "Feuilles de costing" },
    ],
  },
  {
    key: "intelligence",
    label: "Intelligence",
    icon: BarChart3,
    items: [
      { href: "/variance-analysis", icon: BarChart3, label: "Analyse des écarts" },
      { href: "/smart-pricing", icon: Zap, label: "Smart Pricing" },
      { href: "/reconciliation", icon: AlertTriangle, label: "Réconciliation" },
      { href: "/scenarios", icon: GitCompare, label: "Scénarios" },
    ],
  },
  {
    key: "config",
    label: "Configuration",
    icon: Settings,
    items: [
      { href: "/setup", icon: Settings2, label: "Configuration initiale" },
      { href: "/settings", icon: Settings, label: "Paramètres" },
      { href: "/onboarding", icon: BookOpen, label: "Guide de démarrage" },
    ],
  },
]

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, user } = useAppStore()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Open the group containing the current path by default
    const initial: Record<string, boolean> = {}
    for (const item of navStructure) {
      if (isGroup(item)) {
        const hasActive = item.items.some(
          (sub) => sub.href === "/" ? pathname === "/" : pathname.startsWith(sub.href)
        )
        initial[item.key] = hasActive
      }
    }
    return initial
  })

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  const renderNavItem = (item: NavItem, indent = false) => {
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          indent && sidebarOpen && "pl-9",
          isActive
            ? "bg-slate-100 text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {sidebarOpen && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-200 bg-white transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        {sidebarOpen && (
          <h1 className="text-xl font-bold text-slate-900">Valoris</h1>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navStructure.map((item) => {
          if (!isGroup(item)) {
            return renderNavItem(item)
          }

          const group = item
          const isOpen = openGroups[group.key] ?? false
          const hasActive = group.items.some(
            (sub) => sub.href === "/" ? pathname === "/" : pathname.startsWith(sub.href)
          )

          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  hasActive
                    ? "text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <group.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 truncate text-left">{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </>
                )}
              </button>
              {(isOpen || !sidebarOpen) && (
                <div className={cn("space-y-0.5", sidebarOpen && "mt-0.5")}>
                  {group.items.map((sub) => renderNavItem(sub, true))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-slate-200 p-2">
        {sidebarOpen && user && (
          <div className="mb-2 px-3 py-2">
            <p className="text-sm font-medium text-slate-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
        )}
        <div className="flex gap-1">
          <Link
            href="/notifications"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
