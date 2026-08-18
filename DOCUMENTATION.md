# Plan365 — Project Management & Planning Platform

> **Version:** 1.0.0  
> **Last Updated:** June 2025  
> **Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Features](#features)
7. [Authentication](#authentication)
8. [Deployment](#deployment)
9. [Project Structure](#project-structure)
10. [Development Guide](#development-guide)

---

## Overview

**Plan365** is a full-featured project management application designed for engineering teams. It provides comprehensive tools for task tracking, project planning, resource management, and AI-assisted planning.

The application is built with a modern tech stack optimized for reliability and performance, targeting low-resource environments such as single-board computers (2GB RAM).

### Key Stats

| Metric | Value |
|--------|-------|
| Projects | Unlimited |
| Task Types | 5 (2D CAD, CAD, CAM, Tools, Others) |
| Task Statuses | 7 (Todo, In Progress, Review, Testing, Done, Blocked, Handoff) |
| Priorities | 4 (Critical, High, Medium, Low) |
| AI Features | LLM + VLM powered |
| Database | PostgreSQL |

---

## Tech Stack

### Core Framework

| Technology | Description |
|------------|-------------|
| **Next.js 16** | App Router, Server Components, API Routes |
| **TypeScript 5** | Strict type safety throughout |
| **Bun Runtime** | Fast JS runtime & package manager |

### Database & ORM

| Technology | Description |
|------------|-------------|
| **PostgreSQL** | Robust relational database |
| **Prisma ORM** | Type-safe database client with migrations |

### UI & Styling

| Technology | Description |
|------------|-------------|
| **Tailwind CSS 4** | Utility-first CSS framework |
| **shadcn/ui** | Radix UI primitive components (New York style) |
| **Lucide Icons** | Beautiful open-source icon set |
| **Framer Motion** | Smooth page transitions and animations |

### State & Data

| Technology | Description |
|------------|-------------|
| **Zustand** | Lightweight client state management |
| **TanStack Table** | Headless table component for task list |

### Drag & Drop

| Technology | Description |
|------------|-------------|
| **@hello-pangea/dnd** | Kanban board drag-and-drop (react-beautiful-dnd fork) |

### Auth & Security

| Technology | Description |
|------------|-------------|
| **JWT** | JSON Web Token authentication (HTTP-only cookies) |
| **bcrypt** | Secure password hashing |

### Date & Time

| Technology | Description |
|------------|-------------|
| **date-fns** | Modern date utility library |

---

## Architecture

Plan365 follows a **monolithic architecture** with clear separation of concerns. The frontend and backend share the same Next.js codebase.

### Key Patterns

- **Client State**: Zustand store manages global state (selected project, current view, user session)
- **Server State**: Direct `fetch()` calls with loading/error states in components
- **Routing**: Single-page app with view switching via Zustand (no client-side URL routing)
- **API Design**: RESTful API routes under `/api/*` with JWT authentication
- **UI Components**: shadcn/ui (Radix UI primitives) + Tailwind CSS 4 + Lucide icons
- **Single Route**: All views rendered in `/` route with state-driven view switching

### Data Flow

```
User Action → Zustand Store Update → View Re-render
                ↓
         API Fetch/Mutation → Prisma → PostgreSQL
```

---

## Database Schema

The database uses **PostgreSQL** via Prisma ORM. All cascade deletions are handled at the database level.

### Entity Relationship

```
User ──┬── ProjectMember ──── Project
       ├── Task (creator) ──── Project (cascade delete)
       ├── Task (assignee)
       ├── Conversation (creator) ──── Project (cascade delete)
       └── ConversationMessage

Project ──┬── Task (cascade)
          ├── ProjectMember (cascade)
          └── Conversation (cascade)

Task ──┬── TaskDependency (predecessor, cascade)
       └── TaskDependency (successor, cascade)

Conversation ──── ConversationMessage (cascade)
```

### Models

#### User

| Field | Type | Notes |
|-------|------|-------|
| id | Int | @id, auto (sequence) |
| username | String | @unique |
| email | String | @unique |
| hashedPassword | String | bcrypt hashed |
| fullName | String? | |
| role | String | admin / editor / viewer (default: user) |
| isActive | Boolean | default: true |
| weeklyCapacity | Int | default: 40 hours |

#### Project

| Field | Type | Notes |
|-------|------|-------|
| id | Int | @id, auto (sequence) |
| name | String | |
| description | String? | |
| color | String | hex color, default: #3b82f6 |
| status | String | Active / On Hold / Completed / Archived |
| startDate | DateTime? | |
| dueDate | DateTime? | |
| reference | String? | e.g. PRJ-001 |
| supportingData | String? | JSON string for extra data |
| createdBy | Int | → User |

#### Task

| Field | Type | Notes |
|-------|------|-------|
| id | Int | @id, auto (sequence) |
| projectId | Int | → Project (cascade delete) |
| title | String | |
| description | String? | |
| type | String | 2D CAD / CAD / CAM / Tools / Others |
| status | String | Todo / In Progress / Review / Testing / Done / Blocked / Handoff |
| priority | String | Critical / High / Medium / Low |
| startDate | DateTime? | |
| dueDate | DateTime? | |
| progress | Int | 0-100, default: 0 |
| effort | Int? | Estimated hours |
| isMilestone | Boolean | default: false |
| assigneeId | Int? | → User |
| figmaUrl | String? | |
| prUrl | String? | |
| labels | String | JSON array string, default: "[]" |
| attachmentUrl | String? | |
| baselineStart | DateTime? | For Gantt baseline |
| baselineDue | DateTime? | For Gantt baseline |

#### TaskDependency

| Field | Type | Notes |
|-------|------|-------|
| predecessorId | Int | → Task (cascade) |
| successorId | Int | → Task (cascade) |
| type | String | FS / SS / FF / SF, default: FS |
| lagDays | Int | default: 0 |

#### Conversation

| Field | Type | Notes |
|-------|------|-------|
| id | Int | @id, auto (sequence) |
| title | String | |
| projectId | Int? | → Project (cascade) |
| createdBy | Int | → User |

#### ConversationMessage

| Field | Type | Notes |
|-------|------|-------|
| conversationId | Int | → Conversation (cascade) |
| userId | Int | → User |
| content | String | |

#### AppSetting

| Field | Type | Notes |
|-------|------|-------|
| key | String | @id |
| value | String | JSON for complex types |
| updatedBy | Int? | → User |

> **⚠️ Cascade Delete:** Deleting a Project will cascade-delete all related Tasks, ProjectMembers, Conversations, ConversationMessages, and TaskDependencies. This is irreversible — a confirmation dialog with task/member counts is shown before deletion.

---

## API Endpoints

All API routes require JWT authentication (except login/register). Returns JSON responses.

### Authentication `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with username + password |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/logout` | Clear auth cookie |

### Projects `/api/projects`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects with task counts |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/:id` | Get project detail with members |
| PUT | `/api/projects/:id` | Update project fields |
| DELETE | `/api/projects/:id` | Delete project (cascade all related data) |
| GET | `/api/projects/:id/members` | List project members |
| POST | `/api/projects/:id/members` | Add member to project |
| DELETE | `/api/projects/:id/members/:userId` | Remove member from project |
| GET | `/api/projects/:id/tasks` | List tasks for a project |

### Tasks `/api/tasks`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks (supports `?projectId=`, `?status=`, `?type=`, `?assigneeId=` filters) |
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks/:id` | Get single task with dependencies |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/board` | Get Kanban board data (`?projectId=`) |
| PUT | `/api/tasks/:id/status` | Update task status only (for drag-drop) |
| POST | `/api/tasks/:id/dependencies` | Add task dependency |
| DELETE | `/api/tasks/:id/dependencies` | Remove task dependency |

### Users `/api/users`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user (admin only) |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user (admin only) |

### Dashboard `/api/dashboard`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |

### Conversations `/api/conversations`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Get conversation with messages |
| POST | `/api/conversations/:id/messages` | Send message (AI response) |

### Export `/api/export`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export?type=projects` | Export projects as CSV |
| GET | `/api/export?type=tasks` | Export tasks as CSV |

---

## Features

### Dashboard
Overview of all projects with task statistics, upcoming deadlines, and recent activity.

### Project Management
- Create, edit, delete projects with color coding
- Date range tracking (start/due dates)
- Reference codes (e.g. PRJ-001)
- Status management (Active, On Hold, Completed, Archived)
- Member assignment
- Project progress tracking
- **Confirmation dialog** before deletion showing task & member counts

### Task List
- Sortable, filterable table view
- Inline editing via detail dialog
- Bulk selection
- CSV export
- Priority/type/status filtering
- Assignee management
- Label management (JSON array)
- Figma URL & PR URL fields
- Milestone support

### Kanban Board
- Drag-and-drop between status columns
- Powered by @hello-pangea/dnd
- Project-scoped and cross-project views
- Card shows priority, assignee, due date

### Gantt Chart
- Visual timeline of tasks with dependencies
- Milestone markers
- Progress bars
- Critical path highlighting
- Baseline comparison

### Calendar View
- Monthly calendar showing tasks by due date
- Project color coding
- Navigation between months

### Capacity Planning
- Team workload analysis
- Utilization rates per member
- Effort allocation overview
- Weekly capacity settings per user

### AI Planning
- AI-assisted task breakdown
- Scheduling suggestions
- Critical path analysis
- Project-specific AI conversations

### Conversations
- AI-powered chat interface
- Project-linked conversations
- Chat history with context

### Role-Based Access Control

| Feature | Admin | Editor | Viewer |
|---------|-------|--------|--------|
| View Dashboard | ✅ | ✅ | ✅ |
| Create Projects | ✅ | ✅ | ❌ |
| Edit Projects | ✅ | ✅ | ❌ |
| Delete Projects | ✅ | ❌ | ❌ |
| Create Tasks | ✅ | ✅ | ❌ |
| Edit Tasks | ✅ | ✅ | ❌ |
| Delete Tasks | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ |
| AI Features | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ |

### Dark Mode
- System-aware theme detection
- Manual override (Light / Dark / System)
- Per-user preference stored in database

### CSV Export
- Export projects and tasks to CSV format
- Accessible from Projects and Tasks views

---

## Authentication

### Auth Flow

1. User submits credentials to `POST /api/auth/login`
2. Server validates password (bcrypt) and returns JWT in HTTP-only cookie
3. Client includes cookie automatically in subsequent requests
4. Server middleware (`getAuthUser()`) validates JWT on protected routes
5. User role (admin/editor/viewer) controls access to features

### JWT Implementation

- Token stored in HTTP-only cookie (not localStorage)
- Middleware function `getAuthUser()` used in all protected API routes
- Cookie path: `/`
- Token contains: `{ userId, username, role }`

---

## Deployment

### Prerequisites

- **Bun** runtime (recommended) or Node.js 18+
- **PostgreSQL** 14+

### Quick Start

```bash
# Install dependencies
bun install

# Push schema to PostgreSQL
bun run db:push

# Start development server
bun run dev

# Access the app
open http://localhost:3000
```

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/plan365"
JWT_SECRET="your-secret-key-here"

# Optional
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Cloud Deployment

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step guides for:

- **Render** (with `render.yaml` Blueprint — recommended)
- **Railway**
- **Vercel + Neon/Supabase**
- **VPS** (Docker or manual)

### Production Build

```bash
bun run build
bun start
```

> **💡 Tip:** A `render.yaml` Blueprint file is included for one-click Render deployment.

### Default Login

- **Username:** `admin`
- **Password:** `admin`
- **Role:** admin

> Change the default password after first login via Settings.

---

## Project Structure

```
plan365/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Single-page entry (view router)
│   │   ├── layout.tsx                # Root layout (providers, fonts, theme)
│   │   ├── globals.css               # Tailwind CSS + custom styles
│   │   └── api/                      # API routes
│   │       ├── auth/                 # Authentication (login, register, me, logout)
│   │       ├── projects/             # Project CRUD + members
│   │       │   ├── route.ts          # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts      # GET, PUT, DELETE
│   │       │       ├── members/      # Member management
│   │       │       └── tasks/        # Project-scoped tasks
│   │       ├── tasks/                # Task CRUD + board + dependencies
│   │       │   ├── route.ts          # GET (list), POST (create)
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts      # GET, PUT, DELETE
│   │       │   │   ├── status/       # Status update (for drag-drop)
│   │       │   │   └── dependencies/ # Task dependencies
│   │       │   └── board/            # Kanban board data
│   │       ├── users/                # User management (CRUD)
│   │       ├── dashboard/            # Dashboard statistics
│   │       ├── conversations/        # AI chat conversations
│   │       │   ├── route.ts          # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── messages/     # Send message + AI response
│   │       └── export/               # CSV export
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── tooltip.tsx
│   │   └── plan365/                 # Application components
│   │       ├── sidebar.tsx           # Navigation sidebar
│   │       ├── topbar.tsx            # Top navigation bar
│   │       ├── login-page.tsx        # Login screen
│   │       ├── shared.tsx            # Shared components (Avatar, EmptyState, etc.)
│   │       ├── dashboard-view.tsx    # Dashboard overview
│   │       ├── projects-view.tsx     # Project management + detail view
│   │       ├── tasks-view.tsx        # Task list + kanban + gantt tabs
│   │       ├── kanban-view.tsx       # Kanban board (drag-drop)
│   │       ├── gantt-view.tsx        # Gantt chart timeline
│   │       ├── embedded-task-list.tsx # Task list for project detail
│   │       ├── calendar-view.tsx     # Monthly calendar
│   │       ├── capacity-view.tsx     # Capacity planning
│   │       ├── ai-planning-view.tsx  # AI planning features
│   │       ├── conversations-view.tsx # AI chat
│   │       ├── docs-view.tsx         # Notion-style documentation
│   │       └── settings-view.tsx     # App settings
│   ├── store/
│   │   └── plan365.ts              # Zustand global store
│   └── lib/
│       ├── db.ts                    # Prisma client singleton
│       ├── auth.ts                  # JWT auth helpers (getAuthUser, signToken)
│       └── utils.ts                 # Utility functions (cn helper)
├── prisma/
│   └── schema.prisma               # Database schema definition
├── public/                          # Static assets
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
├── tailwind.config.ts              # Tailwind CSS config
├── next.config.ts                  # Next.js config
├── components.json                 # shadcn/ui config
└── bun.lock                        # Lock file
```

---

## Development Guide

### Adding a New View

1. Add the view name to `ViewType` in `src/store/plan365.ts`
2. Create the view component in `src/components/plan365/`
3. Import and add a case in `src/app/page.tsx` → `renderView()`
4. Add nav item in `src/components/plan365/sidebar.tsx` → `NAV_ITEMS`
5. Add title in `src/components/plan365/topbar.tsx` → `VIEW_TITLES`

### Adding a New API Route

1. Create route file under `src/app/api/`
2. Import `getAuthUser` from `@/lib/auth` for authentication
3. Import `db` from `@/lib/db` for database access
4. Return `NextResponse.json()` for success/errors

### Database Changes

1. Edit `prisma/schema.prisma`
2. Run `bun run db:push` to apply changes
3. Update TypeScript interfaces in `src/store/plan365.ts` if needed

### Important Constraints

- **Radix UI Select:** `Select.Item` cannot have `value=""` — use sentinel like `"__none__"`
- **AppSetting values:** All stored as strings; complex types need `JSON.parse()` / `JSON.stringify()`
- **Single route app:** All views render at `/` — no additional routes
- **Port constraint:** App must run on port 3000
- **API requests:** Use relative paths only (no `http://localhost:3000`)

---

## License

Private project — All rights reserved.
