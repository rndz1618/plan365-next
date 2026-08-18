import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/dependencies?projectId=N
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  const where = projectId ? { OR: [
    { predecessor: { projectId: Number(projectId) } },
    { successor: { projectId: Number(projectId) } },
  ] } : {};

  const deps = await db.taskDependency.findMany({
    where,
    include: {
      predecessor: { select: { id: true, title: true, status: true, startDate: true, dueDate: true } },
      successor: { select: { id: true, title: true, status: true, startDate: true, dueDate: true } },
    },
  });
  return NextResponse.json(deps);
}

// POST - create dependency with cycle detection
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { predecessorId, successorId, type = 'FS', lagDays = 0 } = await req.json();
  if (predecessorId === successorId) {
    return NextResponse.json({ error: 'Cannot depend on itself' }, { status: 400 });
  }

  // Cycle detection using DFS
  const wouldCreateCycle = async (predId: number, succId: number): Promise<boolean> => {
    const visited = new Set<number>();
    const dfs = async (taskId: number): Promise<boolean> => {
      if (taskId === predId) return true;
      if (visited.has(taskId)) return false;
      visited.add(taskId);
      const outDeps = await db.taskDependency.findMany({ where: { predecessorId: taskId }, select: { successorId: true } });
      for (const d of outDeps) {
        if (await dfs(d.successorId)) return true;
      }
      return false;
    };
    return dfs(succId);
  };

  if (await wouldCreateCycle(predecessorId, successorId)) {
    return NextResponse.json({ error: 'Adding this dependency would create a cycle' }, { status: 409 });
  }

  try {
    const dep = await db.taskDependency.create({
      data: { predecessorId, successorId, type, lagDays },
      include: {
        predecessor: { select: { id: true, title: true, status: true } },
        successor: { select: { id: true, title: true, status: true } },
      },
    });
    return NextResponse.json(dep, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 });
    }
    throw e;
  }
}

// DELETE - remove dependency
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await db.taskDependency.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
