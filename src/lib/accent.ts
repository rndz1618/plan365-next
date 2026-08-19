/** Brand accent colors used by General Settings → Accent Color */

export const ACCENT_PALETTE: Record<
  string,
  { label: string; hex: string; oklch: string; oklchFg: string; tailwind: string }
> = {
  emerald: {
    label: 'Emerald',
    hex: '#10b981',
    oklch: 'oklch(0.696 0.17 162.48)',
    oklchFg: 'oklch(0.985 0 0)',
    tailwind: 'emerald',
  },
  teal: {
    label: 'Teal',
    hex: '#14b8a6',
    oklch: 'oklch(0.704 0.14 182.5)',
    oklchFg: 'oklch(0.985 0 0)',
    tailwind: 'teal',
  },
  amber: {
    label: 'Amber',
    hex: '#f59e0b',
    oklch: 'oklch(0.769 0.188 70.08)',
    oklchFg: 'oklch(0.25 0.05 70)',
    tailwind: 'amber',
  },
  orange: {
    label: 'Orange',
    hex: '#f97316',
    oklch: 'oklch(0.705 0.213 47.6)',
    oklchFg: 'oklch(0.985 0 0)',
    tailwind: 'orange',
  },
  rose: {
    label: 'Rose',
    hex: '#f43f5e',
    oklch: 'oklch(0.645 0.246 16.44)',
    oklchFg: 'oklch(0.985 0 0)',
    tailwind: 'rose',
  },
  violet: {
    label: 'Violet',
    hex: '#8b5cf6',
    oklch: 'oklch(0.606 0.25 292.7)',
    oklchFg: 'oklch(0.985 0 0)',
    tailwind: 'violet',
  },
  cyan: {
    label: 'Cyan',
    hex: '#06b6d4',
    oklch: 'oklch(0.715 0.143 215.2)',
    oklchFg: 'oklch(0.25 0.05 215)',
    tailwind: 'cyan',
  },
  lime: {
    label: 'Lime',
    hex: '#84cc16',
    oklch: 'oklch(0.768 0.233 130.85)',
    oklchFg: 'oklch(0.25 0.05 130)',
    tailwind: 'lime',
  },
}

export function applyAccentColor(name: string) {
  if (typeof document === 'undefined') return
  const accent = ACCENT_PALETTE[name] || ACCENT_PALETTE.emerald
  const root = document.documentElement
  root.style.setProperty('--brand', accent.oklch)
  root.style.setProperty('--brand-foreground', accent.oklchFg)
  root.style.setProperty('--brand-hex', accent.hex)
  // Also tint primary for buttons that use bg-primary
  root.style.setProperty('--primary', accent.oklch)
  root.style.setProperty('--primary-foreground', accent.oklchFg)
  root.style.setProperty('--ring', accent.oklch)
  root.style.setProperty('--sidebar-primary', accent.oklch)
  root.style.setProperty('--sidebar-primary-foreground', accent.oklchFg)
  root.dataset.accent = name
}

export function applyAppName(name: string) {
  if (typeof document === 'undefined') return
  const title = name?.trim() || 'Plan365'
  document.title = `${title} — Project Management`
}
