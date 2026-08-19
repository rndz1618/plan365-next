import { getAuthUser, excludePassword } from '@/lib/auth'
import { cachedMe, noStoreJson } from '@/lib/cache-headers'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Not authenticated' }, 401)
    }
    return cachedMe({ user: excludePassword(user) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get user'
    return noStoreJson({ error: message }, 500)
  }
}
