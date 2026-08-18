import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hashPassword } from '@/lib/auth'

// GET single user
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const target = await db.user.findUnique({
    where: { id: Number(id) },
    include: { preferences: true },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { hashedPassword: _, ...safe } = target;
  return NextResponse.json(safe);
}

// PUT - update user (admin: any field; user: own password)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);

  if (user.role !== 'admin' && user.id !== targetId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {};

  if (body.fullName !== undefined) updateData.fullName = body.fullName;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.role !== undefined && user.role === 'admin') updateData.role = body.role;
  if (body.isActive !== undefined && user.role === 'admin') updateData.isActive = body.isActive;
  if (body.weeklyCapacity !== undefined) updateData.weeklyCapacity = body.weeklyCapacity;

  // Password change
  if (body.newPassword) {
    if (body.currentPassword && user.id === targetId) {
      const target = await db.user.findUnique({ where: { id: targetId } });
      if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const valid = await bcrypt.compare(body.currentPassword, target.hashedPassword);
      if (!valid) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });
    } else if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Current password required' }, { status: 400 });
    }
    updateData.hashedPassword = await hashPassword(body.newPassword);
  }

  const updated = await db.user.update({
    where: { id: targetId },
    data: updateData,
    include: { preferences: true },
  });

  const { hashedPassword: _, ...safe } = updated;
  return NextResponse.json(safe);
}

// DELETE user (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (Number(id) === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

  await db.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
