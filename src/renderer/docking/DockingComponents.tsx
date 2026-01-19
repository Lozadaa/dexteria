/**
 * Docking Components
 * Wrapper components for the docking system
 */

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import type { ComponentDefinition } from './types';
import { COMPONENT_KEYS } from './defaultLayout';
import { useDocking } from './DockingContext';

// Import actual components
import { KanbanBoard } from '../components/KanbanBoard';
import { ChatPanel } from '../components/ChatPanel';
import { TaskDetail } from '../components/TaskDetail';
import { ThemeEditor } from '../components/ThemeEditor';
import { SettingsPanel } from '../components/SettingsPanel';
import { BottomPanel } from '../components/BottomPanel';
import { PluginComponentLoader } from '../plugins/PluginComponentLoader';
import type { Task } from '../../shared/types';
import type { DockingPanelContribution } from '../contexts/ExtensionPointsContext';

// ============================================================================
// Docking Events Context
// For cross-component communication (e.g., opening a task detail from board)
// ============================================================================

interface DockingEventsContextValue {
  onTaskSelect: (task: Task) => void;
  onOpenThemeEditor: (themeId: string, themeName?: string) => void;
  onOpenSettings: () => void;
}

const DockingEventsContext = createContext<DockingEventsContextValue | null>(null);

export function useDockingEvents(): DockingEventsContextValue {
  const context = useContext(DockingEventsContext);
  if (!context) {
    throw new Error('useDockingEvents must be used within DockingEventsProvider');
  }
  return context;
}

interface DockingEventsProviderProps {
  children: React.ReactNode;
}

export const DockingEventsProvider: React.FC<DockingEventsProviderProps> = ({ children }) => {
  const { openTab, updateTabProps, focusTab, state } = useDocking();

  const onTaskSelect = useCallback(
    (task: Task) => {
      // Check if there's already a tab for this task
      const existingTab = Object.values(state.tabs).find(
        (t) => t.componentKey === COMPONENT_KEYS.TASK_DETAIL && t.props?.taskId === task.id
      );

      if (existingTab) {
        focusTab(existingTab.id);
        return;
      }

      // Open new task detail tab
      const tabId = openTab(COMPONENT_KEYS.TASK_DETAIL, {
        props: { taskId: task.id, taskTitle: task.title },
      });

      // Update tab title
      updateTabProps(tabId, { taskId: task.id, taskTitle: task.title });
    },
    [openTab, updateTabProps, focusTab, state.tabs]
  );

  const onOpenThemeEditor = useCallback(
    (themeId: string, themeName?: string) => {
      // Check if there's already a tab for this theme
      const existingTab = Object.values(state.tabs).find(
        (t) => t.componentKey === COMPONENT_KEYS.THEME_EDITOR && t.props?.themeId === themeId
      );

      if (existingTab) {
        focusTab(existingTab.id);
        return;
      }

      // Open new theme editor tab
      openTab(COMPONENT_KEYS.THEME_EDITOR, {
        props: { themeId, themeName },
      });
    },
    [openTab, focusTab, state.tabs]
  );

  const onOpenSettings = useCallback(() => {
    openTab(COMPONENT_KEYS.SETTINGS);
  }, [openTab]);

  const value: DockingEventsContextValue = {
    onTaskSelect,
    onOpenThemeEditor,
    onOpenSettings,
  };

  return (
    <DockingEventsContext.Provider value={value}>
      {children}
    </DockingEventsContext.Provider>
  );
};

// ============================================================================
// Board Component Wrapper
// ============================================================================

interface BoardWrapperProps {
  tabId?: string;
}

const BoardWrapper: React.FC<BoardWrapperProps> = () => {
  const { onTaskSelect } = useDockingEvents();
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>(undefined);

  const handleTaskSelect = useCallback(
    (task: Task) => {
      setActiveTaskId(task.id);
      onTaskSelect(task);
    },
    [onTaskSelect]
  );

  return (
    <KanbanBoard
      onTaskSelect={handleTaskSelect}
      activeTaskId={activeTaskId}
    />
  );
};

// ============================================================================
// Chat Component Wrapper
// ============================================================================

interface ChatWrapperProps {
  tabId?: string;
}

const ChatWrapper: React.FC<ChatWrapperProps> = () => {
  return <ChatPanel />;
};

// ============================================================================
// Task Detail Component Wrapper
// ============================================================================

interface TaskDetailWrapperProps {
  tabId?: string;
  taskId?: string;
  taskTitle?: string;
}

