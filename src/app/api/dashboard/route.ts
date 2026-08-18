import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Total projects the user is a member of
    const totalProjects = await db.project.count({
      where: {
        members: { some: { userId: user.id } },
      },
    })

    // Total tasks across user's projects
    const userProjectIds = await db.projectMember.findMany({
      where: { userId: user.id },
      select: { projectId: true },
    })
    const projectIds = userProjectIds.map((p) => p.projectId)

    const totalTasks = await db.task.count({
      where: { projectId: { in: projectIds } },
    })

    // Tasks by status
    const tasksByStatus = await db.task.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: { status: true },
    })

    const statusCounts: Record<string, number> = {}
    for (const item of tasksByStatus) {
      statusCounts[item.status] = item._count.status
    }

    // Upcoming deadlines (next 7 days, not done)
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const upcomingDeadlines = await db.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: now, lte: nextWeek },
        status: { not: 'Done' },
      },
      include: {
        assignee: {
          select: { id: true, username: true, fullName: true },
        },
        project: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    })

    // Recent activity (latest updated tasks)
    const recentActivity = await db.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
        creator: {
          select: { id: true, username: true, fullName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    })

    // My tasks (assigned to current user)
    const myTasks = await db.task.count({
      where: {
        assigneeId: user.id,
        status: { not: 'Done' },
      },
    })

    return NextResponse.json({
      stats: {
        totalProjects,
        totalTasks,
        myTasks,
        tasksByStatus: statusCounts,
      },
      upcomingDeadlines,
      recentActivity,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
