'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { scheduleSubTasksFromTemplate, type ScheduledSubTask } from '@/lib/subtask-schedule'
import { STATUSES, PRIORITIES, TASK_TYPES, type Task, type TaskTemplate, type User } from '@/store/plan365'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function emptyForm(projectId: number | null) {
  return {
    title: '', description: '', type: 'Others', status: 'Todo', priority: 'Medium',
    startDate: '', dueDate: '', effort: null as number | null, labels: '',
    assigneeId: '' as string, isMilestone: false, projectId: projectId ?? 0,
    templateId: '' as string,
  }
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

/** Parent first, then its children (by startDate), then next parent. */
export function sortWithSubtasks(list: Task[]): Task[] {
  const parents = list.filter((t) => !t.parentId)
  const children = list.filter((t) => t.parentId)
  const byParent = new Map<number, Task[]>()
  for (const c of children) {
    const pid = c.parentId!
    if (!byParent.has(pid)) byParent.set(pid, [])
    byParent.get(pid)!.push(c)
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => {
      const as = a.startDate ? new Date(a.startDate).getTime() : 0
      const bs = b.startDate ? new Date(b.startDate).getTime() : 0
      return as - bs || a.id - b.id
    })
  }
  const parentsSorted = sortByStartDate(parents)
  const out: Task[] = []
  for (const p of parentsSorted) {
    out.push(p)
    out.push(...(byParent.get(p.id) || []))
  }
  const placed = new Set(out.map((t) => t.id))
  for (const c of children) {
    if (!placed.has(c.id)) out.push(c)
  }
  return out
}

export function TaskFormDialog({
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
  const isNew = title === 'New Task'
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [preview, setPreview] = useState<ScheduledSubTask[]>([])

  const update = (field: string, value: string | boolean | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (!open || !isNew) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/templates')
        if (res.ok && !cancelled) setTemplates(await res.json())
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [open, isNew])

  useEffect(() => {
    if (!isNew || !form.templateId) {
      setPreview([])
      return
    }
    const tmpl = templates.find((x) => String(x.id) === form.templateId)
    if (!tmpl) {
      setPreview([])
      return
    }
    try {
      const raw = JSON.parse(tmpl.tasksJson || '[]') as Array<{ title?: string; type?: string; priority?: string; effort?: number | null }>
      if (!Array.isArray(raw)) {
        setPreview([])
        return
      }
      setPreview(
        scheduleSubTasksFromTemplate(
          raw.map((t) => ({
            title: t.title || '',
            type: t.type,
            priority: t.priority,
            effort: t.effort,
          })),
          form.startDate || null,
        ),
      )
    } catch {
      setPreview([])
    }
  }, [isNew, form.templateId, form.startDate, templates])

  const assigneeLabel = form.assigneeId
    ? (users.find((u) => String(u.id) === form.assigneeId)?.fullName
      || users.find((u) => String(u.id) === form.assigneeId)?.username
      || 'Assignee')
    : 'Unassigned (same as parent)'

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

          {isNew && (
            <div className="grid gap-2 rounded-lg border p-3 bg-muted/20">
              <div className="grid gap-1.5">
                <Label>Sub-tasks from template (optional)</Label>
                <Select
                  value={form.templateId || '__none__'}
                  onValueChange={(v) => update('templateId', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="No template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No template</SelectItem>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={String(tmpl.id)}>{tmpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sub-tasks inherit assignee ({assigneeLabel}). Start/due auto-calculated from each item&apos;s effort (8h = 1 day), chained after parent start date.
                </p>
              </div>
              {preview.length > 0 && (
                <div className="rounded-md border divide-y bg-background max-h-48 overflow-y-auto">
                  {preview.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 text-sm">
                      <span className="text-muted-foreground font-mono text-xs w-5 pt-0.5">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {s.startDate} → {s.dueDate}
                          {s.effort != null ? ` · ${s.effort}h` : ''}
                          {' · '}{s.type} · {s.priority}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isNew ? (preview.length ? `Create + ${preview.length} sub-tasks` : 'Create') : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
