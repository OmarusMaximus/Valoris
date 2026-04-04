"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Factory,
  Upload,
  ArrowLeftRight,
  Warehouse,
  FileSpreadsheet,
  GitCompare,
  Settings,
  Settings2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  BookOpen,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/products", icon: Package, labelKey: "products" },
  { href: "/articles", icon: Tag, labelKey: "articles" },
  { href: "/production", icon: Factory, labelKey: "production" },
  { href: "/import", icon: Upload, labelKey: "import" },
  { href: "/reallocations", icon: ArrowLeftRight, labelKey: "reallocations" },
  { href: "/stock-valuation", icon: Warehouse, labelKey: "stockValuation" },
  { href: "/cost-sheets", icon: FileSpreadsheet, labelKey: "costSheets" },
  { href: "/scenarios", icon: GitCompare, labelKey: "scenarios" },
  { href: "/setup", icon: Settings2, labelKey: "setup" },
  { href: "/settings", icon: Settings, labelKey: "settings" },
  { href: "/onboarding", icon: BookOpen, labelKey: "onboarding" },
]

const labels: Record<string, string> = {
  dashboard: "Tableau de bord",
  products: "Produits",
  articles: "Articles",
  production: "Production",
  import: "Import comptable",
  reallocations: "Réaffectations",
  stockValuation: "Valorisation stocks",
  costSheets: "Feuilles de costing",
  scenarios: "Scénarios",
  setup: "Configuration initiale",
  settings: "Paramètres",
  onboarding: "Guide de démarrage",
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, user } = useAppStore()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
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
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const isOnboarding = item.labelKey === "onboarding"
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : isOnboarding
                    ? "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isOnboarding && !isActive && "text-emerald-600")} />
              {sidebarOpen && (
                <span className="flex items-center gap-2">
                  {labels[item.labelKey]}
                  {isOnboarding && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Nouveau
                    </span>
                  )}
                </span>
              )}
            </Link>
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
