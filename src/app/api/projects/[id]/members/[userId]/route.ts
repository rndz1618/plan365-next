import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id, userId: targetUserId } = await params
    const projectId = parseInt(id, 10)
    const memberId = parseInt(targetUserId, 10)

    if (isNaN(projectId) || isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    await db.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: memberId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
