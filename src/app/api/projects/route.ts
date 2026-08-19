import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const where: any = user.role === 'admin' ? {} : { members: { some: { userId: user.id } } }

    const projects = await db.project.findMany({
      where,
      include: {
        _count: { select: { members: true, tasks: true } },
        creator: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ projects })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface TemplateTaskRow {
  title?: string
  type?: string
  priority?: string
  status?: string
  effort?: number
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, reference, startDate, dueDate, status, templateId } = body

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        color: color || '#10b981',
        reference: reference || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'Active',
        createdBy: user.id,
        members: { create: { userId: user.id, role: 'owner' } },
      },
      include: {
        _count: { select: { members: true, tasks: true } },
        creator: { select: { id: true, username: true, fullName: true } },
      },
    })

    let tasksCreated = 0

    if (templateId != null && templateId !== '' && templateId !== '__none__') {
      const tid = typeof templateId === 'string' ? parseInt(templateId, 10) : Number(templateId)
      if (!Number.isNaN(tid)) {
        const template = await db.taskTemplate.findUnique({ where: { id: tid } })
        if (template) {
          let rows: TemplateTaskRow[] = []
          try {
            const parsed = JSON.parse(template.tasksJson || '[]')
            rows = Array.isArray(parsed) ? parsed : []
          } catch {
            rows = []
          }

          const valid = rows.filter((r) => r && typeof r.title === 'string' && r.title.trim())
          if (valid.length > 0) {
            await db.task.createMany({
              data: valid.map((r) => ({
                projectId: project.id,
                title: String(r.title).trim(),
                description: r.description ? String(r.description) : null,
                type: r.type || template.type || 'Others',
                status: r.status || 'Todo',
                priority: r.priority || 'Medium',
                effort: typeof r.effort === 'number' ? r.effort : r.effort != null ? Number(r.effort) : null,
                labels: '[]',
                isMilestone: false,
                progress: 0,
                createdBy: user.id,
              })),
            })
            tasksCreated = valid.length
          }
        }
      }
    }

    const refreshed = await db.project.findUnique({
      where: { id: project.id },
      include: {
        _count: { select: { members: true, tasks: true } },
        creator: { select: { id: true, username: true, fullName: true } },
      },
    })

    return NextResponse.json(
      { project: refreshed || project, tasksCreated },
      { status: 201 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
