/**
 * Project Handlers
 *
 * IPC handlers for project management operations (open, create, close, recent).
 */

import * as fs from 'fs';
import * as path from 'path';
import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import { initStore } from '../../services/LocalKanbanStore';
import { Runner } from '../../agent/tools/Runner';
import { initRalphEngine } from '../../agent/RalphEngine';
import { analyzeProject } from '../../services/ProjectAnalyzer';
import {
  getProjectRoot,
  setProjectRoot,
  setStore,
  setRunner,
  getOrCreateProvider,
  loadRecentProjects,
  addToRecentProjects,
  ClaudeCodeProvider,
  setAgentProvider,
} from './shared';
import {
  startRun,
  stopRun,
  startBuild,
  stopBuild,
  getProcessStatus,
  getAllProcessStatus,
  setMainWindow as setProcessManagerWindow,
} from '../../services/ProjectProcessManager';
import type { ProjectProcessStatus, ProjectRunResult, ProjectProcessType, ProjectContext } from '../../../shared/types';

/**
 * Open a project at the given path.
 */
async function openProject(projectPath: string, mainWindow: BrowserWindow | null, projectName?: string): Promise<boolean> {
  try {
    // Notify renderer immediately that we're opening a project (show loader)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('project:opening', projectPath);
    }

    // Initialize store for this project (will create .local-kanban defaults if needed)
    const store = initStore(projectPath, projectName);
    setStore(store);
    setProjectRoot(projectPath);

    // Re-initialize provider with new working directory
    const currentProvider = getOrCreateProvider();
    if (currentProvider instanceof ClaudeCodeProvider) {
      currentProvider.setWorkingDirectory(projectPath);
    } else {
      setAgentProvider(new ClaudeCodeProvider({ workingDirectory: projectPath }));
    }

    // Initialize runner and ralph engine first (fast operations)
    const policy = store.getPolicy();
    const runner = new Runner(projectPath, policy, store);
    setRunner(runner);

    const agentProvider = getOrCreateProvider();
    initRalphEngine({
      projectRoot: projectPath,
      store,
      provider: agentProvider instanceof ClaudeCodeProvider ? agentProvider : undefined,
    });

    // Note: Theme and Plugin services are now global (stored in AppData)
    // They are initialized once at app startup, not per-project

    // Add to recent projects
    addToRecentProjects(projectPath);

    // Notify renderer that project is ready (before analysis completes)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('project:changed', projectPath);
    }

    console.log('Opened project:', projectPath);

    // Analyze project context in background (non-blocking)
    // Use setImmediate to defer execution and not block the event loop
    setImmediate(async () => {
      try {
        await analyzeAndSetProjectContext(projectPath, store);
        console.log('[Project] Background analysis complete');
      } catch (err) {
        console.error('[Project] Background analysis failed:', err);
      }
    });

    return true;
  } catch (err) {
    console.error('Failed to open project:', err);
    return false;
  }
}

/**
 * Analyze project and set context on the AI provider.
 */
async function analyzeAndSetProjectContext(projectPath: string, store: ReturnType<typeof initStore>): Promise<void> {
  try {
    // Check if we have cached context that's still fresh (less than 1 hour old)
    const existingContext = store.getProjectContext();
    const ONE_HOUR = 60 * 60 * 1000;

    if (existingContext && existingContext.updatedAt) {
      const lastUpdate = new Date(existingContext.updatedAt).getTime();
      const now = Date.now();

      if (now - lastUpdate < ONE_HOUR) {
        console.log('[Project] Using cached project context');
        setContextOnProvider(existingContext);
        return;
      }
    }

    // Analyze the project
    console.log('[Project] Analyzing project context...');
    const context = await analyzeProject(projectPath);

    // Save to store
    store.saveProjectContext(context);

    // Set on provider
    setContextOnProvider(context);

    console.log('[Project] Project context analyzed and set');
  } catch (err) {
    console.error('[Project] Failed to analyze project context:', err);
    // Continue without context - not a fatal error
  }
}

/**
 * Set project context on the current AI provider.
 */
function setContextOnProvider(context: ProjectContext): void {
  const provider = getOrCreateProvider();
  if (provider instanceof ClaudeCodeProvider) {
    provider.setProjectContext(context);
  }
}

/**
 * Register all project-related IPC handlers.
 */
