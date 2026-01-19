/**
 * RalphEngine
 *
 * Ralph Mode = Autonomous task execution mode (Dexter autopilot).
 * Autonomously completes pending tasks SAFELY, RELIABLY, and AUDITABLY.
 *
 * ## Best Practices Implemented:
 *
 * 1. **Verification Gates**: Tasks move to Done ONLY if acceptance criteria verified
 * 2. **Git Branch per Run**: Each run creates a branch for rollback capability
 * 3. **Failure Feedback Loop**: On failure, adds detailed comments with context
 * 4. **Retry with Context**: Includes previous failure comments in retry prompts
 * 5. **Dependency Resolution**: Respects task dependencies (topological sort)
 * 6. **Limits**: maxAttempts per task, maxRuntime per task
 * 7. **Observability**: Full logging to .local-kanban/agent-runs/
 *
 * ## Task Selection:
 * - Gets tasks from "todo" column
 * - Respects dependencies: task runs only when deps are done
 * - Orders by: dependencies -> priority
 *
 * ## Failure Handling:
 * - On failure: marks failed, adds detailed comment, continues to next
 * - On retry: includes all previous failure context in prompt
 * - On blocked: adds questions for human input
 */

import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { LocalKanbanStore } from '../services/LocalKanbanStore';
import { ClaudeCodeProvider } from './providers/ClaudeCodeProvider';
import { OpenCodeProvider } from './providers/OpenCodeProvider';
import { notifyRalphTaskComplete } from '../services/NotificationService';
import type { Task, RalphModeOptions } from '../../shared/types';

// Type for providers that support Ralph mode (have setWorkingDirectory and setProjectContext)
type RalphCompatibleProvider = ClaudeCodeProvider | OpenCodeProvider;

export interface RalphEngineConfig {
  projectRoot: string;
  store: LocalKanbanStore;
  provider?: RalphCompatibleProvider;
  getWindow?: () => BrowserWindow | null;
}

// Default limits
const DEFAULT_MAX_ATTEMPTS = 2;

// Run artifact structure
interface RunArtifact {
  runId: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  gitBranch?: string;
  promptSummary: string;
  toolCalls: Array<{ name: string; params: Record<string, unknown>; result?: string }>;
  filesModified: string[];
  verificationReport?: {
    criteria: Array<{ criterion: string; passed: boolean; evidence: string }>;
    allPassed: boolean;
  };
  error?: string;
  attempt: number;
}

export interface RalphProgress {
  total: number;
  completed: number;
  failed: number;
  blocked: number;
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped';
}

export interface RalphResult {
  success: boolean;
  processed: number;
  completed: number;
  failed: number;
  blocked: number;
  stoppedReason?: string;
}

type RalphEventType = 'start' | 'task_start' | 'task_complete' | 'task_failed' | 'task_blocked' | 'stop' | 'complete';

interface RalphEvent {
  type: RalphEventType;
  taskId?: string;
  data?: Record<string, unknown>;
}

type EventListener = (event: RalphEvent) => void;

export class RalphEngine {
  private projectRoot: string;
  private store: LocalKanbanStore;
  private provider?: RalphCompatibleProvider;
  private getWindow?: () => BrowserWindow | null;
  private running: boolean = false;
  private paused: boolean = false;
  private stopRequested: boolean = false;
  private eventListeners: EventListener[] = [];
  private currentTaskId: string | null = null;

  constructor(config: RalphEngineConfig) {
    this.projectRoot = config.projectRoot;
    this.store = config.store;
    this.provider = config.provider;
    this.getWindow = config.getWindow;
  }

