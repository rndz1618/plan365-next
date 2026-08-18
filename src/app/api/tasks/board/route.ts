import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

const ALL_STATUSES = ['Todo', 'In Progress', 'Review', 'Testing', 'Done', 'Blocked', 'Handoff']

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const where: any = {}
    if (projectId) {
      where.projectId = parseInt(projectId, 10)
    } else if (user.role !== 'admin') {
      where.project = { members: { some: { userId: user.id } } }
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    const board: Record<string, typeof tasks> = {}
    for (const task of tasks) {
      const status = task.status || 'Todo'
      if (!board[status]) board[status] = []
      board[status].push(task)
    }

    const columns = ALL_STATUSES.map((status) => ({
      id: status,
      title: status,
      tasks: board[status] || [],
    }))

    return NextResponse.json({ columns })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch board'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