export function registerProjectHandlers(): void {
  // Open project via dialog
  ipcMain.handle('project:open', async (event): Promise<{ success: boolean; path?: string; error?: string }> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: 'Open Project',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' };
    }

    const projectPath = result.filePaths[0];
    const success = await openProject(projectPath, win);

    return success
      ? { success: true, path: projectPath }
      : { success: false, error: 'Failed to open project' };
  });

  // Create new project via dialog
  // Uses openDirectory dialog - user creates/selects a folder for the project
  ipcMain.handle('project:create', async (event): Promise<{ success: boolean; path?: string; error?: string }> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    // Show folder dialog - user can create a new folder or select an existing empty one
    const result = await dialog.showOpenDialog(win!, {
      title: 'Create New Project - Select or Create Folder',
      buttonLabel: 'Create Project Here',
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
      message: 'Select or create a folder for your new project',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' };
    }

    const projectPath = result.filePaths[0];
    const projectName = path.basename(projectPath);

    // Check if this folder already has a .local-kanban (already a Dexteria project)
    const kanbanPath = path.join(projectPath, '.local-kanban');
    if (fs.existsSync(kanbanPath)) {
      // Just open it as existing project
      const success = await openProject(projectPath, win, projectName);
      return success
        ? { success: true, path: projectPath }
        : { success: false, error: 'Failed to open existing project' };
    }

    // Initialize as new project
    const success = await openProject(projectPath, win, projectName);

    return success
      ? { success: true, path: projectPath }
      : { success: false, error: 'Failed to create project' };
  });

  // Create new project by name (no dialog - used by interview wizard)
  ipcMain.handle('project:createWithName', async (event, projectName: string): Promise<{ success: boolean; path?: string; error?: string }> => {
    if (!projectName || !projectName.trim()) {
      return { success: false, error: 'Project name is required' };
    }

    const win = BrowserWindow.fromWebContents(event.sender);
    const safeName = projectName.trim().replace(/[<>:"/\\|?*]/g, '_');
    const baseDir = path.join(app.getPath('documents'), 'Dexteria Projects');

    // Ensure base directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // Find a unique folder name
    let projectPath = path.join(baseDir, safeName);
    let suffix = 1;
    while (fs.existsSync(projectPath) && fs.existsSync(path.join(projectPath, '.local-kanban'))) {
      projectPath = path.join(baseDir, `${safeName} (${suffix})`);
      suffix++;
    }

    // Create the folder if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const success = await openProject(projectPath, win, projectName.trim());
    return success
      ? { success: true, path: projectPath }
      : { success: false, error: 'Failed to create project' };
  });

  // Open project by path
  ipcMain.handle('project:openPath', async (event, projectPath: string): Promise<{ success: boolean; error?: string }> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!fs.existsSync(projectPath)) {
      return { success: false, error: 'Path does not exist' };
    }

    const success = await openProject(projectPath, win);
    return success
      ? { success: true }
      : { success: false, error: 'Failed to open project' };
  });

  // Close current project
  ipcMain.handle('project:close', async (event): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    // Clear project state
    setStore(null);
    setProjectRoot(null);
    setRunner(null);

    // Notify renderer
    if (win && !win.isDestroyed()) {
      win.webContents.send('project:changed', null);
    }

    console.log('Project closed');
  });

  // Get current project path
  ipcMain.handle('project:getCurrent', async (): Promise<string | null> => {
    return getProjectRoot();
  });

  // Get recent projects
  ipcMain.handle('project:getRecent', async (): Promise<{ path: string; name: string; lastOpened: string }[]> => {
    const projects = loadRecentProjects();
    // Filter out projects that no longer exist
    return projects.filter(p => fs.existsSync(p.path));
  });

  // ============================================
  // Project Process Management
  // ============================================

  // Start run process
  ipcMain.handle('project:startRun', async (event): Promise<ProjectRunResult> => {
    const projectRoot = getProjectRoot();
    if (!projectRoot) {
      return { runId: '', success: false, logPath: '', error: 'No project open' };
    }

    // Set main window for status updates
    const win = BrowserWindow.fromWebContents(event.sender);
    setProcessManagerWindow(win);

    return startRun(projectRoot);
  });

  // Stop run process
  ipcMain.handle('project:stopRun', async (): Promise<boolean> => {
    return stopRun();
  });

  // Start build process
  ipcMain.handle('project:startBuild', async (event): Promise<ProjectRunResult> => {
    const projectRoot = getProjectRoot();
    if (!projectRoot) {
      return { runId: '', success: false, logPath: '', error: 'No project open' };
    }

    // Set main window for status updates
    const win = BrowserWindow.fromWebContents(event.sender);
    setProcessManagerWindow(win);

    return startBuild(projectRoot);
  });

  // Stop build process
  ipcMain.handle('project:stopBuild', async (): Promise<boolean> => {
    return stopBuild();
  });

  // Get process status
  ipcMain.handle('project:getProcessStatus', async (_, type: ProjectProcessType): Promise<ProjectProcessStatus> => {
    return getProcessStatus(type);
  });

  // Get all process statuses
  ipcMain.handle('project:getAllProcessStatus', async (): Promise<ProjectProcessStatus[]> => {
    return getAllProcessStatus();
  });
}
