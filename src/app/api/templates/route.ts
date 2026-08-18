import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const templates = await db.taskTemplate.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const template = await db.taskTemplate.create({
    data: {
      name: body.name,
      description: body.description || null,
      type: body.type || 'Others',
      category: body.category || 'custom',
      tasksJson: JSON.stringify(body.tasks || []),
      isDefault: body.isDefault || false,
    },
  });
  return NextResponse.json(template, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tasks !== undefined) updateData.tasksJson = JSON.stringify(data.tasks);
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

  const template = await db.taskTemplate.update({ where: { id }, data: updateData });
  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await db.taskTemplate.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
