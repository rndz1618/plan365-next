import { NextResponse } from 'next/server'
import { getAuthUser, excludePassword } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ user: excludePassword(user) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
