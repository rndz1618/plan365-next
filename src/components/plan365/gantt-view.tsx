'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  differenceInDays, addDays, parseISO, format, isToday, isWeekend, startOfDay,
} from 'date-fns'
import { GanttChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from '@/components/ui/resizable'
import {
  useAppStore, type Task, type TaskDependency, type CriticalPathResult,
} from '@/store/plan365'
import { EmptyState, UserAvatar, LoadingSpinner } from './shared'

const TYPE_BG_COLORS: Record<string, string> = {
  '2D CAD': 'bg-violet-400',
  'CAD': 'bg-sky-400',
  'CAM': 'bg-emerald-400',
  'Tools': 'bg-orange-400',
  'Others': 'bg-slate-400',
}

const TYPE_DARK_COLORS: Record<string, string> = {
  '2D CAD': 'bg-violet-700',
  'CAD': 'bg-sky-700',
  'CAM': 'bg-emerald-700',
  'Tools': 'bg-orange-700',
  'Others': 'bg-slate-600',
}

type ZoomLevel = 'day' | 'week' | 'month'

const ZOOM_CONFIG: Record<ZoomLevel, { colWidth: number; labelFn: (d: Date) => string }> = {
  day:   { colWidth: 36,  labelFn: (d) => format(d, 'd') },
  week:  { colWidth: 24,  labelFn: (d) => format(d, 'd') },
  month: { colWidth: 14,  labelFn: (d) => (isToday(d) ? format(d, 'd') : '') },
}

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 56
const MILESTONE_SIZE = 14

function daysBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0
  return Math.max(0, differenceInDays(parseISO(b), parseISO(a)))
}

function sortTasksByStart(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const as = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY
    const bs = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY
    if (as !== bs) return as - bs
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY
    if (ad !== bd) return ad - bd
    return a.id - b.id
  })
}

interface GanttViewProps {
  projectId?: number | null
  embedded?: boolean
}

