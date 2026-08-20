import { cachedGet } from '@/lib/api-cache'
import { useAppStore, TEAM_USERS_TTL_MS, type User } from '@/store/plan365'

let inflight: Promise<User[]> | null = null

/**
 * Load team directory once; subsequent callers within TTL share memory + HTTP cache.
 */
export async function loadTeamUsers(options?: { force?: boolean }): Promise<User[]> {
  const state = useAppStore.getState()
  const age = Date.now() - state.teamUsersAt
  if (!options?.force && state.teamUsers.length > 0 && age < TEAM_USERS_TTL_MS) {
    return state.teamUsers
  }

  if (inflight) return inflight

  inflight = (async () => {
    try {
      const { ok, data } = await cachedGet<User[] | { users?: User[] }>('/api/users', {
        ttlMs: TEAM_USERS_TTL_MS,
        force: options?.force,
      })
      if (!ok || data == null) return state.teamUsers
      const list = Array.isArray(data) ? data : data.users ?? []
      useAppStore.getState().setTeamUsers(list)
      return list
    } finally {
      inflight = null
    }
  })()

  return inflight
}
