/**
 * Interview Handlers
 *
 * IPC handlers for the project interview wizard.
 */

import { ipcMain, BrowserWindow, app } from 'electron';
import {
  InterviewEngine,
  createInterviewEngine,
  getInterviewEngine,
  clearInterviewEngine,
} from '../../services/InterviewEngine';
import { getStore, getOrCreateProvider, hasProject } from './shared';
import type {
  InterviewConfig,
  InterviewState,
  InterviewAnswer,
  InterviewQuestion,
  ProjectBrief,
  BacklogEpic,
  SubmitAnswerResult,
  CreateTasksResult,
} from '../../../shared/types';

// ============================================================================
// Engine Management
// ============================================================================

/**
 * Get or create the interview engine.
 * Throws if store is not initialized - caller should handle this appropriately.
 */
function getOrCreateEngine(mainWindow: BrowserWindow | null): InterviewEngine {
  let engine = getInterviewEngine();

  if (!engine) {
    console.log('[Interview] Creating new engine...');

    // Check store readiness before creating engine
    let store;
    try {
      store = getStore();
    } catch (error) {
      console.error('[Interview] Store not initialized:', error);
      throw new Error('Store not initialized - cannot start interview. Please open a project first.');
    }

    if (!store) {
      throw new Error('Store not initialized - cannot start interview. Please open a project first.');
    }

    const provider = getOrCreateProvider();
    console.log('[Interview] Store:', !!store, 'Provider:', provider?.getName?.());

    engine = createInterviewEngine({
      store,
      provider,
      mainWindow,
    });
  } else {
    console.log('[Interview] Reusing existing engine');
  }

  return engine;
}

// ============================================================================
// IPC Handlers
// ============================================================================

/**
 * Register all interview-related IPC handlers.
 */
export function registerInterviewHandlers(): void {
  // Initialize interview
  ipcMain.handle(
    'interview:init',
    async (event, config: InterviewConfig): Promise<InterviewState> => {
      // Clear any existing engine so a fresh one is created
      clearInterviewEngine();
      const win = BrowserWindow.fromWebContents(event.sender);
      const engine = getOrCreateEngine(win);
      return engine.init(config);
    }
  );

  // Resume interview
  ipcMain.handle(
    'interview:resume',
    async (event, projectPath: string): Promise<InterviewState | null> => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const engine = getOrCreateEngine(win);
      return engine.resume(projectPath);
    }
  );

  // Get next question
  ipcMain.handle(
    'interview:nextQuestion',
    async (event): Promise<InterviewQuestion | null> => {
      console.log('[IPC] interview:nextQuestion called');
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const engine = getOrCreateEngine(win);
        console.log('[IPC] Engine obtained, calling generateNextQuestion');
        const question = await engine.generateNextQuestion();
        console.log('[IPC] Question generated:', question?.text?.substring(0, 50));
        return question;
      } catch (err) {
        console.error('[IPC] interview:nextQuestion error:', err);
        return null;
      }
    }
  );

  // Submit answer
  ipcMain.handle(
    'interview:submitAnswer',
    async (event, answer: InterviewAnswer): Promise<SubmitAnswerResult> => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const engine = getOrCreateEngine(win);
      return engine.submitAnswer(answer);
    }
  );

  // Get options for "I don't know"
  ipcMain.handle('interview:getOptions', async (event): Promise<string[]> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const engine = getOrCreateEngine(win);
    return engine.getOptions();
  });

  // Skip current question
  ipcMain.handle(
    'interview:skip',
    async (event): Promise<InterviewState> => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const engine = getOrCreateEngine(win);
      return engine.skip();
    }
  );

  // Get example answer
  ipcMain.handle('interview:getExample', async (event): Promise<string> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const engine = getOrCreateEngine(win);
    return engine.getExample();
  });

  // Generate project brief
  ipcMain.handle(
    'interview:generateBrief',
    async (event): Promise<ProjectBrief> => {
      console.log('[IPC] interview:generateBrief called');
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const engine = getOrCreateEngine(win);
        const brief = await engine.generateBrief();
        console.log('[IPC] generateBrief done, summary length:', brief?.summary?.length);
        return brief;
      } catch (err) {
        console.error('[IPC] interview:generateBrief error:', err);
        throw err;
      }
    }
  );

  // Generate backlog
  ipcMain.handle(
    'interview:generateBacklog',
    async (event): Promise<BacklogEpic[]> => {
      console.log('[IPC] interview:generateBacklog called');
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const engine = getOrCreateEngine(win);
        const backlog = await engine.generateBacklog();
        console.log('[IPC] generateBacklog done, epics:', backlog?.length, 'total stories:', backlog?.reduce((a, e) => a + (e.stories?.length || 0), 0));
        return backlog;
      } catch (err) {
        console.error('[IPC] interview:generateBacklog error:', err);
        throw err;
      }
    }
  );

  // Create tasks from backlog
  ipcMain.handle(
    'interview:createTasks',
    async (event, _projectPath: string): Promise<CreateTasksResult> => {
      console.log('[IPC] interview:createTasks called');
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const engine = getOrCreateEngine(win);
        console.log('[IPC] Calling engine.createTasks...');
        const result = await engine.createTasks();
        console.log('[IPC] createTasks result:', result);
        return result;
      } catch (err) {
        console.error('[IPC] interview:createTasks error:', err);
        return {
          success: false,
          taskCount: 0,
          setupTaskCount: 0,
          backlogTaskCount: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }
  );

  // Skip backlog and create project without tasks
  ipcMain.handle(
    'interview:skipBacklog',
    async (event): Promise<CreateTasksResult> => {
      console.log('[IPC] interview:skipBacklog called');
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const engine = getOrCreateEngine(win);
        console.log('[IPC] Calling engine.skipBacklogAndFinalize...');
        const result = await engine.skipBacklogAndFinalize();
        console.log('[IPC] skipBacklogAndFinalize result:', result);
        return result;
      } catch (err) {
        console.error('[IPC] interview:skipBacklog error:', err);
        return {
          success: false,
          taskCount: 0,
          setupTaskCount: 0,
          backlogTaskCount: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }
  );

  // Save and exit
  ipcMain.handle(
    'interview:saveAndExit',
    async (event): Promise<{ success: boolean }> => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const engine = getOrCreateEngine(win);
      return engine.saveAndExit();
    }
  );

  // Cancel interview
  ipcMain.handle(
    'interview:cancel',
    async (event): Promise<{ success: boolean }> => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const engine = getOrCreateEngine(win);
      const result = await engine.cancel();
      clearInterviewEngine();
      return result;
    }
  );

  // Get OS locale
  ipcMain.handle('interview:getLocale', async (): Promise<string> => {
    const locale = app.getLocale();
    // Extract language code (e.g., "es-ES" -> "es")
    return locale.split('-')[0] || 'en';
  });

  // Check if interview is in progress
  ipcMain.handle('interview:isActive', async (): Promise<boolean> => {
    // Check if a project is open first
    if (!hasProject()) {
      console.log('[IPC] interview:isActive called, no project open, result: false');
      return false;
    }

    try {
      const store = getStore();
      const isActive = store?.hasActiveInterview() ?? false;
      console.log('[IPC] interview:isActive called, result:', isActive);
      return isActive;
    } catch (err) {
      console.error('[IPC] interview:isActive error:', err);
      return false;
    }
  });

  console.log('[IPC] Interview handlers registered');
}
