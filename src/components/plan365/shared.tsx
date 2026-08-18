'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { STATUS_COLORS, PRIORITY_COLORS, TYPE_COLORS } from '@/store/plan365'
import {
  Loader2,
  Inbox,
  SearchX,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

// ---------- Avatar (initials circle) ----------

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-emerald-600 font-semibold text-white shrink-0',
        sizeMap[size],
        className,
      )}
    >
      {initials}
    </span>
  )
}

// ---------- StatusBadge ----------

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS['Todo']
  return (
    <Badge variant="outline" className={cn('border-0', colorClass, className)}>
      {status}
    </Badge>
  )
}

// ---------- PriorityBadge ----------

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const colorClass = PRIORITY_COLORS[priority] || PRIORITY_COLORS['Medium']
  return (
    <Badge variant="outline" className={cn('border-0', colorClass, className)}>
      {priority}
    </Badge>
  )
}

// ---------- TypeBadge ----------

interface TypeBadgeProps {
  type: string
  className?: string
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const colorClass = TYPE_COLORS[type] || TYPE_COLORS['Others']
  return (
    <Badge variant="outline" className={cn('border-0', colorClass, className)}>
      {type}
    </Badge>
  )
}

// ---------- EmptyState ----------

interface EmptyStateProps {
  message: string
  icon?: LucideIcon
  className?: string
}

export function EmptyState({ message, icon: Icon = Inbox, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  )
}

// Re-export icons for convenience
export { Inbox, SearchX, FolderOpen, CheckSquare, MessageSquare }

// ---------- LoadingSpinner ----------

interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  )
}

// ---------- UserAvatar ----------

interface UserAvatarProps {
  user: {
    id: number
    username: string
    fullName: string | null
  }
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

export function UserAvatar({ user, size = 'md', showName = false, className }: UserAvatarProps) {
  const displayName = user.fullName || user.username
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-emerald-600 font-semibold text-white shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-shadow',
          sizeMap[size],
        )}
        title={displayName}
      >
        {getInitials(displayName)}
      </span>
      {showName && (
        <span className="text-sm text-foreground truncate max-w-[120px]">
          {displayName}
        </span>
      )}
    </span>
  )
}
