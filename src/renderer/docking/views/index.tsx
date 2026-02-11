/**
 * View Definitions
 * Maps view types to React components
 */

import React from 'react';
import {
  MessageSquare,
  LayoutGrid,
  FileText,
  Settings,
  Palette,
  Puzzle,
  Home,
  Wrench,
  History,
  Shield,
  Files,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import type { ViewTypeDefinition, ViewComponentProps } from '../ComponentRegistry';

// Lazy load components to avoid circular dependencies
const ChatPanelLazy = React.lazy(() =>
  import('../../components/ChatPanel').then((m) => ({ default: m.ChatPanel }))
);
const KanbanBoardLazy = React.lazy(() =>
  import('../../components/KanbanBoard').then((m) => ({ default: m.KanbanBoard }))
);
const TaskDetailLazy = React.lazy(() =>
  import('../../components/TaskDetail').then((m) => ({ default: m.TaskDetail }))
);
const SettingsPanelLazy = React.lazy(() =>
  import('../../components/SettingsPanel').then((m) => ({ default: m.SettingsPanel }))
);
const ThemeEditorLazy = React.lazy(() =>
  import('../../components/ThemeEditor').then((m) => ({ default: m.ThemeEditor }))
);
const BottomPanelLazy = React.lazy(() =>
  import('../../components/BottomPanel').then((m) => ({ default: m.BottomPanel }))
);
const PluginsPanelLazy = React.lazy(() =>
  import('../../components/PluginsPanel').then((m) => ({ default: m.PluginsPanel }))
);
const RunHistoryPanelLazy = React.lazy(() =>
  import('../../components/RunHistoryPanel').then((m) => ({ default: m.RunHistoryPanel }))
);
const PolicyEditorPanelLazy = React.lazy(() =>
  import('../../components/PolicyEditorPanel').then((m) => ({ default: m.PolicyEditorPanel }))
);
const TemplatesPanelLazy = React.lazy(() =>
  import('../../components/TemplatesPanel').then((m) => ({ default: m.TemplatesPanel }))
);
const RoadmapPanelLazy = React.lazy(() =>
  import('../../components/RoadmapPanel').then((m) => ({ default: m.RoadmapPanel }))
);
const DashboardPanelLazy = React.lazy(() =>
  import('../../components/DashboardPanel').then((m) => ({ default: m.DashboardPanel }))
);

// ============================================================================
// View Wrappers
// ============================================================================

const ChatView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <ChatPanelLazy />
  </React.Suspense>
);

const BoardView: React.FC<ViewComponentProps> = ({ params: _params }) => {
  const { openView } = useLayoutStoreActions();

  const handleTaskSelect = React.useCallback(
    (task: { id: string; title: string }) => {
      openView('taskDetail', { taskId: task.id, taskTitle: task.title });
    },
    [openView]
  );

  return (
    <React.Suspense fallback={<ViewLoading />}>
      <KanbanBoardLazy onTaskSelect={handleTaskSelect} />
    </React.Suspense>
  );
};

const TaskDetailView: React.FC<ViewComponentProps> = ({ viewId, params }) => {
  const { t } = useTranslation();
  const { closeView } = useLayoutStoreActions();
  const taskId = params.taskId as string;

  const handleClose = React.useCallback(() => {
    closeView(viewId);
  }, [closeView, viewId]);

  if (!taskId) {
    return <div className="p-4 text-muted-foreground">{t('views.docking.noTaskSelected')}</div>;
  }

  return (
    <React.Suspense fallback={<ViewLoading />}>
      <TaskDetailLazy taskId={taskId} onClose={handleClose} />
    </React.Suspense>
  );
};

