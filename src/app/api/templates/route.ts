import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

function normalizeTasksJson(body: Record<string, unknown>): string {
  if (typeof body.tasksJson === 'string') return body.tasksJson
  if (Array.isArray(body.tasks)) return JSON.stringify(body.tasks)
  if (typeof body.tasksJson === 'object' && body.tasksJson !== null) {
    return JSON.stringify(body.tasksJson)
  }
  return '[]'
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await db.taskTemplate.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const template = await db.taskTemplate.create({
    data: {
      name: body.name.trim(),
      description: body.description || null,
      type: body.type || 'Others',
      category: body.category || 'General',
      tasksJson: normalizeTasksJson(body),
      isDefault: Boolean(body.isDefault),
    },
  })
  return NextResponse.json(template, { status: 201 })
}
