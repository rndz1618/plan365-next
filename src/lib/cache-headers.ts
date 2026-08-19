import { NextResponse } from 'next/server'

/** Private browser/CDN cache — user-specific data */
export function cachedJson(
  data: unknown,
  opts?: { status?: number; maxAge?: number; swr?: number },
) {
  const maxAge = opts?.maxAge ?? 15
  const swr = opts?.swr ?? 30
  return NextResponse.json(data, {
    status: opts?.status ?? 200,
    headers: {
      'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=${swr}`,
      Vary: 'Cookie, Authorization',
    },
  })
}

/** Short-lived auth identity cache */
export function cachedMe(data: unknown) {
  return cachedJson(data, { maxAge: 30, swr: 60 })
}

/** Settings change rarely */
export function cachedSettings(data: unknown) {
  return cachedJson(data, { maxAge: 60, swr: 120 })
}

/** No-store for mutations / sensitive errors */
export function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