const SettingsView: React.FC<ViewComponentProps> = () => {
  const { openView } = useLayoutStoreActions();

  const handleOpenThemeEditor = React.useCallback(
    (themeId: string, themeName?: string) => {
      openView('themeEditor', { themeId, themeName });
    },
    [openView]
  );

  return (
    <React.Suspense fallback={<ViewLoading />}>
      <SettingsPanelLazy onOpenThemeEditor={handleOpenThemeEditor} />
    </React.Suspense>
  );
};

const ThemeEditorView: React.FC<ViewComponentProps> = ({ params }) => {
  const themeId = params.themeId as string;
  const themeName = params.themeName as string | undefined;

  return (
    <React.Suspense fallback={<ViewLoading />}>
      <ThemeEditorLazy themeId={themeId} themeName={themeName} />
    </React.Suspense>
  );
};

const TaskRunnerView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <BottomPanelLazy />
  </React.Suspense>
);

const PluginsView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <PluginsPanelLazy />
  </React.Suspense>
);

const RunHistoryView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <RunHistoryPanelLazy />
  </React.Suspense>
);

const PolicyEditorView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <PolicyEditorPanelLazy />
  </React.Suspense>
);

const TemplatesView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <TemplatesPanelLazy />
  </React.Suspense>
);

const WelcomeView: React.FC<ViewComponentProps> = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <Home size={48} className="mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-medium mb-2">{t('views.welcome.title')}</h2>
        <p className="text-sm">{t('views.docking.openPanelHint')}</p>
      </div>
    </div>
  );
};

const RoadmapView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <RoadmapPanelLazy />
  </React.Suspense>
);

const DashboardView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <DashboardPanelLazy />
  </React.Suspense>
);

// ============================================================================
// Loading Component
// ============================================================================

const ViewLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ============================================================================
// Helper Hook
// ============================================================================

import { useLayoutActions } from '../store';

import { useTranslation } from '../../i18n/useTranslation';
function useLayoutStoreActions() {
  const { openView, closeView } = useLayoutActions();
  return { openView, closeView };
}

// ============================================================================
// View Definitions
// ============================================================================

export const viewDefinitions: ViewTypeDefinition[] = [
  {
    viewType: 'welcome',
    component: WelcomeView,
    title: 'Welcome',
    icon: Home,
    closable: true,
  },
  {
    viewType: 'chat',
    component: ChatView,
    title: 'Chat',
    icon: MessageSquare,
    closable: true,
  },
  {
    viewType: 'board',
    component: BoardView,
    title: 'Board',
    icon: LayoutGrid,
    closable: true,
  },
  {
    viewType: 'taskDetail',
    component: TaskDetailView,
    title: (params) => (params.taskTitle as string) || 'Task',
    icon: FileText,
    closable: true,
  },
  {
    viewType: 'settings',
    component: SettingsView,
    title: 'Settings',
    icon: Settings,
    closable: true,
  },
  {
    viewType: 'themeEditor',
    component: ThemeEditorView,
    title: (params) => (params.themeName as string) || 'Theme Editor',
    icon: Palette,
    closable: true,
  },
  {
    viewType: 'taskRunner',
    component: TaskRunnerView,
    title: 'Tools',
    icon: Wrench,
    closable: true,
  },
  {
    viewType: 'plugins',
    component: PluginsView,
    title: 'Plugins',
    icon: Puzzle,
    closable: true,
  },
  {
    viewType: 'runHistory',
    component: RunHistoryView,
    title: 'Run History',
    icon: History,
    closable: true,
  },
  {
    viewType: 'policyEditor',
    component: PolicyEditorView,
    title: 'Security Policy',
    icon: Shield,
    closable: true,
  },
  {
    viewType: 'templates',
    component: TemplatesView,
    title: 'Templates',
    icon: Files,
    closable: true,
  },
  {
    viewType: 'roadmap',
    component: RoadmapView,
    title: 'Roadmap',
    icon: Calendar,
    closable: true,
  },
  {
    viewType: 'dashboard',
    component: DashboardView,
    title: 'Dashboard',
    icon: LayoutDashboard,
    closable: true,
  },
];
