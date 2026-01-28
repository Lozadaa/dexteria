/**
 * Agent Handlers
 *
 * IPC handlers for agent runtime and Ralph mode operations.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { AgentRuntime } from '../../agent/AgentRuntime';
import { getRalphEngine } from '../../agent/RalphEngine';
import {
  hasProject,
  getStore,
  getProjectRoot,
  getOrCreateProvider,
  getRuntime,
  setRuntime,
  ClaudeCodeProvider,
  OpenCodeProvider,
  CodexProvider,
} from './shared';
import type { AgentRun, RunTaskOptions, RalphModeOptions, Task } from '../../../shared/types';

// Track current running state
let currentRunningTaskId: string | null = null;

/**
 * Run task directly with ClaudeCodeProvider (simpler flow)
 * Uses same streaming pattern as chat
 */
async function runTaskWithClaudeCode(
  provider: ClaudeCodeProvider,
  task: Task,
  projectRoot: string,
  win: BrowserWindow | null
): Promise<{ success: boolean; content: string; error?: string }> {

  // Helper to send stream updates (same as chat)
  const sendUpdate = (text: string, done: boolean, cancelled: boolean = false) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('agent:stream-update', {
        taskId: task.id,
        taskTitle: task.title,
        content: text,
        done,
        cancelled,
      });
    }
  };

  // Build task prompt
  const taskPrompt = `## Task to Execute

**Title:** ${task.title}
**ID:** ${task.id}

**Description:**
${task.description || 'No description provided.'}

**Acceptance Criteria:**
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Instructions

Please complete this task. When done, summarize what you accomplished.
`;

  // Accumulate content (declared outside try so catch can access it)
  let accumulated = '';

  try {
    // Set working directory to project root
    provider.setWorkingDirectory(projectRoot);

    // Send full text each time (same as chat)
    const onChunk = (chunk: string) => {
      accumulated += chunk;
      sendUpdate(accumulated, false);
    };

    // Call complete with streaming - use 'execution' mode for TaskRunner
    const response = await provider.complete(
      [{ role: 'user', content: taskPrompt }],
      undefined,
      onChunk,
      'execution'
    );

    // Use accumulated content or response content
    const finalContent = accumulated || response.content;

    // Send final update
    sendUpdate(finalContent, true);

    // Consider success if we got content and no error
    const success = response.finishReason !== 'error' && finalContent.length > 0;

    return {
      success,
      content: finalContent,
      error: success ? undefined : (response.content || 'No response received'),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Check if it was cancelled
    if (errorMsg === 'Cancelled') {
      sendUpdate(accumulated + '\n\n❌ **CANCELLED**', true, true);
      return { success: false, content: '', error: 'Cancelled by user' };
    }

    sendUpdate(`${accumulated}\n\n❌ **Error:** ${errorMsg}`, true);
    return { success: false, content: '', error: errorMsg };
  }
}

/**
 * Register all agent-related IPC handlers.
 */
