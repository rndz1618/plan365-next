import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { assertTaskAccess } from '@/lib/authz'

export async function GET(
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

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: { id: true, username: true, fullName: true },
        },
        creator: {
          select: { id: true, username: true, fullName: true },
        },
        project: {
          select: { id: true, name: true, color: true },
        },
        depsFrom: {
          include: {
            predecessor: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        depsTo: {
          include: {
            successor: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
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

    const body = await request.json()
    const {
      title, description, type, status, priority,
      startDate, dueDate, progress, effort, labels,
      isMilestone, assigneeId,
    } = body

    const task = await db.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(progress !== undefined && { progress: parseInt(progress, 10) }),
        ...(effort !== undefined && { effort: effort !== null ? parseInt(effort, 10) : null }),
        ...(labels !== undefined && { labels }),
        ...(isMilestone !== undefined && { isMilestone }),
        ...(assigneeId !== undefined && {
          assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
        }),
      },
      include: {
        assignee: {
          select: { id: true, username: true, fullName: true },
        },
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    return NextResponse.json({ task })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
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

    await db.task.delete({
      where: { id: taskId },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
