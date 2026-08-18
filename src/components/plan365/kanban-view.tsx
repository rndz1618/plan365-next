'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { GripVertical } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAppStore, STATUSES, type Task } from '@/store/plan365'
import { TypeBadge, UserAvatar, LoadingSpinner } from './shared'
import { Badge } from '@/components/ui/badge'

// ── Types ──
interface KanbanColumn {
  id: string
  title: string
  tasks: Task[]
}

interface BoardData {
  columns: KanbanColumn[]
}

// ── Column status dot colors ──
const COLUMN_DOT_COLORS: Record<string, string> = {
  'Todo': 'bg-zinc-400',
  'In Progress': 'bg-sky-500',
  'Review': 'bg-amber-500',
  'Testing': 'bg-violet-500',
  'Done': 'bg-emerald-500',
  'Blocked': 'bg-red-500',
  'Handoff': 'bg-cyan-500',
}

// ── Priority dot colors ──
const PRIORITY_DOTS: Record<string, string> = {
  'Critical': 'bg-red-500',
  'High': 'bg-orange-500',
  'Medium': 'bg-amber-400',
  'Low': 'bg-slate-400',
}

// ── All 7 kanban columns (ensure consistent order) ──
const KANBAN_COLUMNS: string[] = ['Todo', 'In Progress', 'Review', 'Testing', 'Done', 'Blocked', 'Handoff']

// ── Kanban Card ──
function KanbanCard({ task, onDragStart, onDragEnd }: { task: Task; onDragStart: (task: Task) => void; onDragEnd: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done'

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(task.id))
        onDragStart(task)
      }}
      onDragEnd={onDragEnd}
      className="cursor-grab active:cursor-grabbing transition-all rounded-lg border bg-card shadow-sm hover:shadow-md hover:border-emerald-300 active:shadow-lg active:scale-[1.02] select-none"
    >
      <div className="p-3 space-y-2.5">
        {/* Header: grip + title */}
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight line-clamp-2">{task.title}</p>
          </div>
        </div>

        {/* Type badge + Priority dot */}
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={task.type} className="text-[10px] px-1.5 py-0" />
          <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', PRIORITY_DOTS[task.priority] || PRIORITY_DOTS['Medium'])} title={task.priority} />
          {task.isMilestone && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-600">◆</Badge>
          )}
        </div>

        {/* Footer: assignee, due date, effort */}
        <div className="flex items-center justify-between pt-1">
          {task.assignee ? (
            <UserAvatar user={task.assignee} size="sm" />
          ) : (
            <span className="text-[10px] text-muted-foreground">Unassigned</span>
          )}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {task.dueDate && (
              <span className={cn(isOverdue && 'text-red-500 font-medium')}>
                {format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}
            {task.effort && (
              <span>{task.effort}h</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Kanban Column ──
function KanbanColumn({ column, isDragOver, onDragOver, onDragLeave, onDrop }: {
  column: KanbanColumn
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg bg-muted/40 transition-all duration-200 min-w-[280px] w-[280px] shrink-0',
        isDragOver && 'bg-emerald-50 dark:bg-emerald-950/20 ring-2 ring-emerald-400/50 scale-[1.01]',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b bg-muted/60 rounded-t-lg">
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', COLUMN_DOT_COLORS[column.id] || 'bg-zinc-400')} />
        <h3 className="text-sm font-semibold truncate">{column.title}</h3>
        <Badge
          variant="secondary"
          className="ml-auto h-5 min-w-[20px] justify-center text-[10px] px-1.5"
        >
          {column.tasks.length}
        </Badge>
      </div>

      {/* Task list (scrollable) */}
      <div
        ref={scrollRef}
        className="max-h-[calc(100vh-300px)] overflow-y-auto p-2 space-y-2 rounded-b-lg"
      >
        {column.tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <p className="text-xs text-muted-foreground/60">No tasks</p>
          </div>
        ) : (
          column.tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onDragStart={() => {}} onDragEnd={() => {}} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Kanban View ──
export function KanbanView({ projectId: propProjectId }: { projectId?: number | null }) {
  const { selectedProjectId } = useAppStore()
  const projectId = propProjectId ?? selectedProjectId
  const [board, setBoard] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null)

  // ── Fetch board ──
  const fetchBoard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', String(projectId))
      const res = await fetch(`/api/tasks/board?${params}`)
      if (res.ok) {
        const data = await res.json()
        setBoard(data)
      }
    } catch (err) {
      console.error('Failed to fetch board', err)
    }
    if (showLoading) setLoading(false)
  }, [projectId])

  // Fetch on mount and when projectId changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchBoard() }, [fetchBoard])

  // ── Ensure all 7 columns are present ──
  const columns: KanbanColumn[] = (() => {
    if (!board) return KANBAN_COLUMNS.map(id => ({ id, title: id, tasks: [] }))
    const colMap = new Map(board.columns.map(c => [c.id, c]))
    return KANBAN_COLUMNS.map(id => colMap.get(id) || { id, title: id, tasks: [] })
  })()

  const totalTasks = columns.reduce((sum, c) => sum + c.tasks.length, 0)

  // ── Find task in current board ──
  const findTask = useCallback((taskId: number): Task | null => {
    for (const col of columns) {
      const t = col.tasks.find(t => t.id === taskId)
      if (t) return t
    }
    return null
  }, [columns])

  // ── Find which column a task belongs to ──
  const findTaskColumn = useCallback((taskId: number): string | null => {
    for (const col of columns) {
      if (col.tasks.some(t => t.id === taskId)) return col.id
    }
    return null
  }, [columns])

  // ── Drag handlers ──
  const handleDragStart = useCallback((task: Task) => {
    setDraggedTaskId(task.id)
  }, [])

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }, [])

  const handleColumnDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    setDragOverColumn(null)

    const taskId = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!taskId) return

    const task = findTask(taskId)
    if (!task || task.status === targetColumnId) {
      setDraggedTaskId(null)
      return
    }

    const currentColumnId = findTaskColumn(taskId)
    if (!currentColumnId) return

    // Optimistic update: move task between columns
    setBoard(prev => {
      if (!prev) return prev
      return {
        columns: prev.columns.map(col => {
          if (col.id === currentColumnId) {
            return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) }
          }
          if (col.id === targetColumnId) {
            return { ...col, tasks: [...col.tasks, { ...task, status: targetColumnId }] }
          }
          return col
        }),
      }
    })

    setDraggedTaskId(null)

    // API call
    try {
      const res = await fetch(`/api/tasks/${taskId}/status?status=${encodeURIComponent(targetColumnId)}`, {
        method: 'PATCH',
      })
      if (!res.ok) {
        // Revert on failure
        fetchBoard()
      }
    } catch {
      fetchBoard()
    }
  }, [findTask, findTaskColumn, fetchBoard])

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''} across {columns.filter(c => c.tasks.length > 0).length} columns
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            isDragOver={dragOverColumn === column.id}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          />
        ))}
      </div>
    </div>
  )
}
