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
  Terminal,
  Play,
  Puzzle,
  Home,
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

// ============================================================================
// View Wrappers
// ============================================================================

const ChatView: React.FC<ViewComponentProps> = () => (
  <React.Suspense fallback={<ViewLoading />}>
    <ChatPanelLazy />
  </React.Suspense>
);

const BoardView: React.FC<ViewComponentProps> = ({ params }) => {
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
  const { closeView } = useLayoutStoreActions();
  const taskId = params.taskId as string;

  const handleClose = React.useCallback(() => {
    closeView(viewId);
  }, [closeView, viewId]);

  if (!taskId) {
    return <div className="p-4 text-muted-foreground">No task selected</div>;
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

const WelcomeView: React.FC<ViewComponentProps> = () => (
  <div className="flex items-center justify-center h-full text-muted-foreground">
    <div className="text-center">
      <Home size={48} className="mx-auto mb-4 opacity-50" />
      <h2 className="text-lg font-medium mb-2">Welcome to Dexteria</h2>
      <p className="text-sm">Open a panel from the menu to get started</p>
    </div>
  </div>
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
    title: 'Task Runner',
    icon: Terminal,
    closable: true,
  },
  {
    viewType: 'plugins',
    component: WelcomeView, // Placeholder
    title: 'Plugins',
    icon: Puzzle,
    closable: true,
  },
  {
    viewType: 'logs',
    component: WelcomeView, // Placeholder
    title: 'Logs',
    icon: Terminal,
    closable: true,
  },
  {
    viewType: 'terminal',
    component: WelcomeView, // Placeholder
    title: 'Terminal',
    icon: Terminal,
    closable: true,
  },
  {
    viewType: 'jsonEditor',
    component: WelcomeView, // Placeholder
    title: 'JSON Editor',
    icon: FileText,
    closable: true,
  },
];
