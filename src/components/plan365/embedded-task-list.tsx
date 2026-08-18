'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { STATUSES, PRIORITIES, TASK_TYPES, type Task, type User } from '@/store/plan365'
import { StatusBadge, PriorityBadge, TypeBadge, UserAvatar, EmptyState, LoadingSpinner } from './shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ListChecks } from 'lucide-react'

const STATUS_CYCLE = ['Todo', 'In Progress', 'Review', 'Testing', 'Done']

function nextStatus(current: string): string {
  const idx = STATUS_CYCLE.indexOf(current as typeof STATUS_CYCLE[number])
  return idx >= 0 && idx < STATUS_CYCLE.length - 1 ? STATUS_CYCLE[idx + 1] : STATUS_CYCLE[0]
}

interface EmbeddedTaskListProps {
  projectId: number
  onEditTask?: (task: Task) => void
  showProject?: boolean
}

export function EmbeddedTaskList({ projectId, onEditTask, showProject = false }: EmbeddedTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}&deps=true`)
      if (res.ok) {
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : data.tasks ?? [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleStatusCycle = useCallback(async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    const next = nextStatus(task.status)
    try {
      const res = await fetch(`/api/tasks/${task.id}/status?status=${encodeURIComponent(next)}`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
        )
      }
    } catch {
      // silently fail
    }
  }, [])

  const isOverdue = (date: string | null, status: string) => {
    if (!date || status === 'Done') return false
    return new Date(date) < new Date(new Date().toDateString())
  }

  if (loading) {
    return <LoadingSpinner className="py-12" />
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        message="No tasks yet. Create your first task to get started."
        icon={ListChecks}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with count */}
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Tasks</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs tabular-nums">
          {tasks.length}
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 min-w-[200px]">
                Title
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[110px]">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[90px]">
                Priority
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[100px]">
                Assignee
              </TableHead>
              {showProject && (
                <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[120px]">
                  Project
                </TableHead>
              )}
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[80px]">
                Start
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[80px]">
                Due
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[60px] text-center">
                Effort
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-9 w-[90px]">
                Progress
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const overdueStart = isOverdue(task.startDate, task.status)
              const overdueDue = isOverdue(task.dueDate, task.status)

              return (
                <TableRow
                  key={task.id}
                  className="cursor-pointer group"
                  onClick={() => onEditTask?.(task)}
                >
                  {/* Title + Type */}
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeBadge type={task.type} className="shrink-0 text-[10px] px-1.5 py-0" />
                      <span className="text-sm font-medium truncate group-hover:text-emerald-600 transition-colors">
                        {task.title}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-2">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => handleStatusCycle(e, task)}
                      title="Click to cycle status"
                    >
                      <StatusBadge status={task.status} className="text-[10px] px-1.5 py-0" />
                    </div>
                  </TableCell>

                  {/* Priority */}
                  <TableCell className="py-2">
                    <PriorityBadge priority={task.priority} className="text-[10px] px-1.5 py-0" />
                  </TableCell>

                  {/* Assignee */}
                  <TableCell className="py-2">
                    {task.assignee ? (
                      <UserAvatar user={task.assignee} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Project (conditional) */}
                  {showProject && (
                    <TableCell className="py-2">
                      {task.project ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: task.project.color }}
                          />
                          <span className="text-xs truncate max-w-[90px]">
                            {task.project.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}

                  {/* Start Date */}
                  <TableCell className="py-2">
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        overdueStart && 'text-red-500 font-medium',
                      )}
                    >
                      {task.startDate ? format(new Date(task.startDate), 'MMM d') : '—'}
                    </span>
                  </TableCell>

                  {/* Due Date */}
                  <TableCell className="py-2">
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        overdueDue && 'text-red-500 font-medium',
                      )}
                    >
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                    </span>
                  </TableCell>

                  {/* Effort */}
                  <TableCell className="py-2 text-center">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {task.effort != null ? `${task.effort}d` : '—'}
                    </span>
                  </TableCell>

                  {/* Progress */}
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={task.progress}
                        className="h-1.5 w-14"
                      />
                      <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
                        {task.progress}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
