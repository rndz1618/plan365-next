'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Menu,
  Plus,
  Search,
  Sun,
  Moon,
  Monitor,
  LogOut,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useAppStore, type ViewType } from '@/store/plan365'
import { Avatar } from './shared'

interface TopbarProps {
  onMenuClick: () => void
}

const VIEW_TITLES: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  calendar: 'Calendar',
  capacity: 'Capacity Planning',
  'ai-planning': 'AI Planning',
  conversations: 'Conversations',
  docs: 'Development Docs',
  settings: 'Settings',
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const user = useAppStore((s) => s.user)
  const currentView = useAppStore((s) => s.currentView)
  const projects = useAppStore((s) => s.projects)
  const selectedProjectId = useAppStore((s) => s.selectedProjectId)
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setProjects = useAppStore((s) => s.setProjects)

  const [searchValue, setSearchValue] = useState('')

  const displayName = user?.fullName || user?.username || 'User'
  const title = VIEW_TITLES[currentView] || 'Dashboard'

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  async function handleNewProject() {
    const name = prompt('New project name:')
    if (!name?.trim()) return

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      const { project } = await res.json()
      // Refresh project list
      const projRes = await fetch('/api/projects')
      if (projRes.ok) {
        const { projects: updatedProjects } = await projRes.json()
        setProjects(updatedProjects)
      }
      setCurrentView('projects')
    }
  }

  async function handleNewTask() {
    // Navigate to tasks view where a new task dialog can be opened
    setCurrentView('tasks')
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6',
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Title */}
      <h1 className="text-lg font-semibold text-foreground hidden sm:block">
        {title}
      </h1>

      {/* Project filter */}
      {(currentView === 'tasks' || currentView === 'calendar') && (
        <Select
          value={selectedProjectId?.toString() ?? 'all'}
          onValueChange={(val) => {
            if (val === 'all') {
              setSelectedProjectId(null)
            } else {
              setSelectedProjectId(parseInt(val, 10))
            }
          }}
        >
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex-1" />

      {/* Search (UI only) */}
      <div className="relative hidden md:block w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>

      {/* Quick actions */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleNewTask}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Task</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleNewProject}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Project</span>
      </Button>

      {/* User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
            <Avatar name={displayName} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCurrentView('settings')}>
            <User className="mr-2 h-4 w-4" />
            Profile & Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            variant="destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
