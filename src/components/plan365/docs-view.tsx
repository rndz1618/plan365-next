'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Database,
  Server,
  Layers,
  Shield,
  Zap,
  Palette,
  Box,
  GitBranch,
  Users,
  CalendarDays,
  MessageSquare,
  Sparkles,
  BarChart3,
  Settings,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

/* ─────────────────────────────────────────────
   Notion-style reusable inline components
   ───────────────────────────────────────────── */

function CodeBlock({ children, language }: { children: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="group relative my-4 rounded-lg border bg-zinc-950 dark:bg-zinc-900 overflow-hidden">
      {language && (
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-1.5 text-xs text-zinc-400">
          <span>{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      {!language && (
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-zinc-200 transition-all"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="text-zinc-300 font-mono">{children}</code>
      </pre>
    </div>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm font-mono text-emerald-700 dark:bg-zinc-800 dark:text-emerald-400">
      {children}
    </code>
  )
}

function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'tip' }) {
  const config = {
    info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: '💡', label: 'Info' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: '⚠️', label: 'Warning' },
    tip: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: '✨', label: 'Tip' },
  }[type]
  return (
    <div className={cn('my-4 rounded-lg border p-4', config.bg, config.border)}>
      <p className="text-sm font-medium mb-1">{config.icon} {config.label}</p>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Table of contents data
   ───────────────────────────────────────────── */

interface TocItem {
  id: string
  label: string
  indent: number
  icon: React.ElementType
}

const TOC_ITEMS: TocItem[] = [
  { id: 'overview', label: 'Overview', indent: 0, icon: BookOpen },
  { id: 'tech-stack', label: 'Tech Stack', indent: 0, icon: Layers },
  { id: 'architecture', label: 'Architecture', indent: 0, icon: Server },
  { id: 'database-schema', label: 'Database Schema', indent: 0, icon: Database },
  { id: 'api-endpoints', label: 'API Endpoints', indent: 0, icon: Zap },
  { id: 'features', label: 'Features', indent: 0, icon: Box },
  { id: 'auth', label: 'Authentication', indent: 0, icon: Shield },
  { id: 'deployment', label: 'Deployment', indent: 0, icon: GitBranch },
]

/* ─────────────────────────────────────────────
   Main Docs View
   ───────────────────────────────────────────── */

export function DocsView() {
  const [activeSection, setActiveSection] = useState('overview')
  const contentRef = useRef<HTMLDivElement>(null)

  // Intersection observer for active TOC tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          // Pick the one closest to the top
          const sorted = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActiveSection(sorted[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    )

    const sections = contentRef.current?.querySelectorAll('section[id]')
    sections?.forEach(s => observer.observe(s))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex h-full">
      {/* Sidebar TOC - desktop only */}
      <aside className="hidden xl:block w-60 shrink-0 border-r">
        <ScrollArea className="h-full">
          <nav className="p-4 space-y-1">
            {TOC_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8 md:px-10">
          {/* Cover */}
          <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 h-48 md:h-56">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-5 left-6">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm mb-2">
                Development Documentation
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Plan365
              </h1>
              <p className="text-white/80 text-sm mt-1">
                Project Management & Planning Platform
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-8 px-1">
            <span>Version 1.0.0</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Last updated: June 2025</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Status: Active Development</span>
          </div>

          <Separator className="mb-8" />

          {/* ─── OVERVIEW ─── */}
          <section id="overview" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Plan365</strong> is a full-featured project management application designed for engineering teams.
              It provides comprehensive tools for task tracking, project planning, resource management, and AI-assisted planning.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The application is built with a modern tech stack optimized for reliability and performance,
              targeting low-resource environments such as single-board computers (2GB RAM).
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
              {[
                { label: 'Projects', value: 'Unlimited', icon: FolderKanbanIcon },
                { label: 'Task Types', value: '5 Types', icon: Box },
                { label: 'Statuses', value: '7 Stages', icon: BarChart3 },
                { label: 'AI Powered', value: 'LLM + VLM', icon: Sparkles },
              ].map(item => (
                <div key={item.label} className="rounded-lg border p-3 text-center">
                  <item.icon className="h-5 w-5 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <Callout type="info">
              This app uses <InlineCode>PostgreSQL</InlineCode> as the database, providing robust relational data storage
              with full ACID compliance and easy cloud deployment.
            </Callout>
          </section>

          <Separator className="mb-12" />

          {/* ─── TECH STACK ─── */}
          <section id="tech-stack" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">Tech Stack</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The application uses a carefully selected set of modern technologies optimized for the target environment.
            </p>

            <div className="space-y-4">
              {TECH_STACK.map(cat => (
                <div key={cat.category} className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                    {cat.category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.items.map(item => (
                      <div key={item.name} className="flex items-start gap-3">
                        <div
                          className="mt-0.5 h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator className="mb-12" />

          {/* ─── ARCHITECTURE ─── */}
          <section id="architecture" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">Architecture</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Plan365 follows a monolithic architecture with clear separation of concerns.
              The frontend and backend share the same Next.js codebase.
            </p>

            <div className="rounded-lg border p-5 mb-6">
              <h3 className="font-semibold mb-3">Directory Structure</h3>
              <CodeBlock language="plaintext">{`src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Single-page entry
│   ├── layout.tsx           # Root layout
│   └── api/                # API routes
│       ├── auth/            # Authentication
│       ├── projects/        # Project CRUD
│       ├── tasks/           # Task CRUD + board
│       ├── users/           # User management
│       ├── dashboard/       # Stats & analytics
│       ├── conversations/   # AI chat
│       └── export/          # CSV export
├── components/
│   └── plan365/          # App components
├── store/
│   └── plan365.ts        # Zustand store
├── lib/
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # JWT auth helpers
│   └── utils.ts          # Utilities
└── prisma/
    └── schema.prisma     # Database schema`}</CodeBlock>
            </div>

            <h3 className="font-semibold mb-3">Key Patterns</h3>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                <span><strong className="text-foreground">Client State</strong>: Zustand store manages global state (selected project, current view, user session)</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                <span><strong className="text-foreground">Server State</strong>: Direct <InlineCode>fetch()</InlineCode> calls with loading/error states in components</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                <span><strong className="text-foreground">Routing</strong>: Single-page app with view switching via Zustand (no client-side URL routing)</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                <span><strong className="text-foreground">API Design</strong>: RESTful API routes under <InlineCode>/api/*</InlineCode> with JWT authentication</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                <span><strong className="text-foreground">UI Components</strong>: shadcn/ui (Radix UI primitives) + Tailwind CSS 4 + Lucide icons</span>
              </li>
            </ul>

            <Callout type="tip">
              All views are rendered in a single route (<InlineCode>/</InlineCode>) using Zustand state to switch between views.
              This keeps the app lightweight with no page reloads.
            </Callout>
          </section>

          <Separator className="mb-12" />

          {/* ─── DATABASE SCHEMA ─── */}
          <section id="database-schema" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">Database Schema</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The database uses <InlineCode>PostgreSQL</InlineCode> via Prisma ORM. All cascade deletions are handled at the database level.
            </p>

            <div className="space-y-4">
              {SCHEMA_ITEMS.map(item => (
                <div key={item.name} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="font-mono text-xs">{item.name}</Badge>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                  <div className="space-y-1">
                    {item.fields.map(field => (
                      <div key={field.name} className="flex items-center gap-2 text-sm">
                        <code className="text-xs font-mono w-28 text-emerald-700 dark:text-emerald-400 shrink-0">{field.name}</code>
                        <span className="text-muted-foreground">{field.type}</span>
                        {field.note && <span className="text-xs text-muted-foreground/70 ml-auto">{field.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Callout type="warning">
              Deleting a project will cascade-delete all related tasks, members, conversations, messages, and task dependencies.
              This action is irreversible — a confirmation dialog is shown before deletion.
            </Callout>
          </section>

          <Separator className="mb-12" />

          {/* ─── API ENDPOINTS ─── */}
          <section id="api-endpoints" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">API Endpoints</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              All API routes require JWT authentication (except login/register). Returns JSON responses.
            </p>

            <div className="space-y-3">
              {API_ENDPOINTS.map(group => (
                <div key={group.path} className="rounded-lg border">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <p className="font-mono text-sm font-semibold">{group.path}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{group.desc}</p>
                  </div>
                  <div className="divide-y">
                    {group.endpoints.map(ep => (
                      <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-mono text-[10px] w-14 justify-center shrink-0',
                            ep.method === 'GET' && 'border-emerald-300 text-emerald-700 dark:text-emerald-400',
                            ep.method === 'POST' && 'border-blue-300 text-blue-700 dark:text-blue-400',
                            ep.method === 'PUT' && 'border-amber-300 text-amber-700 dark:text-amber-400',
                            ep.method === 'DELETE' && 'border-red-300 text-red-700 dark:text-red-400',
                          )}
                        >
                          {ep.method}
                        </Badge>
                        <code className="text-xs font-mono truncate">{ep.path}</code>
                        <span className="text-xs text-muted-foreground ml-auto shrink-0 hidden sm:block">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator className="mb-12" />

          {/* ─── FEATURES ─── */}
          <section id="features" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <Box className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">Features</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <div key={f.title} className="rounded-lg border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <f.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-sm">{f.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator className="mb-12" />

          {/* ─── AUTH ─── */}
          <section id="auth" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">Authentication</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Plan365 uses JWT (JSON Web Token) based authentication stored in HTTP-only cookies.
            </p>

            <div className="rounded-lg border p-5 mb-4">
              <h3 className="font-semibold mb-3">Auth Flow</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>User submits credentials to <InlineCode>POST /api/auth/login</InlineCode></li>
                <li>Server validates password (bcrypt) and returns JWT in HTTP-only cookie</li>
                <li>Client includes cookie automatically in subsequent requests</li>
                <li>Server middleware (<InlineCode>getAuthUser()</InlineCode>) validates JWT on protected routes</li>
                <li>User role (<InlineCode>admin</InlineCode> / <InlineCode>editor</InlineCode> / <InlineCode>viewer</InlineCode>) controls access</li>
              </ol>
            </div>

            <div className="rounded-lg border p-5">
              <h3 className="font-semibold mb-3">Roles & Permissions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4 font-medium">Feature</th>
                      <th className="py-2 px-3 font-medium text-center">Admin</th>
                      <th className="py-2 px-3 font-medium text-center">Editor</th>
                      <th className="py-2 pl-3 font-medium text-center">Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ['Create Projects', true, true, false],
                      ['Edit Projects', true, true, false],
                      ['Delete Projects', true, false, false],
                      ['Create Tasks', true, true, false],
                      ['Edit Tasks', true, true, false],
                      ['Delete Tasks', true, true, false],
                      ['Manage Users', true, false, false],
                      ['View Dashboard', true, true, true],
                      ['Export Data', true, true, true],
                      ['AI Features', true, true, true],
                    ].map(([feature, admin, editor, viewer]) => (
                      <tr key={feature as string} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-foreground">{feature as string}</td>
                        <td className="py-2 px-3 text-center">{admin ? '✅' : '❌'}</td>
                        <td className="py-2 px-3 text-center">{editor ? '✅' : '❌'}</td>
                        <td className="py-2 pl-3 text-center">{viewer ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <Separator className="mb-12" />

          {/* ─── DEPLOYMENT ─── */}
          <section id="deployment" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight">Deployment</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The application is designed to run on low-resource environments such as Raspberry Pi (2GB RAM).
            </p>

            <div className="rounded-lg border p-5 mb-4">
              <h3 className="font-semibold mb-3">Quick Start</h3>
              <CodeBlock language="bash">{`# Install dependencies
bun install

# Push schema to PostgreSQL
bun run db:push

# Start development server
bun run dev

# Production build
bun run build
bun start`}</CodeBlock>
            </div>

            <div className="rounded-lg border p-5">
              <h3 className="font-semibold mb-3">Environment Variables</h3>
              <CodeBlock language="bash">{`# Required
DATABASE_URL="postgresql://user:password@localhost:5432/plan365"
JWT_SECRET="your-secret-key-here"

# Optional
NEXT_PUBLIC_APP_URL="http://localhost:3000"`}</CodeBlock>
            </div>

            <Callout type="tip">
              For production on cloud platforms like Render or Railway, use <InlineCode>bun run build</InlineCode> followed by <InlineCode>bun start</InlineCode>.
            </Callout>
          </section>

          {/* Footer */}
          <div className="mt-16 mb-8 text-center text-xs text-muted-foreground">
            <Separator className="mb-6" />
            <p>Plan365 Development Documentation</p>
            <p className="mt-1">Built with Next.js 16 + Prisma + Tailwind CSS 4 + shadcn/ui</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Data constants
   ───────────────────────────────────────────── */

function FolderKanbanIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
      <path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/>
    </svg>
  )
}

const TECH_STACK = [
  {
    category: 'Core Framework',
    items: [
      { name: 'Next.js 16', desc: 'App Router, Server Components', color: '#000000' },
      { name: 'TypeScript 5', desc: 'Strict type safety', color: '#3178c6' },
      { name: 'Bun Runtime', desc: 'Fast JS runtime & package manager', color: '#fbf0df' },
    ],
  },
  {
    category: 'Database & ORM',
    items: [
      { name: 'PostgreSQL', desc: 'Robust relational database', color: '#336791' },
      { name: 'Prisma ORM', desc: 'Type-safe database client', color: '#2d3748' },
    ],
  },
  {
    category: 'UI & Styling',
    items: [
      { name: 'Tailwind CSS 4', desc: 'Utility-first CSS framework', color: '#06b6d4' },
      { name: 'shadcn/ui', desc: 'Radix UI component library', color: '#000000' },
      { name: 'Lucide Icons', desc: 'Beautiful open-source icons', color: '#f56565' },
      { name: 'Framer Motion', desc: 'Smooth animations & transitions', color: '#ff0055' },
    ],
  },
  {
    category: 'State & Data',
    items: [
      { name: 'Zustand', desc: 'Lightweight client state management', color: '#764abc' },
      { name: 'TanStack Table', desc: 'Headless table component', color: '#ff4488' },
    ],
  },
  {
    category: 'Drag & Drop',
    items: [
      { name: '@hello-pangea/dnd', desc: 'Kanban board drag-and-drop', color: '#6366f1' },
    ],
  },
  {
    category: 'Auth & Security',
    items: [
      { name: 'JWT', desc: 'JSON Web Token authentication', color: '#d63aff' },
      { name: 'bcrypt', desc: 'Password hashing', color: '#65a30d' },
    ],
  },
  {
    category: 'Date & Time',
    items: [
      { name: 'date-fns', desc: 'Modern date utility library', color: '#475569' },
    ],
  },
]

const SCHEMA_ITEMS = [
  {
    name: 'User',
    description: 'Application users with roles and preferences',
    fields: [
      { name: 'id', type: 'Int @id @default(autoincrement())' },
      { name: 'username', type: 'String @unique' },
      { name: 'email', type: 'String @unique' },
      { name: 'hashedPassword', type: 'String' },
      { name: 'fullName', type: 'String?' },
      { name: 'role', type: 'String (admin/editor/viewer)', note: 'default: user' },
      { name: 'weeklyCapacity', type: 'Int', note: 'default: 40' },
    ],
  },
  {
    name: 'Project',
    description: 'Top-level project container',
    fields: [
      { name: 'id', type: 'Int @id @default(autoincrement())' },
      { name: 'name', type: 'String' },
      { name: 'description', type: 'String?' },
      { name: 'color', type: 'String', note: 'hex color' },
      { name: 'status', type: 'String', note: 'Active/On Hold/Completed/Archived' },
      { name: 'startDate / dueDate', type: 'DateTime?' },
      { name: 'reference', type: 'String?' },
    ],
  },
  {
    name: 'Task',
    description: 'Individual work items within a project',
    fields: [
      { name: 'id', type: 'Int @id @default(autoincrement())' },
      { name: 'projectId', type: 'Int → Project (Cascade)' },
      { name: 'title', type: 'String' },
      { name: 'type', type: 'String', note: '2D CAD/CAD/CAM/Tools/Others' },
      { name: 'status', type: 'String', note: '7 statuses' },
      { name: 'priority', type: 'String', note: 'Critical/High/Medium/Low' },
      { name: 'progress', type: 'Int', note: '0-100' },
      { name: 'effort', type: 'Int?', note: 'hours' },
      { name: 'isMilestone', type: 'Boolean' },
      { name: 'assigneeId', type: 'Int? → User' },
    ],
  },
  {
    name: 'Conversation',
    description: 'AI chat conversations, optionally linked to a project',
    fields: [
      { name: 'id', type: 'Int @id @default(autoincrement())' },
      { name: 'title', type: 'String' },
      { name: 'projectId', type: 'Int? → Project (Cascade)' },
      { name: 'createdBy', type: 'Int → User' },
    ],
  },
  {
    name: 'AppSetting',
    description: 'Key-value store for application settings',
    fields: [
      { name: 'key', type: 'String @id' },
      { name: 'value', type: 'String', note: 'JSON for complex types' },
    ],
  },
]

const API_ENDPOINTS = [
  {
    path: '/api/auth',
    desc: 'Authentication',
    endpoints: [
      { method: 'POST', path: '/login', desc: 'Login' },
      { method: 'POST', path: '/register', desc: 'Register' },
      { method: 'GET', path: '/me', desc: 'Current user' },
      { method: 'POST', path: '/logout', desc: 'Logout' },
    ],
  },
  {
    path: '/api/projects',
    desc: 'Project management',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List all projects' },
      { method: 'POST', path: '/', desc: 'Create project' },
      { method: 'GET', path: '/:id', desc: 'Get project detail' },
      { method: 'PUT', path: '/:id', desc: 'Update project' },
      { method: 'DELETE', path: '/:id', desc: 'Delete project (cascade)' },
      { method: 'GET', path: '/:id/members', desc: 'List members' },
      { method: 'POST', path: '/:id/members', desc: 'Add member' },
      { method: 'GET', path: '/:id/tasks', desc: 'List project tasks' },
    ],
  },
  {
    path: '/api/tasks',
    desc: 'Task management',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List tasks (with filters)' },
      { method: 'POST', path: '/', desc: 'Create task' },
      { method: 'GET', path: '/:id', desc: 'Get task' },
      { method: 'PUT', path: '/:id', desc: 'Update task' },
      { method: 'DELETE', path: '/:id', desc: 'Delete task' },
      { method: 'GET', path: '/board', desc: 'Kanban board data' },
      { method: 'PUT', path: '/:id/status', desc: 'Update task status' },
      { method: 'POST', path: '/:id/dependencies', desc: 'Add dependency' },
    ],
  },
  {
    path: '/api/users',
    desc: 'User management',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List users' },
      { method: 'POST', path: '/', desc: 'Create user' },
      { method: 'PUT', path: '/:id', desc: 'Update user' },
      { method: 'DELETE', path: '/:id', desc: 'Delete user' },
    ],
  },
  {
    path: '/api/conversations',
    desc: 'AI chat',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List conversations' },
      { method: 'POST', path: '/', desc: 'Create conversation' },
      { method: 'GET', path: '/:id', desc: 'Get conversation' },
      { method: 'POST', path: '/:id/messages', desc: 'Send message' },
    ],
  },
]

const FEATURES = [
  { title: 'Dashboard', description: 'Overview of all projects, task statistics, upcoming deadlines, and recent activity.', icon: BarChart3 },
  { title: 'Project Management', description: 'Create, edit, archive projects with color coding, date ranges, and member assignment.', icon: FolderKanbanIcon },
  { title: 'Task List', description: 'Sortable, filterable task table with inline editing, bulk selection, and CSV export.', icon: Box },
  { title: 'Kanban Board', description: 'Drag-and-drop board with columns for each status. Supports cross-project view.', icon: Layers },
  { title: 'Gantt Chart', description: 'Visual timeline of tasks with dependencies, milestones, and progress tracking.', icon: CalendarDays },
  { title: 'Calendar View', description: 'Monthly calendar showing tasks by due date with project color coding.', icon: CalendarDays },
  { title: 'Capacity Planning', description: 'Team workload analysis with utilization rates and allocation overview.', icon: Users },
  { title: 'AI Planning', description: 'AI-assisted task breakdown, scheduling suggestions, and critical path analysis.', icon: Sparkles },
  { title: 'Conversations', description: 'AI-powered chat interface for project discussions and AI assistance.', icon: MessageSquare },
  { title: 'Role-Based Access', description: 'Three-tier permission system (Admin/Editor/Viewer) with fine-grained access control.', icon: Shield },
  { title: 'Dark Mode', description: 'System-aware theme with manual override. Fully responsive design.', icon: Palette },
  { title: 'CSV Export', description: 'Export projects and tasks data to CSV format for external reporting.', icon: ExternalLink },
]
