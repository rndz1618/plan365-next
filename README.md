# Plan365 — Project Management & Planning Platform

> **Version:** 1.0.0  
> **Last Updated:** June 2025  
> **Status:** Active Development

Plan365 is a full-featured project management application designed for engineering teams. It provides comprehensive tools for task tracking, project planning, resource management, and AI-assisted planning.

The application is built with a modern tech stack optimized for reliability and performance, targeting low-resource environments such as single-board computers (2GB RAM).

## Key Stats

| Metric | Value |
|--------|-------|
| Projects | Unlimited |
| Task Types | 5 (2D CAD, CAD, CAM, Tools, Others) |
| Task Statuses | 7 (Todo, In Progress, Review, Testing, Done, Blocked, Handoff) |
| Priorities | 4 (Critical, High, Medium, Low) |
| AI Features | LLM + VLM powered |
| Database | PostgreSQL |

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Development Guide](#development-guide)
- [Default Login](#default-login)

## Overview

Plan365 is designed to help engineering teams manage projects from planning to execution. It includes:

- **Project Management**: Create, edit, delete projects with color coding, date range tracking, reference codes, status management, member assignment, and project progress tracking.
- **Task List**: Sortable, filterable table view with inline editing, bulk selection, CSV export, filtering, assignee management, label management, Figma/PR URL fields, and milestone support.
- **Kanban Board**: Drag-and-drop between status columns, project-scoped and cross-project views, card shows priority, assignee, due date.
- **Gantt Chart**: Visual timeline of tasks with dependencies, milestone markers, progress bars, critical path highlighting, baseline comparison.
- **Calendar View**: Monthly calendar showing tasks by due date, project color coding, navigation between months.
- **Capacity Planning**: Team workload analysis, utilization rates per member, effort allocation overview, weekly capacity settings per user.
- **AI Planning**: AI-assisted task breakdown, scheduling suggestions, critical path analysis, project-specific AI conversations.
- **Conversations**: AI-powered chat interface, project-linked conversations, chat history with context.
- **Role-Based Access Control**: Admin, Editor, Viewer roles with granular permissions.
- **Dark Mode**: System-aware theme detection, manual override, per-user preference stored in database.
- **CSV Export**: Export projects and tasks to CSV format.

## Tech Stack

### Core Framework
- **Next.js 16** – App Router, Server Components, API Routes
- **TypeScript 5** – Strict type safety throughout
- **Bun Runtime** – Fast JS runtime & package manager (also works with Node.js 18+)

### Database & ORM
- **PostgreSQL** – Robust relational database
- **Prisma ORM** – Type-safe database client with migrations

### UI & Styling
- **Tailwind CSS 4** – Utility-first CSS framework
- **shadcn/ui** – Radix UI primitive components (New York style)
- **Lucide Icons** – Beautiful open-source icon set
- **Framer Motion** – Smooth page transitions and animations

### State & Data
- **Zustand** – Lightweight client state management
- **TanStack Table** – Headless table component for task list

### Drag & Drop
- **@hello-pangea/dnd** – Kanban board drag-and-drop (react-beautiful-dnd fork)

### Auth & Security
- **JWT** – JSON Web Token authentication (HTTP-only cookies)
- **bcrypt** – Secure password hashing

### Date & Time
- **date-fns** – Modern date utility library

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

### Models (Summary)
- **User**: id, username, email, hashedPassword, fullName, role, isActive, weeklyCapacity
- **Project**: id, name, description, color, status, startDate, dueDate, reference, supportingData, createdBy
- **Task**: id, projectId, title, description, type, status, priority, startDate, dueDate, progress, effort, isMilestone, assigneeId, figmaUrl, prUrl, labels, attachmentUrl, baselineStart, baselineDue
- **TaskDependency**: predecessorId, successorId, type, lagDays
- **Conversation**: id, title, projectId, createdBy
- **ConversationMessage**: conversationId, userId, content
- **AppSetting**: key, value, updatedBy

> **⚠️ Cascade Delete:** Deleting a Project will cascade-delete all related Tasks, ProjectMembers, Conversations, ConversationMessages, and TaskDependencies. This is irreversible — a confirmation dialog with task/member counts is shown before deletion.

## API Endpoints

All API routes require JWT authentication (except login/register). Returns JSON responses.

### Authentication `/api/auth`
- `POST /api/auth/login` – Login with username + password
- `POST /api/auth/register` – Register new user
- `GET /api/auth/me` – Get current authenticated user
- `POST /api/auth/logout` – Clear auth cookie

### Projects `/api/projects`
- `GET /api/projects` – List all projects with task counts
- `POST /api/projects` – Create a new project
- `GET /api/projects/:id` – Get project detail with members
- `PUT /api/projects/:id` – Update project fields
- `DELETE /api/projects/:id` – Delete project (cascade all related data)
- `GET /api/projects/:id/members` – List project members
- `POST /api/projects/:id/members` – Add member to project
- `DELETE /api/projects/:id/members/:userId` – Remove member from project
- `GET /api/projects/:id/tasks` – List tasks for a project

### Tasks `/api/tasks`
- `GET /api/tasks` – List tasks (supports `?projectId=`, `?status=`, `?type=`, `?assigneeId=` filters)
- `POST /api/tasks` – Create a new task
- `GET /api/tasks/:id` – Get single task with dependencies
- `PUT /api/tasks/:id` – Update task
- `DELETE /api/tasks/:id` – Delete task
- `GET /api/tasks/board` – Get Kanban board data (`?projectId=`)
- `PUT /api/tasks/:id/status` – Update task status only (for drag-drop)
- `POST /api/tasks/:id/dependencies` – Add task dependency
- `DELETE /api/tasks/:id/dependencies` – Remove task dependency

### Users `/api/users`
- `GET /api/users` – List all users
- `POST /api/users` – Create user (admin only)
- `PUT /api/users/:id` – Update user
- `DELETE /api/users/:id` – Delete user (admin only)

### Dashboard `/api/dashboard`
- `GET /api/dashboard/stats` – Get dashboard statistics

### Conversations `/api/conversations`
- `GET /api/conversations` – List conversations
- `POST /api/conversations` – Create conversation
- `GET /api/conversations/:id` – Get conversation with messages
- `POST /api/conversations/:id/messages` – Send message (AI response)

### Export `/api/export`
- `GET /api/export?type=projects` – Export projects as CSV
- `GET /api/export?type=tasks` – Export tasks as CSV

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
- Confirmation dialog before deletion showing task & member counts

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

## Deployment

### Prerequisites
- **Bun** runtime (recommended) or Node.js 18+
- **PostgreSQL** 14+

### Quick Start (Development)
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
│   │       ├── users/                # User CRUD
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       ├── dashboard/            # Dashboard stats
│   │       │   └── route.ts
│   │       ├── conversations/        # Conversations + messages
│   │       │   ├── route.ts
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts
│   │       │   │   └── messages/
│   │       │   │       └── route.ts
│   │       ├── export/               # CSV export
│   │       │   └── route.ts
│   │       ├── dependencies/         # Dependencies endpoint
│   │       │   └── route.ts
│   │       ├── capacity/             # Capacity planning
│   │       │   └── route.ts
│   │       ├── critical-path/        # Critical path analysis
│   │       │   └── route.ts
│   │       ├── backup/               # Backup endpoint
│   │       │   └── route.ts
│   │       └── settings/             # App settings
│   │           └── route.ts
│   ├── components/                   # Reusable UI components
│   │   ├── ui/                       # shadcn/ui components
│   │   └── plan365/                  # Domain-specific components
│   │       ├── dashboard-view.tsx
│   │       ├── projects-view.tsx
│   │       ├── tasks-view.tsx
│   │       ├── kanban-view.tsx
│   │       ├── gantt-view.tsx
│   │       ├── calendar-view.tsx
│   │       ├── capacity-view.tsx
│   │       ├── ai-planning-view.tsx
│   │       ├── conversations-view.tsx
│   │       ├── settings-view.tsx
│   │       ├── sidebar.tsx
│   │       ├── topbar.tsx
│   │       ├── shared.tsx
│   │       ├── embedded-task-list.tsx
│   │       ├── docs-view.tsx
│   │       └── login-page.tsx
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-toast.ts
│   │   └── use-mobile.ts
│   ├── lib/                          # Utilities (auth, db, etc.)
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── utils.ts
│   ├── store/                        # Zustand stores
│   │   └── plan365.ts
│   └── seed.ts                       # Database seeder
├── public/                           # Static assets
│   ├── logo.svg
│   └── robots.txt
├── prisma/                           # Prisma schema & migrations
│   └── schema.prisma
├── .gitignore
├── components.json                   # shadcn/ui config
├── DEPLOY.md                         # Deployment guides
├── DOCUMENTATION.md                  # Detailed documentation
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── render.yaml                       # Render Blueprint
├── tailwind.config.ts
└── tsconfig.json
```

## Development Guide

1. **Fork and clone the repository**
2. **Install dependencies** (Bun recommended): `bun install`
3. **Set up PostgreSQL** and update `.env` with `DATABASE_URL` and `JWT_SECRET`
4. **Run database migrations**: `bun run db:push`
5. **Start the development server**: `bun run dev`
6. **Open** `http://localhost:3000` in your browser
7. **Login** with default credentials (admin/admin) and change password immediately

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- State management with [Zustand](https://zustand-demo.pmndrs.com/)
- Table headless from [TanStack Table](https://tanstack.com/table/latest)
- Drag and drop from [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- ORM with [Prisma](https://prisma.io/)
- Authentication with JWT and bcrypt