'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'

import { useAppStore } from '@/store/plan365'
import { viewFromSlug, projectIdFromSlug, pathForView } from '@/lib/views'
import { applyAccentColor, applyAppName } from '@/lib/accent'

import LoginPage from '@/components/plan365/login-page'
import { Sidebar } from '@/components/plan365/sidebar'
import { Topbar } from '@/components/plan365/topbar'
import { DashboardView } from '@/components/plan365/dashboard-view'
import { ProjectsView } from '@/components/plan365/projects-view'
import { TasksView } from '@/components/plan365/tasks-view'
import { CalendarView } from '@/components/plan365/calendar-view'
import { CapacityView } from '@/components/plan365/capacity-view'
import { AIPlanningView } from '@/components/plan365/ai-planning-view'
import { ConversationsView } from '@/components/plan365/conversations-view'
import { DocsView } from '@/components/plan365/docs-view'
import SettingsView from '@/components/plan365/settings-view'

function AppShell() {
  const { user, currentView, setCurrentView, selectedProjectId, setSelectedProjectId, sidebarCollapsed, appSettings } =
    useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const closeMobile = useCallback(() => setMobileMenuOpen(false), [])

  useEffect(() => {
    const slug = (params?.slug as string[] | undefined) ?? []
    const view = viewFromSlug(slug)
    const projectId = projectIdFromSlug(slug)

    if (view !== currentView) setCurrentView(view)
    if (projectId != null && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId)
    }
  }, [params, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const target = pathForView(currentView, selectedProjectId)
    if (pathname !== target && pathname !== target + '/') {
      router.replace(target)
    }
  }, [currentView, selectedProjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.preferences?.theme && ['light', 'dark', 'system'].includes(user.preferences.theme)) {
      setTheme(user.preferences.theme)
    }
  }, [user?.preferences?.theme, setTheme])

  // Live-apply brand settings whenever store changes
  useEffect(() => {
    applyAccentColor(appSettings.accentColor)
    applyAppName(appSettings.appName)
  }, [appSettings.accentColor, appSettings.appName])

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />
      case 'projects': return <ProjectsView />
      case 'tasks': return <TasksView />
      case 'calendar': return <CalendarView />
      case 'capacity': return <CapacityView />
      case 'ai-planning': return <AIPlanningView />
      case 'conversations': return <ConversationsView />
      case 'docs': return <DocsView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} hidden lg:flex flex-col shrink-0 transition-all duration-300`}>
        <Sidebar onNavigate={closeMobile} />
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobile} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden">
              <Sidebar onNavigate={closeMobile} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div key={currentView} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full">
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default function AppPage() {
  const { user, setUser, setProjects, setSelectedProjectId, setAppSettings } = useAppStore()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user) setUser(data.user) })
      .catch(() => {})

    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.projects) {
          setProjects(data.projects)
          if (!useAppStore.getState().selectedProjectId && data.projects.length > 0) {
            setSelectedProjectId(data.projects[0].id)
          }
        }
      })
      .catch(() => {})

    // Load global app settings (name, accent, …) and apply immediately
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const appName = typeof data.appName === 'string' ? data.appName : 'Plan365'
        const accentColor = typeof data.accentColor === 'string' ? data.accentColor : 'emerald'
        setAppSettings({
          appName,
          accentColor,
          allowRegistration: data.allowRegistration !== false && data.allowRegistration !== 'false',
          dateFormat: typeof data.dateFormat === 'string' ? data.dateFormat : 'yyyy-MM-dd',
          timezone: typeof data.timezone === 'string' ? data.timezone : 'UTC',
        })
        applyAccentColor(accentColor)
        applyAppName(appName)
      })
      .catch(() => {})
  }, [setUser, setProjects, setSelectedProjectId, setAppSettings])

  useEffect(() => {
    if (mounted && user && (pathname === '/' || pathname === '')) {
      router.replace('/dashboard')
    }
  }, [mounted, user, pathname, router])

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--brand, #10b981)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!user) return <LoginPage />
  return <AppShell />
}
