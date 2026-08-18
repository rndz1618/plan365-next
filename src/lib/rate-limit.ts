/**
 * Lightweight in-memory rate limiter (single-instance / SBC friendly).
 * Not shared across multiple Node processes — acceptable for Plan365 self-host.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  const remaining = Math.max(0, limit - bucket.count)
  const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000)

  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSec }
  }
  return { allowed: true, remaining, retryAfterSec }
}

export function clientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
