import { db } from './db'

export type AuthUser = {
  id: number
  role: string
}

/** Admin bypasses membership checks. */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'admin'
}

/** True if user is admin or a member of the project. */
export async function canAccessProject(user: AuthUser, projectId: number): Promise<boolean> {
  if (isAdmin(user)) return true
  const membership = await db.projectMember.findFirst({
    where: { projectId, userId: user.id },
    select: { id: true },
  })
  return !!membership
}

/**
 * Load task projectId and check access.
 * Returns 404 if missing; 403 if present but forbidden.
 */
export async function assertTaskAccess(
  user: AuthUser,
  taskId: number,
): Promise<{ ok: true; projectId: number } | { ok: false; status: 404 | 403 }> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  })
  if (!task) return { ok: false, status: 404 }
  const allowed = await canAccessProject(user, task.projectId)
  if (!allowed) return { ok: false, status: 403 }
  return { ok: true, projectId: task.projectId }
}

/** Conversation access: creator, admin, or member of linked project. */
export async function canAccessConversation(
  user: AuthUser,
  conversationId: number,
): Promise<boolean> {
  if (isAdmin(user)) return true
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      createdBy: true,
      projectId: true,
      project: { select: { members: { where: { userId: user.id }, select: { id: true } } } },
    },
  })
  if (!conv) return false
  if (conv.createdBy === user.id) return true
  if (conv.projectId && conv.project && conv.project.members.length > 0) return true
  return false
}

/** Project IDs the user may read/export (all for admin). */
export async function accessibleProjectIds(user: AuthUser): Promise<number[] | 'all'> {
  if (isAdmin(user)) return 'all'
  const rows = await db.projectMember.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  })
  return rows.map((r) => r.projectId)
}
