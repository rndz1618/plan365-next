import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { accessibleProjectIds, canAccessProject } from '@/lib/authz';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'tasks';
  const projectIdParam = searchParams.get('projectId');

  const allowed = await accessibleProjectIds(user);

  if (type === 'tasks') {
    const where: Prisma.TaskWhereInput = {};

    if (projectIdParam) {
      const projectId = Number(projectIdParam);
      if (!(await canAccessProject(user, projectId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.projectId = projectId;
    } else if (allowed !== 'all') {
      where.projectId = { in: allowed.length ? allowed : [-1] };
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        project: { select: { name: true } },
        assignee: { select: { username: true, fullName: true } },
      },
      orderBy: { id: 'asc' },
    });

    const header = 'ID,Project,Title,Type,Status,Priority,Assignee,Start Date,Due Date,Progress,Effort (h),Labels,Milestone';
    const rows = tasks.map(t => {
      const labels = JSON.parse(t.labels || '[]').join('; ');
      const esc = (s: string | null | undefined) => {
        if (!s) return '';
        return `"${String(s).replace(/"/g, '""')}"`;
      };
      return [
        t.id,
        esc(t.project?.name),
        esc(t.title),
        t.type,
        t.status,
        t.priority,
        esc(t.assignee?.fullName || t.assignee?.username),
        t.startDate?.toISOString().slice(0, 10) || '',
        t.dueDate?.toISOString().slice(0, 10) || '',
        `${t.progress}%`,
        t.effort || '',
        esc(labels),
        t.isMilestone ? 'Yes' : 'No',
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="plan365-tasks-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === 'projects') {
    const where: Prisma.ProjectWhereInput =
      allowed === 'all' ? {} : { id: { in: allowed.length ? allowed : [-1] } };

    const projects = await db.project.findMany({
      where,
      include: {
        _count: { select: { tasks: true, members: true } },
        creator: { select: { username: true, fullName: true } },
      },
      orderBy: { id: 'asc' },
    });

    const header = 'ID,Name,Reference,Status,Start Date,Due Date,Color,Tasks,Members,Created By';
    const rows = projects.map(p => {
      const esc = (s: string | null | undefined) => {
        if (!s) return '';
        return `"${String(s).replace(/"/g, '""')}"`;
      };
      return [
        p.id, esc(p.name), esc(p.reference), p.status,
        p.startDate?.toISOString().slice(0, 10) || '',
        p.dueDate?.toISOString().slice(0, 10) || '',
        p.color, p._count.tasks, p._count.members,
        esc(p.creator?.fullName || p.creator?.username),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="plan365-projects-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
}
