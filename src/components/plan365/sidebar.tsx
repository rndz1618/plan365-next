'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  Users,
  Sparkles,
  MessageSquare,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAppStore, type ViewType } from '@/store/plan365'
import { pathForView } from '@/lib/views'
import { Avatar } from './shared'

interface SidebarProps {
  onNavigate: () => void
}

interface NavItem {
  view: ViewType
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'projects', label: 'Projects', icon: FolderKanban },
  { view: 'tasks', label: 'Tasks', icon: CheckSquare },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
  { view: 'capacity', label: 'Capacity', icon: Users },
  { view: 'ai-planning', label: 'AI Planning', icon: Sparkles },
  { view: 'conversations', label: 'Conversations', icon: MessageSquare },
  { view: 'docs', label: 'Docs', icon: BookOpen },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ onNavigate }: SidebarProps) {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const selectedProjectId = useAppStore((s) => s.selectedProjectId)
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId)
  const projects = useAppStore((s) => s.projects)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)

  const sidebarRef = useRef<HTMLDivElement>(null)

  function navigate(view: ViewType, projectId?: number | null) {
    setCurrentView(view)
    if (projectId !== undefined) setSelectedProjectId(projectId)
    router.push(pathForView(view, projectId ?? (view === 'tasks' || view === 'projects' ? selectedProjectId : null)))
    onNavigate()
  }

  function handleNav(view: ViewType) {
    navigate(view, view === 'tasks' ? selectedProjectId : null)
  }

  function handleProjectClick(projectId: number) {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null)
      router.push('/tasks')
      setCurrentView('tasks')
      onNavigate()
    } else {
      navigate('tasks', projectId)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const displayName = user?.fullName || user?.username || 'User'

  return (
    <>
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-zinc-900 dark:bg-zinc-950 border-r border-zinc-800 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64',
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">Plan365</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 mx-auto">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 shrink-0',
              sidebarCollapsed && 'lg:hidden',
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="bg-zinc-800" />

        <ScrollArea className="flex-1 px-2 py-2">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = currentView === item.view
              const Icon = item.icon
              return (
                <button
                  key={item.view}
                  onClick={() => handleNav(item.view)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                    sidebarCollapsed && 'justify-center px-0',
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-emerald-400')} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {!sidebarCollapsed && projects.length > 0 && (
            <div className="mt-6">
              <div className="px-3 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Projects
                </span>
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setSelectedProjectId(null)
                    setCurrentView('tasks')
                    router.push('/tasks')
                    onNavigate()
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    selectedProjectId === null && currentView === 'tasks'
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-500 shrink-0" />
                  <span>All Projects</span>
                </button>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors truncate',
                      selectedProjectId === project.id
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                    {project._count && (
                      <span className="ml-auto text-xs text-zinc-500 tabular-nums shrink-0">
                        {project._count.tasks}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="mt-auto border-t border-zinc-800 shrink-0">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-3 gap-2">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-red-400 transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar name={displayName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.role || 'Member'}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-white/5 shrink-0"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