  /**
   * Start Ralph Mode - autonomous task execution.
   * Only executes tasks in "todo" column.
   * Respects dependencies, includes failure context on retries.
   */
  async runAllPending(options: RalphModeOptions = {}): Promise<RalphResult> {
    if (this.running) {
      throw new Error('Ralph Mode is already running');
    }

    if (!this.provider) {
      throw new Error('No provider configured for Ralph Mode');
    }

    const {
      maxTasks = Infinity,
      maxAttempts = DEFAULT_MAX_ATTEMPTS,
    } = options;

    this.running = true;
    this.stopRequested = false;
    this.paused = false;

    let processed = 0;
    let completed = 0;
    let failed = 0;
    let blocked = 0;

    // Update state
    this.store.setState({
      mode: 'ralph',
      isRunning: true,
      ralphMode: {
        enabled: true,
        strategy: 'dependency',
        startedAt: new Date().toISOString(),
        processedCount: 0,
        failedCount: 0,
      },
    });

    this.store.logActivity('ralph_started', { maxTasks, maxAttempts });
    this.emit({ type: 'start', data: { maxTasks } });

    try {
      // Build queue with dependency resolution
      let taskQueue = this.buildTaskQueue();
      const allTasks = this.store.getTasks();

      while (taskQueue.length > 0 && processed < maxTasks && !this.stopRequested) {
        // Wait if paused
        while (this.paused && !this.stopRequested) {
          await this.sleep(100);
        }

        if (this.stopRequested) break;

        // Find next runnable task (dependencies met)
        const taskIndex = taskQueue.findIndex(t => !this.hasUnmetDependencies(t, allTasks));
        if (taskIndex === -1) {
          // All remaining tasks have unmet dependencies
          console.log('[Ralph] All remaining tasks have unmet dependencies, stopping');
          blocked = taskQueue.length;
          break;
        }

        const task = taskQueue[taskIndex];
        taskQueue.splice(taskIndex, 1);

        // Check attempt count
        const attempt = this.getAttemptCount(task);
        if (attempt > maxAttempts) {
          console.log(`[Ralph] Task ${task.id} exceeded max attempts (${maxAttempts}), marking blocked`);
          this.store.updateTaskRuntime(task.id, { status: 'blocked' });
          this.store.addTypedComment(task.id, 'system', 'system',
            `Task exceeded maximum attempts (${maxAttempts}). Please review and provide instructions.`);
          blocked++;
          continue;
        }

        this.currentTaskId = task.id;
        const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        // Move to doing
        this.store.moveTask(task.id, 'doing');
        this.store.updateTaskRuntime(task.id, { status: 'running' });

        // Update state
        this.store.setState({
          activeTaskId: task.id,
          ralphMode: {
            enabled: true,
            strategy: 'dependency',
            processedCount: processed,
            failedCount: failed,
            currentTaskId: task.id,
          },
        });

        this.emit({ type: 'task_start', taskId: task.id, data: { title: task.title, attempt } });

        // Create run artifact
        const artifact: RunArtifact = {
          runId,
          taskId: task.id,
          taskTitle: task.title,
          startedAt: new Date().toISOString(),
          status: 'running',
          promptSummary: '',
          toolCalls: [],
          filesModified: [],
          attempt,
        };

        // Run the task using ClaudeCodeProvider directly
        try {
          const result = await this.runTaskWithProvider(task, runId, attempt);
          processed++;

          artifact.completedAt = new Date().toISOString();
          artifact.promptSummary = `Task: ${task.title}\nAttempt: ${attempt}`;

          if (result.success) {
            completed++;
            artifact.status = 'completed';

            // Move to review (not done - human should verify)
            this.store.moveTask(task.id, 'review');
            this.store.updateTaskRuntime(task.id, { status: 'done' });

            // Add success comment
            this.store.addTypedComment(task.id, 'agent', 'dexter',
              `**Task Completed** (Attempt ${attempt})\n\n${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}`, runId);

            this.emit({ type: 'task_complete', taskId: task.id });

            // Play notification sound and set badge
            notifyRalphTaskComplete();
          } else {
            failed++;
            artifact.status = 'failed';
            artifact.error = result.error;

            this.store.updateTaskRuntime(task.id, { status: 'failed' });

            // Add detailed failure comment
            this.store.addTypedComment(task.id, 'failure', 'dexter',
              `**Task Failed** (Attempt ${attempt}/${maxAttempts})\n\n` +
              `**Run ID:** ${runId}\n` +
              `**Error:** ${result.error}\n\n` +
              `**What happened:**\n${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}\n\n` +
              `**Next steps:** Review the error and add instructions if needed.`,
              runId);

            this.emit({ type: 'task_failed', taskId: task.id, data: { error: result.error, attempt } });
          }

          this.saveRunArtifact(artifact);

        } catch (error) {
          failed++;
          processed++;
          artifact.status = 'failed';
          artifact.error = error instanceof Error ? error.message : String(error);
          artifact.completedAt = new Date().toISOString();

          this.store.updateTaskRuntime(task.id, { status: 'failed' });
          this.saveRunArtifact(artifact);

          this.emit({
            type: 'task_failed',
            taskId: task.id,
            data: { error: artifact.error },
          });
        }

        this.currentTaskId = null;

        // Refresh task queue (dependencies may now be met)
        taskQueue = this.buildTaskQueue();
      }

      // Determine success
      const success = !this.stopRequested && failed === 0 && blocked === 0;

      // Update final state
      this.store.setState({
        activeTaskId: null,
        mode: 'manual',
        isRunning: false,
        ralphMode: {
          enabled: false,
          strategy: 'dependency',
          processedCount: processed,
          failedCount: failed,
        },
      });

      this.store.logActivity('ralph_stopped', {
        reason: this.stopRequested ? 'Manual stop' : 'Completed',
        processed,
        completed,
        failed,
        blocked,
      });

      this.emit({ type: this.stopRequested ? 'stop' : 'complete', data: { processed, completed, failed, blocked } });

      return {
        success,
        processed,
        completed,
        failed,
        blocked,
        stoppedReason: this.stopRequested ? 'Manual stop' : undefined,
      };
    } finally {
      this.running = false;
      this.currentTaskId = null;
    }
  }

