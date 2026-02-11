/**
 * useKeyboardShortcuts
 *
 * Global keyboard shortcuts hook for Dexteria.
 * Provides common shortcuts for power users.
 */

import { useEffect, useCallback } from 'react';
import { useLayoutStore } from '../docking';
import { useMode } from '../contexts/ModeContext';

interface ShortcutHandlers {
  onNewTask?: () => void;
  onSearch?: () => void;
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts(handlers?: ShortcutHandlers) {
  const openView = useLayoutStore((s) => s.openView);
  const { mode, setMode } = useMode();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' ||
                   target.tagName === 'TEXTAREA' ||
                   target.isContentEditable;

    // Allow Escape in inputs to blur them
    if (e.key === 'Escape' && isInput) {
      (target as HTMLInputElement).blur();
      return;
    }

    // Skip if in input (except for specific shortcuts)
    if (isInput) return;

    const ctrlOrMeta = e.ctrlKey || e.metaKey;

    // Ctrl+1 - Open Board view
    if (ctrlOrMeta && e.key === '1') {
      e.preventDefault();
      openView('board');
      return;
    }

    // Ctrl+2 - Open Chat view
    if (ctrlOrMeta && e.key === '2') {
      e.preventDefault();
      openView('chat');
      return;
    }

    // Ctrl+3 - Open Task Runner view
    if (ctrlOrMeta && e.key === '3') {
      e.preventDefault();
      openView('taskRunner');
      return;
    }

    // Ctrl+4 - Open Run History view
    if (ctrlOrMeta && e.key === '4') {
      e.preventDefault();
      openView('runHistory');
      return;
    }

    // Ctrl+5 - Open Settings view
    if (ctrlOrMeta && e.key === '5') {
      e.preventDefault();
      openView('settings');
      return;
    }

    // Ctrl+Shift+P - Switch to Planner mode
    if (ctrlOrMeta && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      setMode('planner');
      return;
    }

    // Ctrl+Shift+A - Switch to Agent mode
    if (ctrlOrMeta && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setMode('agent');
      return;
    }

    // Ctrl+N - New task (if handler provided)
    if (ctrlOrMeta && e.key === 'n') {
      e.preventDefault();
      handlers?.onNewTask?.();
      return;
    }

    // Ctrl+K or Ctrl+F - Focus search (if handler provided)
    if (ctrlOrMeta && (e.key === 'k' || e.key === 'f')) {
      e.preventDefault();
      handlers?.onSearch?.();
      return;
    }

    // ? or F1 - Show keyboard shortcuts help
    if (e.key === '?' || e.key === 'F1') {
      e.preventDefault();
      handlers?.onShowHelp?.();
      return;
    }

  }, [openView, setMode, mode, handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Export shortcut descriptions for help UI
export const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl+1', action: 'views.kanban.title', category: 'navigation' },
  { keys: 'Ctrl+2', action: 'views.chat.title', category: 'navigation' },
  { keys: 'Ctrl+3', action: 'views.taskRunner.title', category: 'navigation' },
  { keys: 'Ctrl+4', action: 'views.runHistory.title', category: 'navigation' },
  { keys: 'Ctrl+5', action: 'views.settings.title', category: 'navigation' },
  { keys: 'Ctrl+Shift+P', action: 'shortcuts.plannerMode', category: 'mode' },
  { keys: 'Ctrl+Shift+A', action: 'shortcuts.agentMode', category: 'mode' },
  { keys: 'Ctrl+N', action: 'shortcuts.newTask', category: 'actions' },
  { keys: 'Ctrl+K', action: 'shortcuts.search', category: 'actions' },
  { keys: 'Escape', action: 'shortcuts.closeOrBlur', category: 'general' },
  { keys: '? / F1', action: 'shortcuts.showHelp', category: 'general' },
] as const;
