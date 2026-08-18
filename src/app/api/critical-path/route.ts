import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Compute critical path for a project using forward/backward pass
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = Number(searchParams.get('projectId'));
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const tasks = await db.task.findMany({
    where: { projectId },
    include: { depsFrom: { include: { predecessor: { select: { id: true, dueDate: true, startDate: true, effort: true } } } }, depsTo: { include: { successor: { select: { id: true } } } } },
  });

  const deps = await db.taskDependency.findMany({
    where: { OR: [{ predecessor: { projectId } }, { successor: { projectId } }] },
  });

  // Build adjacency
  const successors: Record<number, { taskId: number; type: string; lagDays: number }[]> = {};
  const predecessors: Record<number, { taskId: number; type: string; lagDays: number }[]> = {};
  for (const d of deps) {
    if (!successors[d.predecessorId]) successors[d.predecessorId] = [];
    successors[d.predecessorId].push({ taskId: d.successorId, type: d.type, lagDays: d.lagDays });
    if (!predecessors[d.successorId]) predecessors[d.successorId] = [];
    predecessors[d.successorId].push({ taskId: d.predecessorId, type: d.type, lagDays: d.lagDays });
  }

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Calculate duration in hours (effort) or days
  const getDuration = (task: typeof tasks[0]): number => {
    if (task.effort) return task.effort / 8; // hours to days (8h/day)
    if (task.startDate && task.dueDate) {
      return Math.max(1, Math.ceil((task.dueDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return 1;
  };

  // Forward pass - compute ES, EF
  const es: Record<number, number> = {};
  const ef: Record<number, number> = {};

  const computeEF = (taskId: number): number => {
    if (ef[taskId] !== undefined) return ef[taskId];
    const task = taskMap.get(taskId);
    if (!task) return 0;
    const duration = getDuration(task);
    const preds = predecessors[taskId] || [];
    if (preds.length === 0) {
      es[taskId] = 0;
      ef[taskId] = duration;
      return ef[taskId];
    }
    let maxEF = 0;
    for (const p of preds) {
      const predEF = computeEF(p.taskId);
      const lag = p.lagDays || 0;
      // FS: successor starts after predecessor ends + lag
      // SS: successor starts after predecessor starts + lag
      // FF: successor ends after predecessor ends + lag
      // SF: successor starts after predecessor ends - lag
      let constraint: number;
      switch (p.type) {
        case 'SS': constraint = es[p.taskId] + lag; break;
        case 'FF': constraint = computeEF(p.taskId) + lag - duration; break;
        case 'SF': constraint = computeEF(p.taskId) - lag; break;
        default: constraint = predEF + lag; // FS
      }
      maxEF = Math.max(maxEF, constraint);
    }
    es[taskId] = maxEF;
    ef[taskId] = maxEF + duration;
    return ef[taskId];
  };

  // Find root tasks (no predecessors)
  const roots = tasks.filter(t => !predecessors[t.id] || predecessors[t.id].length === 0);
  let projectEnd = 0;
  for (const r of roots) {
    projectEnd = Math.max(projectEnd, computeEF(r.id));
  }
  // Also compute for all tasks (some might not be reachable from roots)
  for (const t of tasks) computeEF(t.id);

  // Backward pass - compute LS, LF
  const ls: Record<number, number> = {};
  const lf: Record<number, number> = {};
  const totalFloat: Record<number, number> = {};

  const computeLS = (taskId: number): number => {
    if (ls[taskId] !== undefined) return ls[taskId];
    const task = taskMap.get(taskId);
    if (!task) return 0;
    const duration = getDuration(task);
    const succs = successors[taskId] || [];
    if (succs.length === 0) {
      lf[taskId] = projectEnd;
      ls[taskId] = projectEnd - duration;
      totalFloat[taskId] = ls[taskId] - es[taskId];
      return ls[taskId];
    }
    let minLS = Infinity;
    for (const s of succs) {
      const succLS = computeLS(s.taskId);
      const lag = s.lagDays || 0;
      switch (s.type) {
        case 'SS': minLS = Math.min(minLS, succLS - lag); break;
        case 'FF': minLS = Math.min(minLS, succLS + duration - lag); break;
        case 'SF': minLS = Math.min(minLS, succLS - lag + duration); break;
        default: minLS = Math.min(minLS, succLS - lag - duration); // FS
      }
    }
    lf[taskId] = minLS + duration;
    ls[taskId] = minLS;
    totalFloat[taskId] = ls[taskId] - es[taskId];
    return ls[taskId];
  };

  // Find leaf tasks (no successors)
  const leaves = tasks.filter(t => !successors[t.id] || successors[t.id].length === 0);
  for (const l of leaves) computeLS(l.id);
  for (const t of tasks) {
    if (ls[t.id] === undefined) computeLS(t.id);
  }

  // Build result
  const criticalTaskIds = new Set(
    tasks.filter(t => (totalFloat[t.id] || 0) <= 0.01).map(t => t.id)
  );

  const result = tasks.map(t => ({
    id: t.id,
    title: t.title,
    es: es[t.id] || 0,
    ef: ef[t.id] || 0,
    ls: ls[t.id] || 0,
    lf: lf[t.id] || 0,
    duration: getDuration(t),
    totalFloat: totalFloat[t.id] || 0,
    isCritical: criticalTaskIds.has(t.id),
  }));

  return NextResponse.json({
    tasks: result,
    criticalTaskIds: [...criticalTaskIds],
    projectDuration: projectEnd,
  });
}
