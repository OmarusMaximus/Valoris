"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, CheckCircle, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  costSheetId?: string
}

const typeIcons: Record<string, React.ElementType> = {
  SUBMITTED: Send,
  VALIDATED: CheckCircle,
  REJECTED: XCircle,
  INFO: Info,
}

const typeColors: Record<string, string> = {
  SUBMITTED: "text-amber-500",
  VALIDATED: "text-emerald-500",
  REJECTED: "text-red-500",
  INFO: "text-blue-500",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Badge variant="default">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune notification</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(notif => {
                const Icon = typeIcons[notif.type] || Info
                return (
                  <button
                    key={notif.id}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50",
                      !notif.read && "bg-blue-50/50"
                    )}
                  >
                    <div className="relative mt-0.5">
                      <Icon className={cn("h-5 w-5", typeColors[notif.type] || "text-slate-400")} />
                      {!notif.read && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !notif.read && "font-medium")}>{notif.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(notif.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant={notif.read ? "secondary" : "outline"} className="shrink-0">
                      {notif.read ? "Lu" : "Non lu"}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