export function GanttView({ projectId: propProjectId, embedded = false }: GanttViewProps) {
  const { projects, selectedProjectId, setSelectedProjectId } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [deps, setDeps] = useState<TaskDependency[]>([])
  const [criticalPath, setCriticalPath] = useState<CriticalPathResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<ZoomLevel>('day')

  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightScrollRef = useRef<HTMLDivElement>(null)
  const syncLock = useRef(false)

  useEffect(() => {
    if (!embedded && !propProjectId && !selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [embedded, propProjectId, selectedProjectId, projects, setSelectedProjectId])

  const projectId = propProjectId ?? selectedProjectId ?? (projects.length > 0 ? projects[0].id : null)

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const taskUrl = projectId
        ? `/api/tasks?projectId=${projectId}&deps=true&sort=startDate&order=asc`
        : `/api/tasks?deps=true&sort=startDate&order=asc`
      const depUrl = projectId
        ? `/api/dependencies?projectId=${projectId}`
        : `/api/dependencies`
      const cpUrl = projectId
        ? `/api/critical-path?projectId=${projectId}`
        : null

      const promises: Promise<Response>[] = [fetch(taskUrl), fetch(depUrl)]
      if (cpUrl) promises.push(fetch(cpUrl))

      const [tRes, dRes, cRes] = await Promise.all(promises)
      if (tRes.ok) {
        const d = await tRes.json()
        const list: Task[] = Array.isArray(d) ? d : d.tasks || []
        setTasks(sortTasksByStart(list))
      }
      if (dRes.ok) { const d = await dRes.json(); setDeps(Array.isArray(d) ? d : []) }
      if (cRes && cRes.ok) { setCriticalPath(await cRes.json()) }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  const { timelineStart, totalDays, dates } = useMemo(() => {
    let minDate: Date | null = null
    let maxDate: Date | null = null

    if (selectedProject?.startDate) {
      minDate = addDays(parseISO(selectedProject.startDate), -7)
    }
    if (selectedProject?.dueDate) {
      maxDate = addDays(parseISO(selectedProject.dueDate), 7)
    }

    for (const t of tasks) {
      if (t.startDate) {
        const d = parseISO(t.startDate)
        if (!minDate || d < minDate) minDate = d
      }
      if (t.dueDate) {
        const d = parseISO(t.dueDate)
        if (!maxDate || d > maxDate) maxDate = d
      }
    }

    const start = minDate ? addDays(startOfDay(minDate), -3) : addDays(new Date(), -14)
    const end = maxDate ? addDays(startOfDay(maxDate), 7) : addDays(new Date(), 30)
    const days = Math.max(1, differenceInDays(end, start) + 1)
    const d = Array.from({ length: days }, (_, i) => addDays(start, i))
    return { timelineStart: start, totalDays: days, dates: d }
  }, [tasks, selectedProject])

  const colWidth = ZOOM_CONFIG[zoom].colWidth
  const totalWidth = totalDays * colWidth

  const criticalIds = useMemo(() => {
    return new Set(criticalPath?.criticalTaskIds || [])
  }, [criticalPath])

  const getTaskX = useCallback((task: Task) => {
    if (!task.startDate) return 0
    const taskStart = startOfDay(parseISO(task.startDate))
    const offset = differenceInDays(taskStart, timelineStart)
    return offset * colWidth
  }, [timelineStart, colWidth])

  const getTaskWidth = useCallback((task: Task) => {
    if (task.isMilestone) return MILESTONE_SIZE
    const d = daysBetween(task.startDate, task.dueDate)
    return Math.max(colWidth, d * colWidth)
  }, [colWidth])

  const onLeftScroll = useCallback(() => {
    if (syncLock.current || !rightScrollRef.current) return
    syncLock.current = true
    rightScrollRef.current.scrollTop = leftScrollRef.current!.scrollTop
    requestAnimationFrame(() => { syncLock.current = false })
  }, [])

  const onRightScroll = useCallback(() => {
    if (syncLock.current || !leftScrollRef.current) return
    syncLock.current = true
    leftScrollRef.current.scrollTop = rightScrollRef.current!.scrollTop
    requestAnimationFrame(() => { syncLock.current = false })
  }, [])

  const todayColIndex = useMemo(() => {
    const today = startOfDay(new Date())
    return differenceInDays(today, timelineStart)
  }, [timelineStart])

  const depPaths = useMemo(() => {
    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    const paths: { key: string; d: string }[] = []

    for (const dep of deps) {
      const pred = taskMap.get(dep.predecessorId)
      const succ = taskMap.get(dep.successorId)
      if (!pred || !succ || !pred.dueDate || !succ.startDate) continue

      const predX = getTaskX(pred) + getTaskWidth(pred)
      const succX = getTaskX(succ)
      const predIdx = tasks.indexOf(pred)
      const succIdx = tasks.indexOf(succ)
      const predY = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2
      const succY = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2
      const lagOffset = (dep.lagDays || 0) * colWidth

      let d: string
      if (dep.type === 'SS') {
        const startX = getTaskX(pred)
        d = `M ${startX} ${predY} L ${startX} ${predY - 8} L ${succX} ${predY - 8} L ${succX} ${succY}`
      } else {
        d = `M ${predX} ${predY} L ${predX + 4 + lagOffset} ${predY} L ${predX + 4 + lagOffset} ${succY} L ${succX} ${succY}`
      }

      paths.push({ key: `dep-${dep.id}`, d })
    }
    return paths
  }, [deps, tasks, getTaskX, getTaskWidth, colWidth])

  const headerLabels = useMemo(() => {
    const config = ZOOM_CONFIG[zoom]
    const labels: { text: string; x: number; isMonth?: boolean; isWeekend?: boolean; isToday?: boolean }[] = []
    let lastMonth = ''
    let lastWeek = ''

    for (let i = 0; i < dates.length; i++) {
      const d = dates[i]
      const m = format(d, 'MMM yyyy')
      const w = format(d, 'w')
      if (zoom === 'day') {
        if (m !== lastMonth) {
          labels.push({ text: m, x: i * colWidth, isMonth: true })
          lastMonth = m
        }
        labels.push({
          text: config.labelFn(d),
          x: i * colWidth,
          isWeekend: isWeekend(d),
          isToday: isToday(d),
        })
      } else if (zoom === 'week') {
        if (w !== lastWeek) {
          labels.push({
            text: format(d, 'd MMM'),
            x: i * colWidth,
            isWeekend: isWeekend(d),
            isToday: isToday(d),
          })
          lastWeek = w
        }
      } else {
        if (m !== lastMonth) {
          labels.push({ text: m, x: i * colWidth, isMonth: true })
          lastMonth = m
        }
      }
    }
    return labels
  }, [dates, zoom, colWidth])

  if (loading && tasks.length === 0) return <LoadingSpinner className="h-[60vh]" />

  if (tasks.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <EmptyState message={projectId ? 'No tasks in this project' : 'No tasks found. Create some tasks first.'} icon={GanttChart} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!embedded && <h2 className="text-lg font-semibold">Gantt</h2>}
          {!embedded && (
          <Select value={String(projectId)} onValueChange={(v) => setSelectedProjectId(Number(v))}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['month', 'week', 'day'] as ZoomLevel[]).map((z) => (
            <Button
              key={z}
              variant={zoom === z ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZoom(z)}
              className={zoom === z ? 'bg-emerald-600 hover:bg-emerald-700 text-white capitalize' : 'capitalize'}
            >
              {z}
            </Button>
          ))}
          {criticalPath && criticalPath.criticalTaskIds.length > 0 && (
            <span className="ml-2 text-xs text-red-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Critical path: {criticalPath.criticalTaskIds.length} tasks, {criticalPath.projectDuration}d
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <div className="h-full flex flex-col border-r">
              <div className="shrink-0 bg-muted/50 border-b px-2 py-1.5" style={{ height: HEADER_HEIGHT }}>
                <div className="grid grid-cols-[40px_1fr_80px_70px_50px] gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  <span>ID</span>
                  <span>Title</span>
                  <span>Assignee</span>
                  <span>Start</span>
                  <span>Effort</span>
                </div>
              </div>
              <div ref={leftScrollRef} onScroll={onLeftScroll} className="flex-1 overflow-auto">
                {tasks.map((t) => {
                  const isCritical = criticalIds.has(t.id)
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'grid grid-cols-[40px_1fr_80px_70px_50px] gap-1 items-center px-2 border-b text-xs',
                        isCritical && 'bg-red-50 dark:bg-red-950/20',
                      )}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <span className="text-muted-foreground font-mono">#{t.id}</span>
                      <span className="truncate font-medium flex items-center gap-1">
                        {t.isMilestone && <span className="text-amber-500">◆</span>}
                        <span className="truncate">{t.title}</span>
                      </span>
                      <span>
                        {t.assignee && (
                          <span className="flex items-center gap-1">
                            <UserAvatar user={t.assignee} size="sm" />
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {t.startDate ? format(parseISO(t.startDate), 'MMM d') : '—'}
                      </span>
                      <span className="text-muted-foreground">
                        {t.effort != null ? `${t.effort}h` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={65}>
            <div className="h-full flex flex-col">
              <div className="shrink-0 bg-muted/50 border-b overflow-hidden" style={{ height: HEADER_HEIGHT }}>
                <div style={{ width: totalWidth }}>
                  <div className="relative h-[22px]">
                    {headerLabels.filter((l) => l.isMonth).map((l, i) => (
                      <span key={i} className="absolute text-[10px] font-semibold text-muted-foreground top-1" style={{ left: l.x + 4 }}>
                        {l.text}
                      </span>
                    ))}
                  </div>
                  <div className="relative h-[32px] flex">
                    {headerLabels.filter((l) => !l.isMonth).map((l, i) => (
                      <span
                        key={i}
                        className={cn(
                          'absolute text-[10px] flex items-center justify-center top-0',
                          l.isToday && 'font-bold text-emerald-600',
                          l.isWeekend && 'text-muted-foreground/40',
                          !l.isToday && !l.isWeekend && 'text-muted-foreground',
                        )}
                        style={{ left: l.x, width: zoom === 'week' ? colWidth * 7 : colWidth }}
                      >
                        {l.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div ref={rightScrollRef} onScroll={onRightScroll} className="flex-1 overflow-auto">
                <div className="relative" style={{ width: totalWidth, minHeight: tasks.length * ROW_HEIGHT }}>
                  {zoom === 'day' && dates.map((d, i) => (
                    isWeekend(d) ? (
                      <div key={i} className="absolute top-0 bottom-0 bg-muted/30" style={{ left: i * colWidth, width: colWidth }} />
                    ) : null
                  ))}

                  {todayColIndex >= 0 && todayColIndex < totalDays && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20" style={{ left: todayColIndex * colWidth + colWidth / 2 }}>
                      <div className="absolute -top-1 -left-[5px] w-2.5 h-2.5 bg-red-500 rounded-full" />
                    </div>
                  )}

                  {zoom === 'day' && dates.map((d, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-border/30" style={{ left: i * colWidth, width: colWidth }} />
                  ))}

                  <svg className="absolute top-0 left-0" style={{ width: totalWidth, height: tasks.length * ROW_HEIGHT, pointerEvents: 'none', zIndex: 10 }}>
                    {depPaths.map((p) => (
                      <path key={p.key} d={p.d} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#arrowhead)" />
                    ))}
                    <defs>
                      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                      </marker>
                    </defs>
                  </svg>

                  {tasks.map((t, idx) => {
                    const x = getTaskX(t)
                    const w = getTaskWidth(t)
                    const progress = t.progress || 0
                    const isCritical = criticalIds.has(t.id)
                    const barY = idx * ROW_HEIGHT + (ROW_HEIGHT - 20) / 2
                    const isMilestone = t.isMilestone

                    return (
                      <div
                        key={t.id}
                        className={cn('absolute group', isCritical && 'drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]')}
                        style={{ top: barY, left: x, width: isMilestone ? MILESTONE_SIZE : w, height: 20, zIndex: 5 }}
                        title={`${t.title} (${t.type})\n${t.startDate || 'No start'} → ${t.dueDate || 'No due'}\nProgress: ${progress}%`}
                      >
                        {isMilestone ? (
                          <div
                            className={cn('w-full h-full flex items-center justify-center bg-amber-400', isCritical && 'ring-2 ring-red-500')}
                            style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                          />
                        ) : (
                          <div className={cn('relative w-full h-full rounded-sm overflow-hidden', TYPE_BG_COLORS[t.type] || 'bg-slate-400', isCritical && 'ring-2 ring-red-500 ring-offset-1')}>
                            <div className={cn('absolute inset-y-0 left-0 rounded-l-sm', TYPE_DARK_COLORS[t.type] || 'bg-slate-600')} style={{ width: `${Math.min(100, progress)}%` }} />
                            {w > 80 && (
                              <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-medium text-white truncate">{t.title}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
