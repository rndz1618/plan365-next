import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { db } from './db'

const TOKEN_NAME = 'plan365_token'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return secret
}

function getSecretKey() {
  return new TextEncoder().encode(getJwtSecret())
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(payload: { userId: number; username: string; role: string }): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
  return token
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload as { userId: number; username: string; role: string; iat: number; exp: number }
  } catch {
    return null
  }
}

/** Extract raw JWT from cookie or Authorization: Bearer header. */
export async function extractToken(request?: NextRequest): Promise<string | null> {
  if (request) {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization')
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const bearer = auth.slice(7).trim()
      if (bearer) return bearer
    }
    const cookieToken = request.cookies.get(TOKEN_NAME)?.value
    if (cookieToken) return cookieToken
  }

  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(TOKEN_NAME)?.value
    if (token) return token
  } catch {
    // cookies() may fail outside request context
  }
  return null
}

export async function getAuthUser(request?: NextRequest) {
  const token = await extractToken(request)
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { preferences: true },
  })

  if (!user || !user.isActive) return null

  return user
}

export function createAuthCookie(token: string) {
  return {
    name: TOKEN_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
}

export function deleteAuthCookie() {
  return {
    name: TOKEN_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}

export function excludePassword<T extends { hashedPassword?: string }>(user: T): Omit<T, 'hashedPassword'> {
  const { hashedPassword: _, ...rest } = user
  return rest
}

export { TOKEN_NAME }
