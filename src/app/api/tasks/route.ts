import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { cachedJson, noStoreJson } from '@/lib/cache-headers'

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

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
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
      figmaUrl, prUrl, progress,
    } = body

    if (!projectId || !title) {
      return noStoreJson({ error: 'Project ID and title are required' }, 400)
    }

    const task = await db.task.create({
      data: {
        projectId: parseInt(projectId, 10),
        title,
        description: description || null,
        type: type || 'Others',
        status: status || 'Todo',
        priority: priority || 'Medium',
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        effort: effort !== undefined ? parseInt(effort, 10) : null,
        labels: labels ? (typeof labels === 'string' ? labels : JSON.stringify(labels)) : '[]',
        isMilestone: isMilestone || false,
        assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
        createdBy: user.id,
        figmaUrl: figmaUrl || null,
        prUrl: prUrl || null,
        progress: progress || 0,
      },
      include: {
        assignee: { select: { id: true, username: true, fullName: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })

    return noStoreJson({ task }, 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create task'
    return noStoreJson({ error: message }, 500)
  }
}
