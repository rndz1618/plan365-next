import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  // Get all active users
  const users = await db.user.findMany({
    where: { isActive: true },
    include: { preferences: true },
    orderBy: { fullName: 'asc' },
  });

  // Build task filter
  const taskWhere: any = { status: { notIn: ['Done', 'Handoff'] } };
  if (projectId) taskWhere.projectId = Number(projectId);

  const activeTasks = await db.task.findMany({
    where: taskWhere,
    include: { assignee: { select: { id: true, username: true, fullName: true } } },
  });

  // Calculate per-user metrics
  const capacityData = users.map(u => {
    const userTasks = activeTasks.filter(t => t.assigneeId === u.id);
    const totalEffort = userTasks.reduce((sum, t) => sum + (t.effort || 0), 0);
    const utilization = u.weeklyCapacity > 0 ? Math.round((totalEffort / (u.weeklyCapacity * 4)) * 100) : 0;

    return {
      id: u.id,
      username: u.username,
      fullName: u.fullName || u.username,
      weeklyCapacity: u.weeklyCapacity,
      monthlyCapacity: u.weeklyCapacity * 4,
      allocatedEffort: totalEffort,
      utilization: Math.min(100, utilization),
      taskCount: userTasks.length,
      tasks: userTasks.map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        status: t.status,
        priority: t.priority,
        effort: t.effort,
        project: { name: '', color: '' }, // project name loaded separately
      })),
    };
  });

  // Load project names for tasks
  const projectIds = [...new Set(activeTasks.map(t => t.projectId))];
  const projects = await db.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, color: true },
  });
  const projectMap = new Map(projects.map(p => [p.id, p]));

  for (const cd of capacityData) {
    for (const task of cd.tasks) {
      const aTask = activeTasks.find(t => t.id === task.id);
      if (aTask) {
        const proj = projectMap.get(aTask.projectId);
        task.project = proj ? { name: proj.name, color: proj.color } : { name: '', color: '' };
      }
    }
  }

  return NextResponse.json(capacityData);
}
