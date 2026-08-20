'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Users, TrendingUp, AlertTriangle, ChevronDown, Clock,
} from 'lucide-react'
import { type CapacityData, type Project } from '@/store/plan365'
import { useAppStore } from '@/store/plan365'
import { EmptyState, LoadingSpinner, TypeBadge } from './shared'

function utilColor(util: number): string {
  if (util > 100) return '#ef4444'
  if (util >= 80) return '#f59e0b'
  return '#10b981'
}

function utilBgClass(util: number): string {
  if (util > 100) return 'bg-red-500'
  if (util >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function utilLabelClass(util: number): string {
  if (util > 100) return 'text-red-600 dark:text-red-400'
  if (util >= 80) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function CapacitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[260px] w-full rounded-lg" /></CardContent>
      </Card>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CapacityBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(value, 120)
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-full bg-muted ${className || ''}`}>
      <div
        className={`h-full rounded-full transition-all ${utilBgClass(value)}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName: string; utilization: number } }> }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
      <p className="font-medium">{d.fullName}</p>
      <p className={utilLabelClass(d.utilization)}>{d.utilization}% utilization</p>
    </div>
  )
}

export function CapacityView() {
  const { projects, selectedProjectId, setSelectedProjectId, currentView } = useAppStore()
  const active = currentView === 'capacity'
  const [data, setData] = useState<CapacityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<string>(selectedProjectId?.toString() || 'all')

  useEffect(() => {
    if (!active) return
    async function fetchCapacity() {
      setLoading(true)
      setError(null)
      try {
        const url = filterProjectId === 'all'
          ? '/api/capacity'
          : `/api/capacity?projectId=${filterProjectId}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch capacity data')
        const json = await res.json()
        setData(Array.isArray(json) ? json : [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchCapacity()
  }, [filterProjectId, active])

  const totalTeam = data.length
  const avgUtil = totalTeam > 0 ? Math.round(data.reduce((s, d) => s + d.utilization, 0) / totalTeam) : 0
  const mostLoaded = totalTeam > 0 ? data.reduce((m, d) => d.utilization > m.utilization ? d : m, data[0]) : null

  const chartData = data.map(d => ({
    fullName: d.fullName,
    utilization: d.utilization,
  })).sort((a, b) => b.utilization - a.utilization)

  if (loading) return <CapacitySkeleton />

  if (error) {
    return <EmptyState message={`Error loading capacity: ${error}`} icon={AlertTriangle} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={filterProjectId} onValueChange={setFilterProjectId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Team</p>
              <p className="text-2xl font-bold">{totalTeam}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className={`rounded-lg p-3 ${utilBgClass(avgUtil)} text-white`}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Utilization</p>
              <p className="text-2xl font-bold">{avgUtil}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-red-100 p-3 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Most Loaded</p>
              <p className="text-lg font-bold truncate max-w-[140px]">
                {mostLoaded?.fullName || 'N/A'}
                {mostLoaded && (
                  <span className={`ml-2 text-sm font-normal ${utilLabelClass(mostLoaded.utilization)}`}>
                    {mostLoaded.utilization}%
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalTeam > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[60px] lg:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 120]} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="fullName" width={100} tick={{ fontSize: 12 }} className="hidden lg:block" />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="utilization" radius={[4, 4, 4, 4]} barSize={24}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={utilColor(entry.utilization)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState message="No capacity data available" icon={Users} />
      )}

      <div className="space-y-3">
        {data.length === 0 && (
          <EmptyState message="No team members found" icon={Users} />
        )}
        {data.map(member => (
          <Collapsible key={member.id}>
            <Card>
              <CollapsibleTrigger className="w-full text-left">
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white shrink-0">
                    {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{member.fullName}</span>
                      <span className="text-xs text-muted-foreground">@{member.username}</span>
                      {member.utilization > 100 && (
                        <Badge variant="outline" className="border-red-300 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800">
                          Overallocated
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {member.weeklyCapacity}h/week
                      </span>
                      <span>Allocated: {member.allocatedEffort}h</span>
                      <span className={`font-semibold ${utilLabelClass(member.utilization)}`}>
                        {member.utilization}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <CapacityBar value={member.utilization} />
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-4 py-3">
                  {member.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No active tasks assigned</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {member.tasks.length} Active Task{member.tasks.length > 1 ? 's' : ''}
                      </p>
                      {member.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: task.project.color || '#6b7280' }} />
                            <span className="truncate max-w-[120px] text-muted-foreground text-xs">{task.project.name}</span>
                          </span>
                          <span className="font-medium truncate">{task.title}</span>
                          <TypeBadge type={task.type} className="ml-auto shrink-0" />
                          <span className="text-xs text-muted-foreground shrink-0">{task.effort ?? 0}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}
