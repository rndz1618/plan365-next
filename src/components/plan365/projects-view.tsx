'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Plus, Pencil, Trash2, Download, Users, ListChecks,
  CalendarDays, Search, FolderOpen, ArrowLeft, Columns3, GanttChart, List,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Project, type Task, PROJECT_STATUSES } from '@/store/plan365'
import { EmptyState, Avatar, LoadingSpinner, StatusBadge } from './shared'
import { KanbanView } from './kanban-view'
import { GanttView } from './gantt-view'
import { EmbeddedTaskList } from './embedded-task-list'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#6366f1',
]

type ProjectFormData = {
  name: string
  description: string
  color: string
  reference: string
  startDate: string
  dueDate: string
  status: string
}

const emptyForm: ProjectFormData = {
  name: '', description: '', color: PRESET_COLORS[0],
  reference: '', startDate: '', dueDate: '', status: 'Active',
}

function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
          <Skeleton className="h-2 w-24 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectForm({
  form, setForm, isEdit,
}: {
  form: ProjectFormData
  setForm: React.Dispatch<React.SetStateAction<ProjectFormData>>
  isEdit: boolean
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="proj-name">Project Name</Label>
        <Input
          id="proj-name"
          placeholder="e.g. Widget Assembly Line"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="proj-desc">Description</Label>
        <Textarea
          id="proj-desc"
          placeholder="Brief project description..."
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="proj-ref">Reference</Label>
          <Input
            id="proj-ref"
            placeholder="PRJ-001"
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
          />
        </div>
        {isEdit && (
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="proj-start">Start Date</Label>
          <Input
            id="proj-start"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proj-due">Due Date</Label>
          <Input
            id="proj-due"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Color</Label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-all',
                form.color === c
                  ? 'scale-110 border-foreground ring-2 ring-emerald-400 ring-offset-2 ring-offset-background'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type EnrichedProject = Project & { members?: { id: number; username: string; fullName: string | null }[]; doneTasks?: number }

export function ProjectsView() {
  const [projects, setProjects] = useState<EnrichedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New project dialog
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState<ProjectFormData>({ ...emptyForm })
  const [newSaving, setNewSaving] = useState(false)

  // Edit project dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [editForm, setEditForm] = useState<ProjectFormData>({ ...emptyForm })
  const [editSaving, setEditSaving] = useState(false)

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EnrichedProject | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Project detail view state
  const [selectedProject, setSelectedProject] = useState<EnrichedProject | null>(null)
  const [detailTab, setDetailTab] = useState('kanban')

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to load projects')
      const raw = await res.json()
      const list = raw.projects || raw || []
      // Enrich with member info and done task count
      const enriched = await Promise.all(
        list.map(async (p: any) => {
          let members: { id: number; username: string; fullName: string | null }[] = []
          let doneTasks = 0
          try {
            const [membersRes, tasksRes] = await Promise.all([
              fetch(`/api/projects/${p.id}/members`),
              fetch(`/api/projects/${p.id}/tasks`),
            ])
            if (membersRes.ok) members = await membersRes.json()
            if (tasksRes.ok) {
              const tasks: Task[] = await tasksRes.json()
              doneTasks = tasks.filter((t) => t.status === 'Done').length
            }
          } catch {
            // silently skip enrichment
          }
          return { ...p, members, doneTasks }
        })
      )
      setProjects(enriched)
    } catch {
      // handled by empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreate = async () => {
    if (!newForm.name.trim()) return
    try {
      setNewSaving(true)
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newForm.name,
          description: newForm.description || null,
          color: newForm.color,
          reference: newForm.reference || null,
          startDate: newForm.startDate || null,
          dueDate: newForm.dueDate || null,
        }),
      })
      if (!res.ok) throw new Error()
      setNewOpen(false)
      setNewForm({ ...emptyForm })
      fetchProjects()
    } catch {
      // error handled silently
    } finally {
      setNewSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editProject || !editForm.name.trim()) return
    try {
      setEditSaving(true)
      const res = await fetch(`/api/projects/${editProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          color: editForm.color,
          reference: editForm.reference || null,
          status: editForm.status,
          startDate: editForm.startDate || null,
          dueDate: editForm.dueDate || null,
        }),
      })
      if (!res.ok) throw new Error()
      setEditOpen(false)
      setEditProject(null)
      fetchProjects()
    } catch {
      // error handled silently
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeleteOpen(false)
      // If deleted project was selected in detail view, go back to list
      if (selectedProject?.id === deleteTarget.id) {
        setSelectedProject(null)
      }
      // Clean up store: if deleted project was the global selected project, reset it
      const { useAppStore } = await import('@/store/plan365')
      const store = useAppStore.getState()
      if (store.selectedProjectId === deleteTarget.id) {
        const remaining = store.projects.filter(p => p.id !== deleteTarget.id)
        store.setProjects(remaining)
        store.setSelectedProjectId(remaining.length > 0 ? remaining[0].id : null)
      } else {
        store.setProjects(store.projects.filter(p => p.id !== deleteTarget.id))
      }
      setDeleteTarget(null)
      fetchProjects()
    } catch {
      // error handled silently
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (project: Project) => {
    setEditProject(project)
    setEditForm({
      name: project.name,
      description: project.description || '',
      color: project.color,
      reference: project.reference || '',
      startDate: project.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : '',
      dueDate: project.dueDate ? format(parseISO(project.dueDate), 'yyyy-MM-dd') : '',
      status: project.status,
    })
    setEditOpen(true)
  }

  const openDelete = (project: EnrichedProject) => {
    setDeleteTarget(project)
    setDeleteOpen(true)
  }

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.reference || '').toLowerCase().includes(search.toLowerCase())
  )

  const getCompletionPercent = (project: (typeof projects)[0]) => {
    const total = project._count?.tasks || 0
    if (total === 0) return 0
    return Math.round((project.doneTasks || 0) / total * 100)
  }

  const openEditFromDetail = (_task: Task) => {
    // Task edit dialog lives in tasks-view; no-op for now
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  // ---- Mode 2: Project Detail View ----
  if (selectedProject) {
    return (
      <div className="flex flex-col h-full">
        {/* Detail header */}
        <div className="flex items-center gap-3 pb-4 border-b shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setSelectedProject(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: selectedProject.color }}
          />
          <h2 className="text-lg font-semibold truncate min-w-0">
            {selectedProject.name}
          </h2>
          <StatusBadge status={selectedProject.status} />
          <span className="ml-auto text-sm text-muted-foreground shrink-0 flex items-center gap-1">
            <ListChecks className="h-4 w-4" />
            {selectedProject._count?.tasks ?? 0} tasks
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 shrink-0"
            onClick={() => openEdit(selectedProject)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 shrink-0"
            onClick={() => openDelete(selectedProject)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Task tabs */}
        <Tabs value={detailTab} onValueChange={setDetailTab} className="flex flex-col flex-1 min-h-0 mt-2">
          <TabsList className="shrink-0 w-fit">
            <TabsTrigger value="kanban" className="gap-1.5">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-1.5">
              <GanttChart className="h-4 w-4" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="flex-1 min-h-0 mt-2">
            <KanbanView projectId={selectedProject.id} />
          </TabsContent>
          <TabsContent value="gantt" className="flex-1 min-h-0 mt-2">
            <GanttView projectId={selectedProject.id} embedded />
          </TabsContent>
          <TabsContent value="list" className="flex-1 min-h-0 mt-2">
            <EmbeddedTaskList projectId={selectedProject.id} onEditTask={openEditFromDetail} />
          </TabsContent>
        </Tabs>

        {/* Keep dialogs always rendered */}
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Project</DialogTitle>
              <DialogDescription>Create a new project to organize your tasks and team.</DialogDescription>
            </DialogHeader>
            <ProjectForm form={newForm} setForm={setNewForm} isEdit={false} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newForm.name.trim() || newSaving}>
                {newSaving ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditProject(null) } setEditOpen(open) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project details and settings.</DialogDescription>
            </DialogHeader>
            <ProjectForm form={editForm} setForm={setEditForm} isEdit={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditProject(null) }}>Cancel</Button>
              <Button onClick={handleEdit} disabled={!editForm.name.trim() || editSaving}>
                {editSaving ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription className="mt-1">
                    This action <span className="font-semibold text-red-600 dark:text-red-400">cannot be undone</span>.
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-4 space-y-2">
              <p className="text-sm font-medium">Project: <span className="text-foreground">{deleteTarget?.name}</span></p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <span><span className="font-semibold text-foreground">{deleteTarget?._count?.tasks ?? 0}</span> tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span><span className="font-semibold text-foreground">{deleteTarget?._count?.members ?? deleteTarget?.members?.length ?? 0}</span> members</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All tasks, members, conversations, and task dependencies will be permanently deleted.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDelete() }}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {deleting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ---- Mode 1: Project List View ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/export?type=projects">
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </a>
          </Button>
          <Button size="sm" onClick={() => { setNewForm({ ...emptyForm }); setNewOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          message={search ? 'No projects match your search' : 'No projects yet. Create your first project!'}
          icon={FolderOpen}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const pct = getCompletionPercent(project)
            return (
              <Card
                key={project.id}
                className={cn('cursor-pointer overflow-hidden transition-shadow hover:shadow-md border-l-4')}
                style={{ borderLeftColor: project.color }}
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="space-y-4 p-5">
                  {/* Header: name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{project.name}</h3>
                      {project.reference && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{project.reference}</p>
                      )}
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                  )}

                  {/* Date range */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {project.startDate
                      ? `${format(parseISO(project.startDate), 'MMM d, yyyy')}`
                      : 'No start date'}
                    {project.dueDate && (
                      <>
                        <span className="mx-1">—</span>
                        {format(parseISO(project.dueDate), 'MMM d, yyyy')}
                      </>
                    )}
                  </div>

                  {/* Task/Member counts + Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        {project._count?.tasks || 0} tasks
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {project._count?.members || 0} members
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                    </div>
                  </div>

                  {/* Member avatars */}
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 3).map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white ring-2 ring-background"
                            title={m.fullName || m.username}
                          >
                            {m.fullName
                              ? (m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase())
                              : m.username.slice(0, 2).toUpperCase()}
                          </span>
                        ))}
                        {project.members.length > 3 && (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                            +{project.members.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-1 border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); openEdit(project) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); openDelete(project) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new project to organize your tasks and team.</DialogDescription>
          </DialogHeader>
          <ProjectForm form={newForm} setForm={setNewForm} isEdit={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newForm.name.trim() || newSaving}>
              {newSaving ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditProject(null) } setEditOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details and settings.</DialogDescription>
          </DialogHeader>
          <ProjectForm form={editForm} setForm={setEditForm} isEdit={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditProject(null) }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editForm.name.trim() || editSaving}>
              {editSaving ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  This action <span className="font-semibold text-red-600 dark:text-red-400">cannot be undone</span>.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-4 space-y-2">
            <p className="text-sm font-medium">Project: <span className="text-foreground">{deleteTarget?.name}</span></p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-semibold text-foreground">{deleteTarget?._count?.tasks ?? 0}</span> tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-semibold text-foreground">{deleteTarget?._count?.members ?? deleteTarget?.members?.length ?? 0}</span> members</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All tasks, members, conversations, and task dependencies will be permanently deleted.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
              Delete Project
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
