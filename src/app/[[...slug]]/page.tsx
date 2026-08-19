'use client'

import {
  useState, useEffect, useCallback, useRef, useSyncExternalStore, lazy, Suspense,
} from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'

import { useAppStore, type ViewType } from '@/store/plan365'
import { viewFromSlug, projectIdFromSlug, pathForView } from '@/lib/views'
import { applyAccentColor, applyAppName } from '@/lib/accent'
import { cachedGet } from '@/lib/api-cache'

import LoginPage from '@/components/plan365/login-page'
import { Sidebar } from '@/components/plan365/sidebar'
import { Topbar } from '@/components/plan365/topbar'

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

function renderView(view: ViewType) {
  switch (view) {
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

function AppShell() {
  const user = useAppStore((s) => s.user)
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const selectedProjectId = useAppStore((s) => s.selectedProjectId)
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const appSettings = useAppStore((s) => s.appSettings)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Keep visited views mounted → no Suspense flash / state loss when switching
  const [mountedViews, setMountedViews] = useState<ViewType[]>(() => [currentView])

  const { setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const urlSynced = useRef(false)
  const navigatingRef = useRef(false)

  const closeMobile = useCallback(() => setMobileMenuOpen(false), [])

  useEffect(() => {
    setMountedViews((prev) => (prev.includes(currentView) ? prev : [...prev, currentView]))
  }, [currentView])

  // URL → store (load / back-forward)
  useEffect(() => {
    const slug = (params?.slug as string[] | undefined) ?? []
    const view = viewFromSlug(slug)
    const projectId = projectIdFromSlug(slug)

    navigatingRef.current = true

    if (view !== useAppStore.getState().currentView) setCurrentView(view)

    if (projectId != null) {
      if (projectId !== useAppStore.getState().selectedProjectId) setSelectedProjectId(projectId)
    } else if (
      (view === 'tasks' || view === 'calendar') &&
      useAppStore.getState().selectedProjectId != null &&
      (slug.length <= 1 || slug[1] === 'all')
    ) {
      setSelectedProjectId(null)
    }

    urlSynced.current = true
    requestAnimationFrame(() => {
      navigatingRef.current = false
    })
  }, [params, pathname, setCurrentView, setSelectedProjectId])

  // store → URL (user navigation only)
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
        <Topbar onMenuClick={() => setMobileMenuOpen((p) => !p)} />
        <main className="flex-1 overflow-auto p-4 sm:p-5 md:p-6 lg:p-8">
          {mountedViews.map((view) => (
            <div
              key={view}
              className={view === currentView ? 'h-full min-h-0' : 'hidden'}
              aria-hidden={view !== currentView}
            >
              <Suspense fallback={null}>{renderView(view)}</Suspense>
            </div>
          ))}
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

  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const [authReady, setAuthReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  useEffect(() => {
    if (!mounted) return
    const slug = (params?.slug as string[] | undefined) ?? []
    setCurrentView(viewFromSlug(slug))
    const projectId = projectIdFromSlug(slug)
    if (projectId != null) setSelectedProjectId(projectId)
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return
    let cancelled = false

    ;(async () => {
      try {
        const { ok, data } = await cachedGet<{ user?: unknown }>('/api/auth/me', { ttlMs: 30_000 })
        if (cancelled) return
        if (ok && data && typeof data === 'object' && data !== null && 'user' in data && data.user) {
          setUser(data.user as never)
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

  useEffect(() => {
    if (!user) return
    let cancelled = false

    cachedGet<{ projects?: unknown[] }>('/api/projects', { ttlMs: 20_000 }).then(({ ok, data }) => {
      if (cancelled || !ok || !data?.projects) return
      setProjects(data.projects as never)
    })

    cachedGet<Record<string, unknown>>('/api/settings', { ttlMs: 60_000 }).then(({ ok, data }) => {
      if (cancelled || !ok || !data) return
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

    return () => {
      cancelled = true
    }
  }, [user, setProjects, setAppSettings])

  useEffect(() => {
    if (!authReady || !user) return
    if (pathname === '/' || pathname === '') router.replace('/dashboard')
  }, [authReady, user, pathname, router])

  if (!mounted || !authReady) return <BootSpinner />
  if (!user) return <LoginPage />
  return <AppShell />
}
