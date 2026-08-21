import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { cachedJson, noStoreJson } from '@/lib/cache-headers'
import { scheduleSubTasksFromTemplate } from '@/lib/subtask-schedule'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Not authenticated' }, 401)
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const type = searchParams.get('type')
    const assigneeId = searchParams.get('assigneeId')
    const search = searchParams.get('search')
    const includeDeps = searchParams.get('deps') === 'true'
    const parentOnly = searchParams.get('parentOnly') === 'true'
    const sort = searchParams.get('sort') || 'startDate'
    const order = searchParams.get('order') === 'desc' ? 'desc' : 'asc'

    const where: Record<string, unknown> = {}

    if (projectId) {
      where.projectId = parseInt(projectId, 10)
    } else if (user.role !== 'admin') {
      where.project = { members: { some: { userId: user.id } } }
    }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (type) where.type = type
    if (assigneeId) where.assigneeId = parseInt(assigneeId, 10)
    if (parentOnly) where.parentId = null

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const allowedSort = new Set([
      'startDate', 'dueDate', 'priority', 'title', 'status', 'createdAt', 'effort', 'progress',
    ])
    const sortField = allowedSort.has(sort) ? sort : 'startDate'

    const tasks = await db.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, username: true, fullName: true } },
        project: { select: { id: true, name: true, color: true } },
        ...(includeDeps
          ? {
              depsFrom: {
                include: { predecessor: { select: { id: true, title: true, status: true } } },
              },
              depsTo: {
                include: { successor: { select: { id: true, title: true, status: true } } },
              },
            }
          : {}),
      },
      orderBy: [{ [sortField]: order }, { dueDate: 'asc' }, { id: 'asc' }],
    })

    return cachedJson({ tasks }, { maxAge: 10, swr: 30 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks'
    return noStoreJson({ error: message }, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Not authenticated' }, 401)
    }

    const body = await request.json()
    const {
      projectId, title, description, type, status, priority,
      startDate, dueDate, effort, labels, isMilestone, assigneeId,
      figmaUrl, prUrl, progress, templateId, parentId,
    } = body

    if (!projectId || !title) {
      return noStoreJson({ error: 'Project ID and title are required' }, 400)
    }

    const pid = parseInt(projectId, 10)
    const assignee =
      assigneeId !== undefined && assigneeId !== null && assigneeId !== ''
        ? parseInt(String(assigneeId), 10)
        : null

    // Optional: create as child of existing parent
    let resolvedParentId: number | null = null
    if (parentId) {
      const parent = await db.task.findFirst({
        where: { id: parseInt(String(parentId), 10), projectId: pid, parentId: null },
      })
      if (!parent) {
        return noStoreJson({ error: 'Parent task not found in this project' }, 400)
      }
      resolvedParentId = parent.id
    }

    const parentTask = await db.task.create({
      data: {
        projectId: pid,
        title,
        description: description || null,
        type: type || 'Others',
        status: status || 'Todo',
        priority: priority || 'Medium',
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        effort: effort !== undefined && effort !== null ? parseInt(String(effort), 10) : null,
        labels: labels ? (typeof labels === 'string' ? labels : JSON.stringify(labels)) : '[]',
        isMilestone: isMilestone || false,
        assigneeId: Number.isFinite(assignee as number) ? assignee : null,
        createdBy: user.id,
        figmaUrl: figmaUrl || null,
        prUrl: prUrl || null,
        progress: progress || 0,
        parentId: resolvedParentId,
      },
      include: {
        assignee: { select: { id: true, username: true, fullName: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })

    const subTasks: typeof parentTask[] = []

    // Expand template into sub-tasks under this new parent (only if creating a top-level task)
    if (templateId && !resolvedParentId) {
      const tmpl = await db.taskTemplate.findUnique({
        where: { id: parseInt(String(templateId), 10) },
      })
      if (tmpl) {
        let raw: Array<{ title?: string; type?: string; priority?: string; effort?: number | null }> = []
        try {
          raw = JSON.parse(tmpl.tasksJson || '[]')
          if (!Array.isArray(raw)) raw = []
        } catch {
          raw = []
        }

        const scheduled = scheduleSubTasksFromTemplate(
          raw.map((t) => ({
            title: t.title || '',
            type: t.type,
            priority: t.priority,
            effort: t.effort,
          })),
          startDate || null,
        )

        for (const s of scheduled) {
          const child = await db.task.create({
            data: {
              projectId: pid,
              title: s.title,
              type: s.type,
              status: 'Todo',
              priority: s.priority,
              startDate: new Date(`${s.startDate}T00:00:00`),
              dueDate: new Date(`${s.dueDate}T00:00:00`),
              effort: s.effort,
              assigneeId: parentTask.assigneeId,
              createdBy: user.id,
              parentId: parentTask.id,
              progress: 0,
              labels: '[]',
            },
            include: {
              assignee: { select: { id: true, username: true, fullName: true } },
              project: { select: { id: true, name: true, color: true } },
            },
          })
          subTasks.push(child)
        }

        // Align parent due date to last sub-task if parent due was empty
        if (subTasks.length > 0 && !dueDate) {
          const last = scheduled[scheduled.length - 1]
          await db.task.update({
            where: { id: parentTask.id },
            data: { dueDate: new Date(`${last.dueDate}T00:00:00`) },
          })
          parentTask.dueDate = new Date(`${last.dueDate}T00:00:00`)
        }

        // Chain FS dependencies between sequential sub-tasks
        for (let i = 0; i < subTasks.length - 1; i++) {
          await db.taskDependency.create({
            data: {
              predecessorId: subTasks[i].id,
              successorId: subTasks[i + 1].id,
              type: 'FS',
              lagDays: 0,
            },
          }).catch(() => { /* ignore dup */ })
        }
      }
    }

    return noStoreJson({ task: parentTask, subTasks }, 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create task'
    return noStoreJson({ error: message }, 500)
  }
}
