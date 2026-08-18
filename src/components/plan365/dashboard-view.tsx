'use client'

import { useEffect, useState } from 'react'
import { format, addDays, isBefore, startOfDay } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FolderKanban, ListChecks, Activity, AlertTriangle,
  CalendarDays, Clock, ArrowRight,
} from 'lucide-react'
import { type DashboardStats, type Task } from '@/store/plan365'
import { EmptyState, LoadingSpinner, StatusBadge, TypeBadge, PriorityBadge } from './shared'

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-10" />
            </div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-[260px] w-full rounded-lg" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Failed to load dashboard')
        const raw = await res.json()
        const data: DashboardStats = {
          totalProjects: raw.stats?.totalProjects || 0,
          totalTasks: raw.stats?.totalTasks || 0,
          tasksByStatus: raw.stats?.tasksByStatus || {},
          upcomingDeadlines: raw.upcomingDeadlines || [],
          recentTasks: raw.recentActivity || [],
        }
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <DashboardSkeleton />
  if (error || !stats) return <EmptyState message={error || 'No dashboard data available'} icon={AlertTriangle} />

  const inProgressCount = stats.tasksByStatus['In Progress'] || 0
  const overdueCount = stats.tasksByStatus['Blocked'] || 0

  const chartData = Object.entries(stats.tasksByStatus).map(([status, count]) => ({
    status,
    count,
  }))

  const today = startOfDay(new Date())
  const sevenDaysLater = addDays(today, 7)
  const upcomingDeadlines = stats.upcomingDeadlines
    .filter((t) => t.dueDate && isBefore(new Date(t.dueDate), sevenDaysLater))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 8)

  const isOverdue = (task: Task) => task.dueDate && isBefore(new Date(task.dueDate), today) && task.status !== 'Done'

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Projects" value={stats.totalProjects} icon={FolderKanban} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" />
        <StatCard title="Total Tasks" value={stats.totalTasks} icon={ListChecks} color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" />
        <StatCard title="In Progress" value={inProgressCount} icon={Activity} color="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" />
        <StatCard title="Overdue" value={overdueCount} icon={AlertTriangle} color="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" />
      </div>

      {/* Chart + Upcoming Deadlines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <EmptyState message="No upcoming deadlines this week" />
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                      isOverdue(task) ? 'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {task.project && (
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                            {task.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {isOverdue(task) && (
                        <Badge variant="outline" className="border-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          Overdue
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                      </span>
                      {task.assignee && (
                        <span className="text-xs text-muted-foreground">
                          {task.assignee.fullName || task.assignee.username}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-emerald-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentTasks.length === 0 ? (
            <EmptyState message="No recent activity" />
          ) : (
            <div className="space-y-1">
              {stats.recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <TypeBadge type={task.type} className="text-[10px] px-1.5 py-0" />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {task.project && (
                        <span className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                          {task.project.name}
                        </span>
                      )}
                      {task.assignee && (
                        <span>{task.assignee.fullName || task.assignee.username}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <PriorityBadge priority={task.priority} className="text-[10px] px-1.5 py-0" />
                    <StatusBadge status={task.status} className="text-[10px] px-1.5 py-0" />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}