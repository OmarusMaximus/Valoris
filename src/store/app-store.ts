import { create } from 'zustand'

type UserInfo = {
  id: string
  email: string
  role: string
  entityId: string | null
  firstName: string
  lastName: string
}

type AppState = {
  user: UserInfo | null
  selectedEntityId: string | null
  selectedPeriod: string
  sidebarOpen: boolean
  locale: string
  setUser: (user: UserInfo | null) => void
  setSelectedEntity: (entityId: string | null) => void
  setSelectedPeriod: (period: string) => void
  toggleSidebar: () => void
  setLocale: (locale: string) => void
}

const getCurrentPeriod = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  selectedEntityId: null,
  selectedPeriod: getCurrentPeriod(),
  sidebarOpen: true,
  locale: 'fr',
  setUser: (user) => set({ user }),
  setSelectedEntity: (entityId) => set({ selectedEntityId: entityId }),
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLocale: (locale) => set({ locale }),
}))
