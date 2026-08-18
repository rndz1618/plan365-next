'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

import { useAppStore, type ViewType } from '@/store/plan365';

import LoginPage from '@/components/plan365/login-page';
import { Sidebar } from '@/components/plan365/sidebar';
import { Topbar } from '@/components/plan365/topbar';
import { DashboardView } from '@/components/plan365/dashboard-view';
import { ProjectsView } from '@/components/plan365/projects-view';
import { TasksView } from '@/components/plan365/tasks-view';
import { CalendarView } from '@/components/plan365/calendar-view';
import { CapacityView } from '@/components/plan365/capacity-view';
import { AIPlanningView } from '@/components/plan365/ai-planning-view';
import { ConversationsView } from '@/components/plan365/conversations-view';
import { DocsView } from '@/components/plan365/docs-view';
import SettingsView from '@/components/plan365/settings-view';

function AppShell() {
  const { user, currentView, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    if (user?.preferences?.theme && ['light', 'dark', 'system'].includes(user.preferences.theme)) {
      setTheme(user.preferences.theme);
    }
  }, [user?.preferences?.theme, setTheme]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'projects': return <ProjectsView />;
      case 'tasks': return <TasksView />;
      case 'calendar': return <CalendarView />;
      case 'capacity': return <CapacityView />;
      case 'ai-planning': return <AIPlanningView />;
      case 'conversations': return <ConversationsView />;
      case 'docs': return <DocsView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} hidden lg:flex flex-col shrink-0 transition-all duration-300`}>
        <Sidebar onNavigate={closeMobile} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={closeMobile}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden"
            >
              <Sidebar onNavigate={closeMobile} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(prev => !prev)} />
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default function Home() {
  const { user, setUser, setProjects, setSelectedProjectId, projects } = useAppStore();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    // Check auth
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    // Always fetch projects on app init (needed after page refresh)
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.projects) {
          setProjects(data.projects);
          // Auto-select first project if none selected
          if (!useAppStore.getState().selectedProjectId && data.projects.length > 0) {
            setSelectedProjectId(data.projects[0].id);
          }
        }
      })
      .catch(() => {});
  }, [setUser, setProjects, setSelectedProjectId]);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <AppShell />;
}
