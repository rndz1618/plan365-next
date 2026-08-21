/** Hours of work that map to one calendar day for sub-task scheduling */
export const HOURS_PER_DAY = 8

export interface TemplateSubTaskInput {
  title: string
  type?: string
  priority?: string
  effort?: number | null
}

export interface ScheduledSubTask {
  title: string
  type: string
  priority: string
  effort: number | null
  startDate: string // yyyy-MM-dd
  dueDate: string
}

function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseStart(startDate?: string | null): Date {
  if (startDate) {
    const d = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`)
    if (!Number.isNaN(d.getTime())) return d
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/** Calendar days needed for effort hours (min 1 day). */
export function effortToDays(effortHours: number | null | undefined): number {
  const h = Number(effortHours)
  if (!Number.isFinite(h) || h <= 0) return 1
  return Math.max(1, Math.ceil(h / HOURS_PER_DAY))
}

/**
 * Sequential schedule: each sub-task starts the day after the previous ends.
 * Duration from effort hours (8h = 1 day).
 */
export function scheduleSubTasksFromTemplate(
  items: TemplateSubTaskInput[],
  parentStartDate?: string | null,
): ScheduledSubTask[] {
  let cursor = parseStart(parentStartDate)
  return items
    .filter((t) => (t.title || '').trim().length > 0)
    .map((t) => {
      const effort = t.effort != null && t.effort !== undefined ? Number(t.effort) : null
      const days = effortToDays(effort)
      const start = new Date(cursor)
      const end = new Date(start)
      end.setDate(end.getDate() + days - 1)
      const next = new Date(end)
      next.setDate(next.getDate() + 1)
      cursor = next
      return {
        title: t.title.trim(),
        type: t.type || 'Others',
        priority: t.priority || 'Medium',
        effort: effort != null && Number.isFinite(effort) ? effort : null,
        startDate: toDateOnly(start),
        dueDate: toDateOnly(end),
      }
    })
}