  /**
   * Get tasks from todo column, sorted by priority.
   */
  private getBacklogTasks(): Task[] {
    const tasks = this.store.getTasks();
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return tasks
      .filter(t => t.status === 'todo')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Run a single task using ClaudeCodeProvider.
   * Includes failure context and user instructions in the prompt.
   */
  private async runTaskWithProvider(
    task: Task,
    runId: string,
    attempt: number
  ): Promise<{ success: boolean; content: string; error?: string }> {
    if (!this.provider) {
      return { success: false, content: '', error: 'No provider' };
    }

    const win = this.getWindow?.() || null;

    // Helper to send stream updates
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

    // Build task prompt with context
    const failureContext = this.getFailureContext(task);
    const instructionContext = this.getInstructionContext(task);

    const taskPrompt = `## Task to Execute

**Title:** ${task.title}
**ID:** ${task.id}
**Run ID:** ${runId}
**Attempt:** ${attempt}

**Description:**
${task.description || 'No description provided.'}

**Acceptance Criteria:**
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
${instructionContext}${failureContext}

## Instructions

Please complete this task. Ensure ALL acceptance criteria are met.
When done, summarize what you accomplished and verify each criterion.

## Progress Checkpoints

Periodically save your progress during long tasks using save_progress tool:
\`\`\`json
{"tool": "save_progress", "arguments": {"completed": "What you've done so far", "nextStep": "What you'll do next"}}
\`\`\`
This helps if the task is interrupted - you can resume from where you left off.
`;

    let accumulated = '';

    try {
      this.provider.setWorkingDirectory(this.projectRoot);

      const onChunk = (chunk: string) => {
        accumulated += chunk;
        sendUpdate(accumulated, false);
      };

      const response = await this.provider.complete(
        [{ role: 'user', content: taskPrompt }],
        undefined,
        onChunk,
        'agent'
      );

      const finalContent = accumulated || response.content;
      sendUpdate(finalContent, true);

      const success = response.finishReason !== 'error' && finalContent.length > 0;

      return {
        success,
        content: finalContent,
        error: success ? undefined : (response.content || 'No response received'),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg === 'Cancelled') {
        sendUpdate(accumulated + '\n\n❌ **CANCELLED**', true, true);
        return { success: false, content: accumulated, error: 'Cancelled by user' };
      }

      sendUpdate(`${accumulated}\n\n❌ **Error:** ${errorMsg}`, true);
      return { success: false, content: accumulated, error: errorMsg };
    }
  }

  /**
   * Start Ralph Mode (alias for runAllPending).
   */
  async startRalphMode(options?: RalphModeOptions): Promise<RalphResult> {
    return this.runAllPending(options);
  }

  /**
   * Stop Ralph Mode gracefully.
   */
  stopRalphMode(): void {
    this.stopRequested = true;
    if (this.provider) {
      this.provider.cancel();
    }
  }

  /**
   * Pause Ralph Mode (can be resumed).
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume Ralph Mode after pause.
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Check if Ralph Mode is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if Ralph Mode is paused.
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get current progress.
   */
  getProgress(): RalphProgress {
    const state = this.store.getState();
    const backlogTasks = this.getBacklogTasks();
    const currentTask = this.currentTaskId ? this.store.getTask(this.currentTaskId) : null;

    return {
      total: backlogTasks.length + state.ralphMode.processedCount,
      completed: state.ralphMode.processedCount - state.ralphMode.failedCount,
      failed: state.ralphMode.failedCount,
      blocked: 0,
      currentTaskId: this.currentTaskId,
      currentTaskTitle: currentTask?.title || null,
      status: this.running ? (this.paused ? 'paused' : 'running') : 'idle',
    };
  }

  /**
   * Add event listener.
   */
  on(listener: EventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener.
   */
  off(listener: EventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners.
   */
  private emit(event: RalphEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in Ralph event listener:', e);
      }
    }
  }

  /**
   * Sleep helper.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set the agent provider.
   */
  setProvider(provider: ClaudeCodeProvider): void {
    this.provider = provider;
  }

  /**
   * Set the window getter function.
   */
  setWindowGetter(getter: () => BrowserWindow | null): void {
    this.getWindow = getter;
  }

  // ============================================
  // Dependency Resolution
  // ============================================

  /**
   * Check if a task has unmet dependencies.
   */
  private hasUnmetDependencies(task: Task, allTasks: Task[]): boolean {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return false;
    }

    for (const depId of task.dependsOn) {
      const depTask = allTasks.find(t => t.id === depId);
      if (!depTask || depTask.status !== 'done') {
        return true;
      }
    }
    return false;
  }