const TaskDetailWrapper: React.FC<TaskDetailWrapperProps> = ({ tabId, taskId }) => {
  const { closeTab, updateTabProps, state } = useDocking();

  const handleClose = useCallback(() => {
    if (tabId) {
      closeTab(tabId);
    }
  }, [tabId, closeTab]);

  // Update tab title when task changes
  useEffect(() => {
    if (tabId && taskId) {
      const tab = state.tabs[tabId];
      if (tab && tab.title === 'Task') {
        // Try to get task title from props
        const title = (tab.props?.taskTitle as string) || `Task ${taskId.substring(0, 6)}`;
        updateTabProps(tabId, { title });
      }
    }
  }, [tabId, taskId, state.tabs, updateTabProps]);

  if (!taskId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No task selected
      </div>
    );
  }

  return <TaskDetail taskId={taskId} onClose={handleClose} />;
};

// ============================================================================
// Theme Editor Component Wrapper
// ============================================================================

interface ThemeEditorWrapperProps {
  tabId?: string;
  themeId?: string;
  themeName?: string;
}

const ThemeEditorWrapper: React.FC<ThemeEditorWrapperProps> = ({ themeId, themeName }) => {
  if (!themeId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No theme selected
      </div>
    );
  }

  return <ThemeEditor themeId={themeId} themeName={themeName} />;
};

// ============================================================================
// Settings Component Wrapper
// ============================================================================

interface SettingsWrapperProps {
  tabId?: string;
}

const SettingsWrapper: React.FC<SettingsWrapperProps> = () => {
  const { onOpenThemeEditor } = useDockingEvents();

  return <SettingsPanel onOpenThemeEditor={onOpenThemeEditor} />;
};

// ============================================================================
// Task Runner Component Wrapper
// ============================================================================

interface TaskRunnerWrapperProps {
  tabId?: string;
}

const TaskRunnerWrapper: React.FC<TaskRunnerWrapperProps> = () => {
  return <BottomPanel />;
};

// ============================================================================
// Plugin Panel Component Wrapper
// ============================================================================

interface PluginPanelWrapperProps {
  tabId?: string;
  pluginId?: string;
  pluginPath?: string;
  panelId?: string;
}

const PluginPanelWrapper: React.FC<PluginPanelWrapperProps> = ({
  pluginId,
  pluginPath,
  panelId,
}) => {
  if (!pluginId || !pluginPath) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Plugin configuration missing
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <PluginComponentLoader
        pluginId={pluginId}
        pluginPath={pluginPath}
        slotId="docking:panel"
        context={{ panelId }}
      />
    </div>
  );
};

/**
 * Creates a ComponentDefinition for a plugin docking panel contribution.
 * This allows plugins to be registered in the docking system.
 */
export function createPluginPanelDefinition(
  contribution: DockingPanelContribution
): ComponentDefinition {
  const componentKey = `plugin:${contribution.pluginId}:${contribution.id}`;

  // Create a bound wrapper component for this specific plugin
  const BoundPluginPanel: React.FC<Record<string, unknown>> = (props) => (
    <PluginPanelWrapper
      {...props}
      pluginId={contribution.pluginId}
      pluginPath={contribution.pluginPath}
      panelId={contribution.id}
    />
  );

  return {
    key: componentKey,
    component: BoundPluginPanel,
    defaultTitle: contribution.title,
    icon: contribution.icon,
    closable: true,
    singleton: contribution.singleton ?? false,
  };
}

// ============================================================================
// Component Definitions for Registry
// ============================================================================

export const dockingComponents: ComponentDefinition[] = [
  {
    key: COMPONENT_KEYS.BOARD,
    component: BoardWrapper as React.ComponentType<Record<string, unknown>>,
    defaultTitle: 'Board',
    icon: 'LayoutGrid',
    closable: false,
    singleton: true,
  },
  {
    key: COMPONENT_KEYS.CHAT,
    component: ChatWrapper as React.ComponentType<Record<string, unknown>>,
    defaultTitle: 'Chat',
    icon: 'MessageSquare',
    closable: true,
    singleton: false,
  },
  {
    key: COMPONENT_KEYS.TASK_DETAIL,
    component: TaskDetailWrapper as React.ComponentType<Record<string, unknown>>,
    defaultTitle: 'Task',
    icon: 'FileText',
    closable: true,
    singleton: false,
  },
  {
    key: COMPONENT_KEYS.THEME_EDITOR,
    component: ThemeEditorWrapper as React.ComponentType<Record<string, unknown>>,
    defaultTitle: 'Theme Editor',
    icon: 'Palette',
    closable: true,
    singleton: false,
  },
  {
    key: COMPONENT_KEYS.SETTINGS,
    component: SettingsWrapper as React.ComponentType<Record<string, unknown>>,
    defaultTitle: 'Settings',
    icon: 'Settings',
    closable: true,
    singleton: true,
  },
  {
    key: COMPONENT_KEYS.TASK_RUNNER,
    component: TaskRunnerWrapper as React.ComponentType<Record<string, unknown>>,
    defaultTitle: 'Task Runner',
    icon: 'Play',
    closable: true,
    singleton: true,
  },
];

export default dockingComponents;
