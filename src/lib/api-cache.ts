/**
 * Lightweight in-memory API cache for the SPA shell.
 * - GET responses cached by full URL (incl. query)
 * - Short TTL keeps data fresh while cutting duplicate boot/nav fetches
 * - Call invalidateApiCache() after mutations (create/update/delete)
 */

type CacheEntry = {
  expires: number
  status: number
  body: unknown
}

const store = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL_MS = 20_000 // 20s — good for navigation back-and-forth

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.includes(prefix)) store.delete(key)
  }
}

export function peekApiCache<T = unknown>(url: string): T | undefined {
  const hit = store.get(url)
  if (!hit) return undefined
  if (Date.now() > hit.expires) {
    store.delete(url)
    return undefined
  }
  return hit.body as T
}

/**
 * Cached JSON GET. Concurrent identical requests share one network call.
 */
export async function cachedGet<T = unknown>(
  url: string,
  options?: { ttlMs?: number; force?: boolean; init?: RequestInit },
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS
  const force = options?.force === true

  if (!force) {
    const hit = store.get(url)
    if (hit && Date.now() <= hit.expires) {
      return { ok: hit.status >= 200 && hit.status < 300, status: hit.status, data: hit.body as T }
    }
  }

  const existing = inflight.get(url)
  if (existing) {
    const data = (await existing) as T | null
    const hit = store.get(url)
    return {
      ok: hit ? hit.status >= 200 && hit.status < 300 : data != null,
      status: hit?.status ?? (data != null ? 200 : 0),
      data,
    }
  }

  const promise = (async () => {
    const res = await fetch(url, {
      ...options?.init,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(options?.init?.headers || {}),
      },
    })
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = null
    }
    if (res.ok) {
      store.set(url, { expires: Date.now() + ttl, status: res.status, body })
    }
    return body
  })()

  inflight.set(url, promise)
  try {
    const body = await promise
    const hit = store.get(url)
    return {
      ok: hit ? hit.status >= 200 && hit.status < 300 : false,
      status: hit?.status ?? 0,
      data: body as T | null,
    }
  } finally {
    inflight.delete(url)
  }
}

/** After POST/PUT/PATCH/DELETE — drop related GET caches */
export function invalidateAfterMutation(kind: 'tasks' | 'projects' | 'users' | 'settings' | 'all') {
  if (kind === 'all') {
    store.clear()
    return
  }
  invalidateApiCache(`/api/${kind}`)
  if (kind === 'tasks') {
    invalidateApiCache('/api/tasks')
    invalidateApiCache('/api/export')
    invalidateApiCache('/api/critical-path')
    invalidateApiCache('/api/dependencies')
  }
  if (kind === 'projects') {
    invalidateApiCache('/api/projects')
    invalidateApiCache('/api/tasks')
  }
}
