import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Keys that store complex types (arrays, booleans, numbers) as JSON
const JSON_KEYS = new Set([
  'allowRegistration',
  'jwtExpireHours',
  'aiTemperature',
  'aiMaxTokens',
  'taskTypes',
  'priorities',
  'statuses',
]);

function parseValue(value: string): unknown {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' || typeof parsed === 'boolean' || typeof parsed === 'number') {
      return parsed;
    }
    return value;
  } catch {
    return value;
  }
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await db.appSetting.findMany({ orderBy: { key: 'asc' } });
  const map: Record<string, unknown> = {};
  for (const s of settings) {
    map[s.key] = JSON_KEYS.has(s.key) ? parseValue(s.value) : s.value;
  }
  return NextResponse.json(map);
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const results: Record<string, string> = {};

  for (const [key, value] of Object.entries(body)) {
    const serialized = serializeValue(value);
    await db.appSetting.upsert({
      where: { key },
      update: { value: serialized, updatedBy: user.id },
      create: { key, value: serialized, updatedBy: user.id },
    });
    results[key] = serialized;
  }

  return NextResponse.json(results);
}
