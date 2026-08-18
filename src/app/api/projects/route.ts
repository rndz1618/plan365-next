import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const where: any = user.role === 'admin' ? {} : { members: { some: { userId: user.id } } }

    const projects = await db.project.findMany({
      where,
      include: {
        _count: { select: { members: true, tasks: true } },
        creator: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ projects })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, reference, startDate, dueDate, status } = body

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        color: color || '#10b981',
        reference: reference || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'Active',
        createdBy: user.id,
        members: { create: { userId: user.id, role: 'owner' } },
      },
      include: {
        _count: { select: { members: true, tasks: true } },
        creator: { select: { id: true, username: true, fullName: true } },
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
