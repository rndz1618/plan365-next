import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, excludePassword, hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const users = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true, username: true, fullName: true, email: true,
        role: true, weeklyCapacity: true, createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { username, email, password, fullName, role = 'user', weeklyCapacity = 40 } = await req.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 })
    }

    const existing = await db.user.findFirst({ where: { OR: [{ username }, { email }] } })
    if (existing) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 })
    }

    const newUser = await db.user.create({
      data: { username, email, hashedPassword: await hashPassword(password), fullName, role, weeklyCapacity },
    })

    await db.userPreferences.create({ data: { userId: newUser.id } })

    const { hashedPassword: _, ...safe } = newUser
    return NextResponse.json(safe, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
