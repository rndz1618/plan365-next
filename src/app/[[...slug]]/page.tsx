'use client'

import { useState, useEffect, useCallback, useRef, useSyncExternalStore, lazy, Suspense } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'

import { useAppStore, type ViewType } from '@/store/plan365'
import { viewFromSlug, projectIdFromSlug, pathForView } from '@/lib/views'
import { applyAccentColor, applyAppName } from '@/lib/accent'

import LoginPage from '@/components/plan365/login-page'
import { Sidebar } from '@/components/plan365/sidebar'
import { Topbar } from '@/components/plan365/topbar'

// Lazy-load heavy views — only the active one is fetched
const DashboardView = lazy(() =>
  import('@/components/plan365/dashboard-view').then((m) => ({ default: m.DashboardView })),
)
const ProjectsView = lazy(() =>
  import('@/components/plan365/projects-view').then((m) => ({ default: m.ProjectsView })),
)
const TasksView = lazy(() =>
  import('@/components/plan365/tasks-view').then((m) => ({ default: m.TasksView })),
)
const CalendarView = lazy(() =>
  import('@/components/plan365/calendar-view').then((m) => ({ default: m.CalendarView })),
)
const CapacityView = lazy(() =>
  import('@/components/plan365/capacity-view').then((m) => ({ default: m.CapacityView })),
)
const AIPlanningView = lazy(() =>
  import('@/components/plan365/ai-planning-view').then((m) => ({ default: m.AIPlanningView })),
)
const ConversationsView = lazy(() =>
  import('@/components/plan365/conversations-view').then((m) => ({ default: m.ConversationsView })),
)
const DocsView = lazy(() =>
  import('@/components/plan365/docs-view').then((m) => ({ default: m.DocsView })),
)
const SettingsView = lazy(() => import('@/components/plan365/settings-view'))

function ViewFallback() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--brand, #10b981)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

function renderView(view: ViewType) {
  switch (view) {
    case 'dashboard':
      return <DashboardView />
    case 'projects':
      return <ProjectsView />
    case 'tasks':
      return <TasksView />
    case 'calendar':
      return <CalendarView />
    case 'capacity':
      return <CapacityView />
    case 'ai-planning':
      return <AIPlanningView />
    case 'conversations':
      return <ConversationsView />
    case 'docs':
      return <DocsView />
    case 'settings':
      return <SettingsView />
    default:
      return <DashboardView />
  }
}

function AppShell() {
  const user = useAppStore((s) => s.user)
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const selectedProjectId = useAppStore((s) => s.selectedProjectId)
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const appSettings = useAppStore((s) => s.appSettings)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  // Prevent store→URL from fighting URL→store on first paint
  const urlSynced = useRef(false)
  const navigatingRef = useRef(false)

  const closeMobile = useCallback(() => setMobileMenuOpen(false), [])

  // 1) URL is source of truth on load / back-forward
  useEffect(() => {
    const slug = (params?.slug as string[] | undefined) ?? []
    const view = viewFromSlug(slug)
    const projectId = projectIdFromSlug(slug)

    navigatingRef.current = true

    if (view !== useAppStore.getState().currentView) {
      setCurrentView(view)
    }

    if (projectId != null) {
      if (projectId !== useAppStore.getState().selectedProjectId) {
        setSelectedProjectId(projectId)
      }
    } else if (
      (view === 'tasks' || view === 'calendar') &&
      useAppStore.getState().selectedProjectId != null &&
      (slug.length <= 1 || slug[1] === 'all')
    ) {
      setSelectedProjectId(null)
    }

    urlSynced.current = true
    // Allow store→URL after URL has been applied
    requestAnimationFrame(() => {
      navigatingRef.current = false
    })
  }, [params, pathname, setCurrentView, setSelectedProjectId])

  // 2) store → URL only after initial sync, and only when user changed store
  useEffect(() => {
    if (!urlSynced.current || navigatingRef.current) return
    const target = pathForView(currentView, selectedProjectId)
    if (pathname !== target && pathname !== target + '/') {
      router.replace(target)
    }
  }, [currentView, selectedProjectId, pathname, router])

  useEffect(() => {
    if (user?.preferences?.theme && ['light', 'dark', 'system'].includes(user.preferences.theme)) {
      setTheme(user.preferences.theme)
    }
  }, [user?.preferences?.theme, setTheme])

  useEffect(() => {
    applyAccentColor(appSettings.accentColor)
    applyAppName(appSettings.appName)
  }, [appSettings.accentColor, appSettings.appName])

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} hidden lg:flex flex-col shrink-0 transition-[width] duration-200`}
      >
        <Sidebar onNavigate={closeMobile} />
      </div>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobile} />
          <div className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden">
            <Sidebar onNavigate={closeMobile} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 overflow-auto p-4 sm:p-5 md:p-6 lg:p-8">
          <Suspense fallback={<ViewFallback />}>
            {renderView(currentView)}
          </Suspense>
        </main>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}

function BootSpinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--brand, #10b981)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

export default function AppPage() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const setProjects = useAppStore((s) => s.setProjects)
  const setAppSettings = useAppStore((s) => s.setAppSettings)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId)

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const [authReady, setAuthReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  // Seed store from URL immediately (before paint effects race)
  useEffect(() => {
    if (!mounted) return
    const slug = (params?.slug as string[] | undefined) ?? []
    const view = viewFromSlug(slug)
    const projectId = projectIdFromSlug(slug)
    setCurrentView(view)
    if (projectId != null) setSelectedProjectId(projectId)
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auth first — only then load projects/settings
  useEffect(() => {
    if (!mounted) return
    let cancelled = false

    ;(async () => {
      try {
        const meRes = await fetch('/api/auth/me')
        if (cancelled) return
        if (meRes.ok) {
          const data = await meRes.json()
          if (data?.user) setUser(data.user)
        }
      } catch {
        /* unauthenticated */
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [mounted, setUser])

  // Secondary data only after we know the user
  useEffect(() => {
    if (!user) return
    let cancelled = false

    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.projects) setProjects(data.projects)
      })
      .catch(() => {})

    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
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

    return () => {
      cancelled = true
    }
  }, [user, setProjects, setAppSettings])

  // Only force /dashboard when landing on bare `/` after login — never override deep links
  useEffect(() => {
    if (!authReady || !user) return
    if (pathname === '/' || pathname === '') {
      router.replace('/dashboard')
    }
  }, [authReady, user, pathname, router])

  if (!mounted || !authReady) return <BootSpinner />
  if (!user) return <LoginPage />
  return <AppShell />
}
