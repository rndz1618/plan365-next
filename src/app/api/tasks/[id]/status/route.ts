import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { assertTaskAccess } from '@/lib/authz'

const VALID_STATUSES = ['Todo', 'In Progress', 'Review', 'Testing', 'Done', 'Blocked', 'Handoff']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const taskId = parseInt(id, 10)
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const access = await assertTaskAccess(user, taskId)
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? 'Task not found' : 'Forbidden' },
        { status: access.status },
      )
    }

    const { searchParams } = new URL(request.url)
    const newStatus = searchParams.get('status')

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      )
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'Done') {
      updateData.progress = 100
    }

    const task = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, username: true, fullName: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ task })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
