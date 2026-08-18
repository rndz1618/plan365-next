import { create } from 'zustand';

export type ViewType = 'dashboard' | 'projects' | 'tasks' | 'calendar' | 'capacity' | 'ai-planning' | 'conversations' | 'docs' | 'settings';

export interface User {
  id: number; username: string; email: string; fullName: string | null;
  role: string; isActive: boolean; weeklyCapacity: number; createdAt: string;
  preferences?: { userId: number; theme: string; accentColor: string; defaultView: string; density: string; sidebarCollapsed: boolean; itemsPerPage: number; } | null;
}
export interface Project {
  id: number; name: string; description: string | null; color: string; status: string;
  startDate: string | null; dueDate: string | null; reference: string | null; createdBy: number;
  _count?: { members: number; tasks: number };
}
export interface Task {
  id: number; projectId: number; title: string; description: string | null;
  type: string; status: string; priority: string; startDate: string | null;
  dueDate: string | null; progress: number; effort: number | null; labels: string;
  isMilestone: boolean; assigneeId: number | null; createdBy: number;
  figmaUrl?: string | null; prUrl?: string | null; attachmentUrl?: string | null;
  baselineStart?: string | null; baselineDue?: string | null;
  project?: { id: number; name: string; color: string } | null;
  assignee?: { id: number; username: string; fullName: string | null } | null;
  predecessorIds?: number[];
}
export interface TaskDependency {
  id: number; predecessorId: number; successorId: number; type: string; lagDays: number;
  predecessor: { id: number; title: string; status: string; startDate: string | null; dueDate: string | null };
  successor: { id: number; title: string; status: string; startDate: string | null; dueDate: string | null };
}
export interface TaskTemplate {
  id: number; name: string; description: string | null; type: string;
  category: string; tasksJson: string; isDefault: boolean;
}
export interface Conversation {
  id: number; title: string; projectId: number | null; createdBy: number;
  createdAt: string;
  creator?: { id: number; username: string; fullName: string | null };
  project?: { id: number; name: string; color: string };
  _count?: { messages: number };
  lastMessage?: { content: string; createdAt: string };
}
export interface ConversationMessage {
  id: number; conversationId: number; userId: number; content: string; createdAt: string;
  user?: { id: number; username: string; fullName: string | null };
}
export interface DashboardStats {
  totalProjects: number; totalTasks: number;
  tasksByStatus: Record<string, number>; upcomingDeadlines: Task[]; recentTasks: Task[];
}
export interface CapacityData {
  id: number; username: string; fullName: string; weeklyCapacity: number;
  monthlyCapacity: number; allocatedEffort: number; utilization: number;
  taskCount: number; tasks: { id: number; title: string; type: string; status: string; priority: string; effort: number | null; project: { name: string; color: string } }[];
}
export interface CriticalPathResult {
  tasks: { id: number; title: string; es: number; ef: number; ls: number; lf: number; duration: number; totalFloat: number; isCritical: boolean }[];
  criticalTaskIds: number[]; projectDuration: number;
}

interface AppState {
  user: User | null; setUser: (u: User | null) => void;
  currentView: ViewType; setCurrentView: (v: ViewType) => void;
  selectedProjectId: number | null; setSelectedProjectId: (id: number | null) => void;
  sidebarCollapsed: boolean; setSidebarCollapsed: (c: boolean) => void;
  projects: Project[]; setProjects: (p: Project[]) => void;
  selectedConversationId: number | null; setSelectedConversationId: (id: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null, setUser: (user) => set({ user }),
  currentView: 'dashboard', setCurrentView: (currentView) => set({ currentView }),
  selectedProjectId: null, setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  sidebarCollapsed: false, setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  projects: [], setProjects: (projects) => set({ projects }),
  selectedConversationId: null, setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId }),
}));

export const TASK_TYPES = ['2D CAD', 'CAD', 'CAM', 'Tools', 'Others'] as const;
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export const STATUSES = ['Todo', 'In Progress', 'Review', 'Testing', 'Done', 'Blocked', 'Handoff'] as const;
export const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed', 'Archived'] as const;

export const STATUS_COLORS: Record<string, string> = {
  'Todo': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'In Progress': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Testing': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'Done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Blocked': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'Handoff': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
};
export const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'bg-red-600 text-white', 'High': 'bg-orange-500 text-white',
  'Medium': 'bg-amber-400 text-amber-900', 'Low': 'bg-slate-400 text-white',
};
export const TYPE_COLORS: Record<string, string> = {
  '2D CAD': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'CAD': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'CAM': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Tools': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Others': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};
