import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    // Export all data via Prisma (database-agnostic)
    const [users, projects, members, tasks, dependencies, templates, settings, conversations, messages] =
      await Promise.all([
        db.user.findMany({ include: { preferences: true } }),
        db.project.findMany(),
        db.projectMember.findMany(),
        db.task.findMany(),
        db.taskDependency.findMany(),
        db.taskTemplate.findMany(),
        db.appSetting.findMany(),
        db.conversation.findMany(),
        db.conversationMessage.findMany(),
      ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      data: { users, projects, members, tasks, dependencies, templates, settings, conversations, messages },
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `plan365-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
