import { NextResponse } from 'next/server'
import { deleteAuthCookie } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(deleteAuthCookie())
  return response
}
