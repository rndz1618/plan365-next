import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { execSync } from 'child_process';

export async function POST() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    execSync('npx tsx src/seed.ts', { cwd: process.cwd(), stdio: 'pipe' });
    return NextResponse.json({ ok: true, message: 'Database reseeded' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}