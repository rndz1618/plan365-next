import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id, 10)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const targetUserId = parseInt(userId, 10)
    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const member = await db.projectMember.create({
      data: {
        projectId,
        userId: targetUserId,
        role: role || 'editor',
      },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, email: true },
        },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add member'
    // Handle unique constraint
    if (message.includes('Unique')) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
