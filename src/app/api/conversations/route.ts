import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { createdBy: user.id },
          { project: { members: { some: { userId: user.id } } } },
        ],
      },
      include: {
        creator: {
          select: { id: true, username: true, fullName: true },
        },
        project: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: { id: true, username: true, fullName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ conversations })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversations'
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
    const { title, projectId } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const conversation = await db.conversation.create({
      data: {
        title,
        projectId: projectId ? parseInt(projectId, 10) : null,
        createdBy: user.id,
      },
      include: {
        creator: {
          select: { id: true, username: true, fullName: true },
        },
        project: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