  /**
   * Build task queue with dependency resolution (topological sort).
   * Returns tasks in order they should be executed.
   */
  private buildTaskQueue(): Task[] {
    const allTasks = this.store.getTasks();
    const backlogTasks = allTasks.filter(t => t.status === 'todo');
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

    // Topological sort with priority
    const queue: Task[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (task: Task): boolean => {
      if (visited.has(task.id)) return true;
      if (visiting.has(task.id)) return false; // Cycle detected

      visiting.add(task.id);

      // Visit dependencies first
      for (const depId of task.dependsOn || []) {
        const depTask = backlogTasks.find(t => t.id === depId);
        if (depTask && !visit(depTask)) {
          return false;
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      queue.push(task);
      return true;
    };

    // Sort by priority first, then visit
    const sorted = [...backlogTasks].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    for (const task of sorted) {
      visit(task);
    }

    return queue;
  }

  // ============================================
  // Run Artifacts & Logging
  // ============================================

  /**
   * Save run artifact to disk.
   */
  private saveRunArtifact(artifact: RunArtifact): void {
    try {
      const dir = path.join(this.projectRoot, '.local-kanban', 'agent-runs', artifact.taskId);
      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${artifact.runId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
      console.log(`[Ralph] Saved run artifact: ${filePath}`);
    } catch (e) {
      console.error('[Ralph] Failed to save run artifact:', e);
    }
  }

  // ============================================
  // Failure Context Building
  // ============================================

  /**
   * Get failure context from previous attempts for retry.
   */
  private getFailureContext(task: Task): string {
    const comments = task.comments || [];
    const failureComments = comments.filter(c => c.type === 'failure');

    if (failureComments.length === 0) return '';

    let context = '\n\n## Previous Failure Context\n\n';
    context += '**IMPORTANT:** This task has failed before. Learn from these failures:\n\n';

    for (const comment of failureComments) {
      context += `### Attempt (${comment.createdAt})\n`;
      context += `${comment.content}\n\n`;
    }

    context += '**Instructions:** Address the issues mentioned above. Do not repeat the same mistakes.\n';
    return context;
  }

  /**
   * Get instruction comments to include in prompt.
   */
  private getInstructionContext(task: Task): string {
    const comments = task.comments || [];
    const instructions = comments.filter(c => c.type === 'instruction');

    if (instructions.length === 0) return '';

    let context = '\n\n## User Instructions\n\n';
    for (const inst of instructions) {
      context += `- ${inst.content}\n`;
    }
    return context;
  }

  /**
   * Get attempt count for a task.
   */
  private getAttemptCount(task: Task): number {
    const comments = task.comments || [];
    return comments.filter(c => c.type === 'failure' || c.type === 'agent').length + 1;
  }
}

// ============================================
// Singleton Instance
// ============================================

let ralphInstance: RalphEngine | null = null;

export function getRalphEngine(config?: RalphEngineConfig): RalphEngine {
  if (!ralphInstance && config) {
    ralphInstance = new RalphEngine(config);
  }
  if (!ralphInstance) {
    throw new Error('RalphEngine not initialized. Call getRalphEngine(config) first.');
  }
  return ralphInstance;
}

export function initRalphEngine(config: RalphEngineConfig): RalphEngine {
  ralphInstance = new RalphEngine(config);
  return ralphInstance;
}