export function registerAgentHandlers(): void {
  // Run a single task
  ipcMain.handle('agent:runTask', async (event, taskId: string, options?: RunTaskOptions): Promise<{
    success: boolean;
    run: AgentRun | null;
    error?: string;
  }> => {
    const projectRoot = getProjectRoot();
    if (!hasProject() || !projectRoot) {
      return {
        success: false,
        run: null,
        error: 'No project open',
      };
    }

    const s = getStore();
    const win = BrowserWindow.fromWebContents(event.sender);

    // Get task
    const task = s.getTask(taskId);
    if (!task) {
      return { success: false, run: null, error: 'Task not found' };
    }

    // AUTO-MOVE: Move task to "doing" status before starting
    if (task.status !== 'doing') {
      s.moveTask(taskId, 'doing');
      console.log(`[Agent] Moved task ${taskId} to "doing"`);
    }
    s.updateTaskRuntime(taskId, { status: 'running' });
    currentRunningTaskId = taskId;

    // Clear previous failure comments when re-running
    // (They're kept for history but runtime status is updated)

    // Get provider
    const provider = getOrCreateProvider();

    // Use simplified flow for ClaudeCodeProvider
    if (provider instanceof ClaudeCodeProvider) {
      console.log('[Agent] Using ClaudeCodeProvider direct flow');

      const result = await runTaskWithClaudeCode(provider, task, projectRoot, win);

      // Create a simple run record
      const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const run: AgentRun = {
        id: runId,
        taskId,
        mode: options?.mode || 'manual',
        startedAt: new Date().toISOString(),
        status: result.success ? 'completed' : 'failed',
        steps: 1,
        toolCalls: [],
        patches: [],
        commands: [],
        filesModified: [],
        completedAt: new Date().toISOString(),
        summary: result.success ? 'Task completed' : `Failed: ${result.error}`,
        error: result.error,
      };

      // Update task status based on result
      if (result.success) {
        s.moveTask(taskId, 'review');
        s.updateTaskRuntime(taskId, { status: 'done' });
        console.log(`[Agent] Task ${taskId} completed, moved to "review"`);

        // Add success comment
        s.addTypedComment(taskId, 'agent', 'dexter', `Task completed.\n\n${result.content.substring(0, 500)}...`, runId);
      } else if (result.error === 'Cancelled by user') {
        // Cancelled - move back to backlog or keep in doing
        s.updateTaskRuntime(taskId, { status: 'idle' });
        console.log(`[Agent] Task ${taskId} cancelled by user`);

        // Add cancellation comment
        s.addTypedComment(taskId, 'system', 'system', 'Task execution cancelled by user.', runId);
      } else {
        s.updateTaskRuntime(taskId, { status: 'failed' });
        console.log(`[Agent] Task ${taskId} failed: ${result.error}`);

        // Add failure comment
        s.addTypedComment(taskId, 'failure', 'dexter', `**Task Failed**\n\n**Run ID:** ${runId}\n\n**Reason:** ${result.error}`, runId);
      }

      currentRunningTaskId = null;
      return { success: result.success, run, error: result.error };
    }

    // Fallback to AgentRuntime for other providers
    const runtime = new AgentRuntime({
      projectRoot,
      store: s,
      provider,
    });
    setRuntime(runtime);

    try {
      const result = await runtime.runTask(taskId, options || { mode: 'manual' });

      if (result.success) {
        s.moveTask(taskId, 'review');
        s.updateTaskRuntime(taskId, { status: 'done' });
      } else {
        s.updateTaskRuntime(taskId, { status: 'failed' });
      }

      currentRunningTaskId = null;
      return {
        success: result.success,
        run: result.run,
        error: result.error,
      };
    } catch (error) {
      s.updateTaskRuntime(taskId, { status: 'failed' });
      currentRunningTaskId = null;
      throw error;
    }
  });

  // Cancel current task
  ipcMain.handle('agent:cancel', async (): Promise<void> => {
    console.log('[Agent] Cancel requested');

    // Cancel ClaudeCodeProvider if active
    const provider = getOrCreateProvider();
    if (provider instanceof ClaudeCodeProvider) {
      provider.cancel();
    }

    // Also cancel runtime if using other providers
    const runtime = getRuntime();
    if (runtime) {
      runtime.cancel();
    }

    // Always cleanup task state, even if no process is running
    // This handles the case where the process died unexpectedly
    if (hasProject()) {
      const s = getStore();

      // If we know which task was running, clean it up
      if (currentRunningTaskId) {
        const task = s.getTask(currentRunningTaskId);
        if (task && task.runtime.status === 'running') {
          s.updateTaskRuntime(currentRunningTaskId, {
            status: 'idle',
            currentRunId: undefined
          });
          console.log(`[Agent] Cleaned up task ${currentRunningTaskId} state`);
        }
      } else {
        // No tracked task, but user wants to cancel - clean any orphaned running tasks
        const tasks = s.getTasks();
        for (const task of tasks) {
          if (task.runtime.status === 'running') {
            s.updateTaskRuntime(task.id, {
              status: 'idle',
              currentRunId: undefined
            });
            console.log(`[Agent] Cleaned up orphaned running task ${task.id}`);
          }
        }
      }
    }

    currentRunningTaskId = null;
  });

  // Check if running
  ipcMain.handle('agent:isRunning', async (): Promise<boolean> => {
    return currentRunningTaskId !== null || getRuntime()?.isRunning() || false;
  });

  // Get current run
  ipcMain.handle('agent:getCurrentRun', async (): Promise<AgentRun | null> => {
    return getRuntime()?.getCurrentRun() || null;
  });

  // Start Ralph Mode
  ipcMain.handle('ralph:start', async (event, options?: RalphModeOptions): Promise<{
    success: boolean;
    processed: number;
    completed: number;
    failed: number;
    blocked: number;
    stoppedReason?: string;
  }> => {
    if (!hasProject()) {
      return { success: false, processed: 0, completed: 0, failed: 0, blocked: 0, stoppedReason: 'No project open' };
    }

    // Set window getter for stream updates
    const ralph = getRalphEngine();
    ralph.setWindowGetter(() => BrowserWindow.fromWebContents(event.sender));

    // Set provider if not already set (supports all CLI-based providers)
    const provider = getOrCreateProvider();
    if (provider instanceof ClaudeCodeProvider || provider instanceof OpenCodeProvider || provider instanceof CodexProvider) {
      ralph.setProvider(provider);
    }

    const result = await ralph.startRalphMode(options);
    return {
      success: result.success,
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      blocked: result.blocked,
      stoppedReason: result.stoppedReason,
    };
  });

  // Stop Ralph Mode
  ipcMain.handle('ralph:stop', async (): Promise<void> => {
    if (!hasProject()) return;
    getRalphEngine().stopRalphMode();
  });

  // Pause Ralph Mode
  ipcMain.handle('ralph:pause', async (): Promise<void> => {
    if (!hasProject()) return;
    getRalphEngine().pause();
  });

  // Resume Ralph Mode
  ipcMain.handle('ralph:resume', async (): Promise<void> => {
    if (!hasProject()) return;
    getRalphEngine().resume();
  });

  // Get Ralph progress
  ipcMain.handle('ralph:getProgress', async (): Promise<{
    total: number;
    completed: number;
    failed: number;
    blocked: number;
    currentTaskId: string | null;
    currentTaskTitle: string | null;
    status: string;
  }> => {
    if (!hasProject()) {
      return { total: 0, completed: 0, failed: 0, blocked: 0, currentTaskId: null, currentTaskTitle: null, status: 'idle' };
    }
    return getRalphEngine().getProgress();
  });

  // Check if Ralph is running
  ipcMain.handle('ralph:isRunning', async (): Promise<boolean> => {
    if (!hasProject()) return false;
    return getRalphEngine().isRunning();
  });
}
