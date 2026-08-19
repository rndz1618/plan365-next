import type { ViewType } from '@/store/plan365'

export const VIEW_PATHS: Record<ViewType, string> = {
  dashboard: '/dashboard',
  projects: '/projects',
  tasks: '/tasks',
  calendar: '/calendar',
  capacity: '/capacity',
  'ai-planning': '/ai-planning',
  conversations: '/conversations',
  docs: '/docs',
  settings: '/settings',
}

const PATH_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path.slice(1), view as ViewType]),
) as Record<string, ViewType>

/** Map URL segment(s) → ViewType. Defaults to dashboard. */
export function viewFromSlug(slug?: string[] | null): ViewType {
  if (!slug || slug.length === 0) return 'dashboard'
  const first = slug[0].toLowerCase()
  if (PATH_TO_VIEW[first]) return PATH_TO_VIEW[first]
  // /projects/123 → projects view (project id handled separately)
  if (first === 'projects') return 'projects'
  return 'dashboard'
}

/** Optional project id from /projects/12 or /tasks?project=12 style paths. */
export function projectIdFromSlug(slug?: string[] | null): number | null {
  if (!slug || slug.length < 2) return null
  if (slug[0] === 'projects' || slug[0] === 'tasks') {
    const n = parseInt(slug[1], 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function pathForView(view: ViewType, projectId?: number | null): string {
  if (view === 'projects' && projectId) return `/projects/${projectId}`
  if (view === 'tasks' && projectId) return `/tasks/${projectId}`
  return VIEW_PATHS[view] || '/dashboard'
}

export const ALL_VIEWS = Object.keys(VIEW_PATHS) as ViewType[]
