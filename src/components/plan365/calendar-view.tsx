'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, isToday, format, startOfWeek, endOfWeek, parseISO,
  isWithinInterval, isAfter, isBefore, startOfDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useAppStore, Task, TASK_TYPES, PRIORITIES, STATUSES, TYPE_COLORS } from '@/store/plan365'
import { LoadingSpinner, EmptyState } from './shared'

// ---------- Color extraction helpers ----------

const TYPE_BORDER_COLORS: Record<string, string> = {
  '2D CAD': 'border-l-violet-500',
  'CAD': 'border-l-sky-500',
  'CAM': 'border-l-emerald-500',
  'Tools': 'border-l-orange-500',
  'Others': 'border-l-slate-400',
}

const TYPE_DOT_COLORS: Record<string, string> = {
  '2D CAD': 'bg-violet-500',
  'CAD': 'bg-sky-500',
  'CAM': 'bg-emerald-500',
  'Tools': 'bg-orange-500',
  'Others': 'bg-slate-400',
}

// ---------- Task Edit Dialog ----------

interface TaskEditDialogProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function TaskEditDialog({ task, open, onClose, onSaved }: TaskEditDialogProps) {
  const [form, setForm] = useState({
    title: '', status: 'Todo', priority: 'Medium', type: 'Others',
    startDate: '', dueDate: '', isMilestone: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        status: task.status,
        priority: task.priority,
        type: task.type,
        startDate: task.startDate?.slice(0, 10) || '',
        dueDate: task.dueDate?.slice(0, 10) || '',
        isMilestone: task.isMilestone,
      })
    }
  }, [task])

  const handleSave = async () => {
    if (!task) return
    setSaving(true)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      onSaved()
      onClose()
    } catch {
      /* handled silently */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isMilestone} onCheckedChange={(c) => setForm({ ...form, isMilestone: c })} />
            <Label>Milestone</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Mobile List View ----------

function MobileListView({
  days,
  tasksForDay,
  onTaskClick,
}: {
  days: Date[]
  tasksForDay: (day: Date) => Task[]
  onTaskClick: (t: Task) => void
}) {
  return (
    <div className="space-y-2">
      {days.map((day) => {
        const dayTasks = tasksForDay(day)
        if (dayTasks.length === 0) return null
        return (
          <div key={day.toISOString()} className="rounded-lg border bg-card">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
              <span className={cn(
                'text-sm font-semibold min-w-[28px] text-center',
                isToday(day) && 'bg-emerald-600 text-white rounded-full w-7 h-7 flex items-center justify-center',
              )}>
                {format(day, 'd')}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(day, 'EEE, MMM d')}
              </span>
            </div>
            <div className="divide-y">
              {dayTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTaskClick(t)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <span className={cn('w-1 h-8 rounded-full shrink-0', TYPE_DOT_COLORS[t.type] || 'bg-slate-400')} />
                  <span className="text-sm truncate flex-1">
                    {t.isMilestone && <span className="mr-1">◆</span>}
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Calendar View ----------

export function CalendarView() {
  const { selectedProjectId } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedProjectId) params.set('projectId', String(selectedProjectId))
      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : data.tasks || [])
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Calendar days
  const { weeks, days } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const allDays = eachDayOfInterval({ start: calStart, end: calEnd })
    const w: Date[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      w.push(allDays.slice(i, i + 7))
    }
    return { weeks: w, days: allDays }
  }, [currentMonth])

  // Tasks for a given day (multi-day tasks span)
  const tasksForDay = useCallback((day: Date) => {
    const d = startOfDay(day)
    return tasks.filter((t) => {
      if (!t.startDate && !t.dueDate) return false
      const s = t.startDate ? parseISO(t.startDate) : null
      const e = t.dueDate ? parseISO(t.dueDate) : null
      if (s && e) return isWithinInterval(d, { start: startOfDay(s), end: startOfDay(e) })
      if (s) return isSameDay(d, s) || isAfter(d, s)
      if (e) return isSameDay(d, e) || isBefore(d, e)
      return false
    })
  }, [tasks])

  const handleTaskClick = (t: Task) => {
    setEditTask(t)
    setDialogOpen(true)
  }

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  if (loading) return <LoadingSpinner className="h-[60vh]" />

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Calendar</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="px-3">
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>
      </div>

      {/* Grid View (desktop) */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b bg-muted/50 shrink-0">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b last:border-b-0 min-h-[100px]">
              {week.map((day) => {
                const dayTasks = tasksForDay(day)
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)
                const showTasks = dayTasks.slice(0, 3)
                const moreCount = dayTasks.length - 3

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'border-r last:border-r-0 p-1 min-h-[100px] transition-colors hover:bg-muted/30',
                      !inMonth && 'bg-muted/20',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center text-sm h-7 w-7 rounded-full font-medium',
                        today && 'bg-emerald-600 text-white',
                        !today && !inMonth && 'text-muted-foreground/50',
                        !today && inMonth && 'text-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {showTasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTaskClick(t)}
                          className={cn(
                            'w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded border-l-2 truncate hover:opacity-80 transition-opacity',
                            TYPE_BORDER_COLORS[t.type] || 'border-l-slate-400',
                            TYPE_COLORS[t.type] || TYPE_COLORS['Others'],
                          )}
                          title={t.title}
                        >
                          {t.isMilestone && <span className="mr-0.5">◆</span>}
                          {t.title}
                        </button>
                      ))}
                      {moreCount > 0 && (
                        <span className="block text-[11px] text-muted-foreground px-1.5">
                          +{moreCount} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile list view */}
      <div className="md:hidden flex-1 overflow-y-auto p-3">
        <MobileListView days={days} tasksForDay={tasksForDay} onTaskClick={handleTaskClick} />
      </div>

      {/* Edit Dialog */}
      <TaskEditDialog
        task={editTask}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTask(null) }}
        onSaved={fetchTasks}
      />
    </div>
  )
}
