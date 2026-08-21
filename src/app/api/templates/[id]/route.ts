import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

function normalizeTasksJson(body: Record<string, unknown>): string | undefined {
  if (typeof body.tasksJson === 'string') return body.tasksJson
  if (Array.isArray(body.tasks)) return JSON.stringify(body.tasks)
  if (typeof body.tasksJson === 'object' && body.tasksJson !== null) {
    return JSON.stringify(body.tasksJson)
  }
  return undefined
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const templateId = parseInt(id, 10)
  if (Number.isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const template = await db.taskTemplate.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(template)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const templateId = parseInt(id, 10)
  if (Number.isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const body = await req.json()
  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    updateData.name = body.name.trim()
  }
  if (body.description !== undefined) updateData.description = body.description || null
  if (body.type !== undefined) updateData.type = body.type
  if (body.category !== undefined) updateData.category = body.category
  if (body.isDefault !== undefined) updateData.isDefault = Boolean(body.isDefault)

  const tasksJson = normalizeTasksJson(body)
  if (tasksJson !== undefined) updateData.tasksJson = tasksJson

  try {
    const template = await db.taskTemplate.update({
      where: { id: templateId },
      data: updateData,
    })
    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const templateId = parseInt(id, 10)
  if (Number.isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    await db.taskTemplate.delete({ where: { id: templateId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
}
