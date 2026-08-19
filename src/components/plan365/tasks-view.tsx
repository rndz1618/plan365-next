'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, BookTemplate,
  Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2,
  List, Columns3, GanttChart,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAppStore, STATUSES, PRIORITIES, TASK_TYPES, type Task, type TaskTemplate, type User } from '@/store/plan365'
import { StatusBadge, PriorityBadge, TypeBadge, UserAvatar, EmptyState } from './shared'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KanbanView } from './kanban-view'
import { GanttView } from './gantt-view'

const STATUS_CYCLE = ['Todo', 'In Progress', 'Review', 'Testing', 'Done'] as const
const PAGE_SIZES = [10, 20, 50]

function nextStatus(current: string): string {
  const idx = STATUS_CYCLE.indexOf(current as typeof STATUS_CYCLE[number])
  return idx >= 0 && idx < STATUS_CYCLE.length - 1 ? STATUS_CYCLE[idx + 1] : STATUS_CYCLE[0]
}

function parseDate(val: string | null | undefined): string {
  if (!val) return ''
  try { return format(new Date(val), 'yyyy-MM-dd') } catch { return '' }
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  try { return format(new Date(val), 'MMM d') } catch { return '—' }
}

function sortByStartDate(list: Task[]): Task[] {
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

function emptyForm(projectId: number | null) {
  return {
    title: '', description: '', type: 'Others', status: 'Todo', priority: 'Medium',
    startDate: '', dueDate: '', effort: null as number | null, labels: '',
    assigneeId: '' as string, isMilestone: false, projectId: projectId ?? 0,
  }
}

export function TasksView() {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId)
  const projects = useAppStore((s) => s.projects)
  const setProjects = useAppStore((s) => s.setProjects)

  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'startDate', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [templateTasks, setTemplateTasks] = useState<{ title: string; effort: number | null; startDate: string; dueDate: string }[]>([])
  const [templateStep, setTemplateStep] = useState<'list' | 'edit'>('list')
  const [activeTab, setActiveTab] = useState('list')
  const [form, setForm] = useState(emptyForm(selectedProjectId))
  const [saving, setSaving] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('deps', 'true')
      params.set('sort', 'startDate')
      params.set('order', 'asc')
      if (selectedProjectId) params.set('projectId', String(selectedProjectId))
      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        const list: Task[] = Array.isArray(data) ? data : data.tasks ?? []
        setTasks(sortByStartDate(list))
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err)
    }
    setLoading(false)
  }, [selectedProjectId])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : data.users ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) return
      const data = await res.json()
      const list = data.projects || data || []
      setProjects(Array.isArray(list) ? list : [])
    } catch { /* ignore */ }
  }, [setProjects])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { if (newDialogOpen) fetchProjects() }, [newDialogOpen, fetchProjects])

  const cycleStatus = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = nextStatus(task.status)
    try {
      const res = await fetch(`/api/tasks/${task.id}/status?status=${encodeURIComponent(next)}`, { method: 'PATCH' })
      if (res.ok) fetchTasks()
    } catch { /* ignore */ }
  }

  const confirmDelete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTaskId(task.id)
    setDeleteDialogOpen(true)
  }

  const doDelete = async () => {
    if (!deleteTaskId) return
    try {
      const res = await fetch(`/api/tasks/${deleteTaskId}`, { method: 'DELETE' })
      if (res.ok) fetchTasks()
    } catch { /* ignore */ }
    setDeleteDialogOpen(false)
    setDeleteTaskId(null)
  }

  const handleNewTask = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const projectId = form.projectId || selectedProjectId || 0
      if (!projectId) { setSaving(false); return }
      const body = {
        ...form,
        projectId,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        effort: form.effort ? Number(form.effort) : null,
      }
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setNewDialogOpen(false)
        setForm(emptyForm(selectedProjectId))
        fetchTasks()
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const openEdit = (task: Task) => {
    setEditTask(task)
    setForm({
      title: task.title, description: task.description ?? '', type: task.type, status: task.status,
      priority: task.priority, startDate: parseDate(task.startDate), dueDate: parseDate(task.dueDate),
      effort: task.effort, labels: task.labels, assigneeId: task.assigneeId ? String(task.assigneeId) : '',
      isMilestone: task.isMilestone, projectId: task.projectId,
    })
    setEditDialogOpen(true)
  }

  const handleEditTask = async () => {
    if (!editTask || !form.title.trim()) return
    setSaving(true)
    try {
      const body = {
        ...form,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        effort: form.effort ? Number(form.effort) : null,
      }
      const res = await fetch(`/api/tasks/${editTask.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setEditDialogOpen(false)
        setEditTask(null)
        fetchTasks()
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const openTemplateWizard = async () => {
    setTemplateStep('list')
    setSelectedTemplate(null)
    setTemplateTasks([])
    setTemplateDialogOpen(true)
    try {
      const res = await fetch('/api/templates')
      if (res.ok) setTemplates(await res.json())
    } catch { /* ignore */ }
  }

  const selectTemplate = async (tmpl: TaskTemplate) => {
    setSelectedTemplate(tmpl)
    try {
      const parsed = JSON.parse(tmpl.tasksJson)
      setTemplateTasks(parsed.map((t: { title?: string; effort?: number | null }) => ({
        title: t.title ?? '', effort: t.effort ?? null, startDate: '', dueDate: '',
      })))
    } catch { setTemplateTasks([]) }
    setTemplateStep('edit')
  }

  const updateTemplateTask = (idx: number, field: string, value: string | number | null) => {
    setTemplateTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }

  const createFromTemplate = async () => {
    if (!selectedTemplate || !selectedProjectId) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks/from-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate.id, projectId: selectedProjectId, tasks: templateTasks }),
      })
      if (res.ok) { setTemplateDialogOpen(false); fetchTasks() }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter)
    if (priorityFilter !== 'all') result = result.filter((t) => t.priority === priorityFilter)
    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.assignee?.fullName ?? t.assignee?.username ?? '').toLowerCase().includes(q) ||
        t.labels.toLowerCase().includes(q),
      )
    }
    return result
  }, [tasks, statusFilter, priorityFilter, typeFilter, search])

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label="Select all" />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="Select row" />
      ),
      enableSorting: false, size: 40,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <SortHeader column={column} title="Title" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="font-medium truncate max-w-[240px]">{row.original.title}</span>
          <TypeBadge type={row.original.type} className="shrink-0" />
          {row.original.isMilestone && (
            <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30">◆ Milestone</Badge>
          )}
        </div>
      ),
      size: 300,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <SortHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <button onClick={(e) => cycleStatus(row.original, e)} className="cursor-pointer">
          <StatusBadge status={row.original.status} />
        </button>
      ),
      size: 130,
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => <SortHeader column={column} title="Priority" />,
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />, size: 100,
    },
    {
      accessorKey: 'assignee', header: 'Assignee',
      cell: ({ row }) => {
        const a = row.original.assignee
        return a ? <UserAvatar user={a} size="sm" /> : <span className="text-muted-foreground text-xs">Unassigned</span>
      },
      size: 80,
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => <SortHeader column={column} title="Start" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDate(row.original.startDate)}</span>,
      size: 90,
    },
    {
      accessorKey: 'dueDate',
      header: ({ column }) => <SortHeader column={column} title="Due" />,
      cell: ({ row }) => (
        <span className={cn('text-xs', row.original.dueDate && new Date(row.original.dueDate) < new Date() && row.original.status !== 'Done' ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
          {fmtDate(row.original.dueDate)}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: 'effort',
      header: ({ column }) => <SortHeader column={column} title="Effort" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.effort ? `${row.original.effort}h` : '—'}</span>,
      size: 70,
    },
    {
      accessorKey: 'progress',
      header: ({ column }) => <SortHeader column={column} title="Progress" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={row.original.progress} className="h-2 w-16" />
          <span className="text-xs text-muted-foreground w-8">{row.original.progress}%</span>
        </div>
      ),
      size: 120,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={(e) => confirmDelete(row.original, e)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      ),
      size: 40,
    },
  ], [filteredTasks])

  const table = useReactTable({
    data: filteredTasks,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const csvUrl = selectedProjectId
    ? `/api/export?type=tasks&projectId=${selectedProjectId}`
    : '/api/export?type=tasks'

  if (loading) return <TasksSkeleton />

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger size="sm" className="w-[120px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger size="sm" className="w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openTemplateWizard}>
            <BookTemplate className="h-4 w-4 mr-1.5" />Create from Template
          </Button>
          <a href={csvUrl} download><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />CSV</Button></a>
          <Button size="sm" onClick={() => { setForm(emptyForm(selectedProjectId)); setNewDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1.5" />New Task
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5"><List className="h-4 w-4" /> List</TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5"><Columns3 className="h-4 w-4" /> Kanban</TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1.5"><GanttChart className="h-4 w-4" /> Gantt</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="flex-1 min-h-0 overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <EmptyState message="No tasks found. Adjust your filters or create a new task." />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id} style={{ width: header.getSize() }}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => openEdit(row.original)} data-state={row.getIsSelected() ? 'selected' : undefined}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">{table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} selected</span>
                <div className="flex items-center gap-2">
                  <Select value={String(table.getState().pagination.pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                    <SelectTrigger size="sm" className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="kanban" className="flex-1 min-h-0">
          <KanbanView projectId={selectedProjectId ?? undefined} />
        </TabsContent>
        <TabsContent value="gantt" className="flex-1 min-h-0">
          <GanttView projectId={selectedProjectId ?? undefined} embedded />
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} form={form} setForm={setForm} users={users} projects={projects} selectedProjectId={selectedProjectId} saving={saving} onSubmit={handleNewTask} title="New Task" description="Create a new task for your project." />
      <TaskFormDialog open={editDialogOpen} onOpenChange={(v) => { setEditDialogOpen(v); if (!v) setEditTask(null) }} form={form} setForm={setForm} users={users} projects={projects} selectedProjectId={selectedProjectId} saving={saving} onSubmit={handleEditTask} title="Edit Task" description={`Editing: ${editTask?.title ?? ''}`} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this task? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Create from Template</DialogTitle>
            <DialogDescription>
              {templateStep === 'list' ? 'Select a template to create tasks from.' : `Edit tasks from "${selectedTemplate?.name}" before creating.`}
            </DialogDescription>
          </DialogHeader>
          {templateStep === 'list' ? (
            <ScrollArea className="h-[400px] pr-2">
              {templates.length === 0 ? <EmptyState message="No templates available." /> : (
                <div className="grid gap-3">
                  {templates.map((tmpl) => (
                    <button key={tmpl.id} className="flex items-start gap-4 rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors" onClick={() => selectTemplate(tmpl)}>
                      <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2 shrink-0"><BookTemplate className="h-5 w-5 text-emerald-600" /></div>
                      <div className="min-w-0">
                        <div className="font-medium">{tmpl.name}</div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{tmpl.description || 'No description'}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{tmpl.category}</Badge>
                          <Badge variant="outline" className="text-xs">{tmpl.type}</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          ) : (
            <ScrollArea className="h-[400px] pr-2">
              <div className="grid gap-3">
                {templateTasks.map((tt, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_120px_120px] gap-2 items-end rounded-lg border p-3">
                    <div><Label className="text-xs text-muted-foreground">Title</Label><Input value={tt.title} onChange={(e) => updateTemplateTask(idx, 'title', e.target.value)} className="h-8 mt-1" /></div>
                    <div><Label className="text-xs text-muted-foreground">Effort (h)</Label><Input type="number" value={tt.effort ?? ''} onChange={(e) => updateTemplateTask(idx, 'effort', e.target.value ? Number(e.target.value) : null)} className="h-8 mt-1" /></div>
                    <div><Label className="text-xs text-muted-foreground">Start</Label><Input type="date" value={tt.startDate} onChange={(e) => updateTemplateTask(idx, 'startDate', e.target.value)} className="h-8 mt-1" /></div>
                    <div><Label className="text-xs text-muted-foreground">Due</Label><Input type="date" value={tt.dueDate} onChange={(e) => updateTemplateTask(idx, 'dueDate', e.target.value)} className="h-8 mt-1" /></div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            {templateStep === 'edit' && <Button variant="outline" onClick={() => setTemplateStep('list')}>Back</Button>}
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            {templateStep === 'edit' && (
              <Button onClick={createFromTemplate} disabled={saving || !selectedProjectId}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Create {templateTasks.length} Tasks
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SortHeader({ column, title }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void }; title: string }) {
  const sorted = column.getIsSorted()
  return (
    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => column.toggleSorting(sorted === 'asc')}>
      {title}
      {sorted === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : sorted === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
    </button>
  )
}

function TaskFormDialog({
  open, onOpenChange, form, setForm, users, projects, selectedProjectId, saving, onSubmit, title, description,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  form: ReturnType<typeof emptyForm>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyForm>>>
  users: User[]
  projects: { id: number; name: string }[]
  selectedProjectId: number | null
  saving: boolean
  onSubmit: () => void
  title: string
  description: string
}) {
  const update = (field: string, value: string | boolean | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Project *</Label>
            <Select value={form.projectId ? String(form.projectId) : selectedProjectId ? String(selectedProjectId) : ''} onValueChange={(v) => update('projectId', Number(v))}>
              <SelectTrigger><SelectValue placeholder={projects.length ? 'Select project' : 'No projects yet'} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Task title" />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Task description" rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update('priority', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Effort (hours)</Label>
              <Input type="number" value={form.effort ?? ''} onChange={(e) => update('effort', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 8" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Labels (comma-separated)</Label>
            <Input value={form.labels} onChange={(e) => update('labels', e.target.value)} placeholder="design, review, urgent" />
          </div>
          <div className="grid gap-1.5">
            <Label>Assignee</Label>
            <Select value={form.assigneeId || '__none__'} onValueChange={(v) => update('assigneeId', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.isMilestone} onCheckedChange={(v) => update('isMilestone', v)} />
            <Label>Mark as Milestone</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {title === 'New Task' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TasksSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border bg-card">
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-48" /><Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-10" /><Skeleton className="h-2 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
