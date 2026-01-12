/**
 * RalphEngine
 *
 * Ralph Mode = Autonomous task execution mode.
 * "Attempt to autonomously finish all pending tasks."
 *
 * Named after "Ralph" - the reliable worker who just gets things done.
 *
 * ## How Ralph Mode Works:
 *
 * 1. Determines pending tasks (not in 'done' column)
 * 2. Orders tasks by:
 *    - Dependencies (tasks with unmet dependencies run after their deps)
 *    - Column preference (doing > todo > review > backlog)
 *    - Priority (critical > high > medium > low)
 *    - Order field (for stable sorting within column)
 * 3. For each task:
 *    - Sets state.activeTaskId
 *    - Runs AgentRuntime.runTask(taskId, mode="dexter")
 *    - On success: marks task done, moves to next
 *    - On failure/blocked: marks appropriately, continues to next (unless stopOnBlocking)
 * 4. Continues until:
 *    - All tasks completed
 *    - Manually stopped
 *    - maxTasks limit reached
 *    - Critical blocking (if stopOnBlocking enabled)
 *
 * ## Example Scenario:
 *
 * Backlog:
 * - TSK-0001: "Setup project" (no deps) -> acceptance: package.json exists
 * - TSK-0002: "Add tests" (depends on TSK-0001) -> acceptance: tests pass
 * - TSK-0003: "Add linting" (depends on TSK-0001) -> acceptance: lint passes
 *
 * Ralph Mode Execution:
 * 1. Orders: TSK-0001 first (no deps), then TSK-0002/0003 (both depend on 0001)
 * 2. Runs TSK-0001 -> success -> moves to done
 * 3. Runs TSK-0002 -> tests fail -> marked failed, adds failure comment
 * 4. Runs TSK-0003 -> success -> moves to done
 * 5. TSK-0002 remains in failed state for human review
 *
 * If TSK-0002 needed human decision (blocked), it would add an instruction
 * question comment and Ralph continues to TSK-0003.
 */

import { LocalKanbanStore } from '../services/LocalKanbanStore';
import { AgentRuntime, RunResult } from './AgentRuntime';
import { AgentProvider } from './AgentProvider';
import { hasUnmetDependencies } from '../../shared/schemas';
import type { Task, RalphModeOptions } from '../../shared/types';

export interface RalphEngineConfig {
  projectRoot: string;
  store: LocalKanbanStore;
  provider?: AgentProvider;
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
  results: RunResult[];
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
  private provider?: AgentProvider;
  private runtime: AgentRuntime | null = null;
  private running: boolean = false;
  private paused: boolean = false;
  private stopRequested: boolean = false;
  private eventListeners: EventListener[] = [];

  constructor(config: RalphEngineConfig) {
    this.projectRoot = config.projectRoot;
    this.store = config.store;
    this.provider = config.provider;
  }

  /**
   * Start Ralph Mode - autonomous task execution.
   */
  async runAllPending(options: RalphModeOptions = {}): Promise<RalphResult> {
    if (this.running) {
      throw new Error('Ralph Mode is already running');
    }

    const {
      stopOnBlocking = false,
      maxTasks = Infinity,
      strategy = 'dependency',
    } = options;

    this.running = true;
    this.stopRequested = false;
    this.paused = false;

    const results: RunResult[] = [];
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
        strategy,
        startedAt: new Date().toISOString(),
        processedCount: 0,
        failedCount: 0,
      },
    });

    // Log activity
    this.store.logActivity('ralph_started', { strategy, maxTasks, stopOnBlocking });

    this.emit({ type: 'start', data: { strategy, maxTasks } });

    try {
      // Get ordered pending tasks
      let pendingTasks = this.store.getPendingTasks(strategy);
      const allTasks = this.store.getTasks();

      while (pendingTasks.length > 0 && processed < maxTasks && !this.stopRequested) {
        // Wait if paused
        while (this.paused && !this.stopRequested) {
          await this.sleep(100);
        }

        if (this.stopRequested) break;

        // Get next task
        const task = this.getNextRunnableTask(pendingTasks, allTasks);
        if (!task) {
          // All remaining tasks have unmet dependencies or are blocked
          break;
        }

        // Update state
        this.store.setState({
          activeTaskId: task.id,
          ralphMode: {
            enabled: true,
            strategy,
            processedCount: processed,
            failedCount: failed,
            currentTaskId: task.id,
          },
        });

        this.emit({ type: 'task_start', taskId: task.id, data: { title: task.title } });

        // Create runtime for this task
        this.runtime = new AgentRuntime({
          projectRoot: this.projectRoot,
          store: this.store,
          provider: this.provider,
        });

        // Run the task
        try {
          const result = await this.runtime.runTask(task.id, { mode: 'dexter' });
          results.push(result);
          processed++;

          if (result.success) {
            completed++;
            this.emit({ type: 'task_complete', taskId: task.id });
          } else if (result.run.status === 'blocked') {
            blocked++;
            this.emit({ type: 'task_blocked', taskId: task.id, data: { reason: result.error } });

            if (stopOnBlocking) {
              this.store.logActivity('ralph_stopped', {
                reason: 'Task blocked',
                taskId: task.id,
              });
              break;
            }
          } else {
            failed++;
            this.emit({ type: 'task_failed', taskId: task.id, data: { error: result.error } });
          }
        } catch (error) {
          failed++;
          processed++;
          this.emit({
            type: 'task_failed',
            taskId: task.id,
            data: { error: error instanceof Error ? error.message : String(error) },
          });
        }

        this.runtime = null;

        // Refresh pending tasks (some may now be unblocked)
        pendingTasks = this.store.getPendingTasks(strategy);

        // Remove completed/failed tasks from pending
        pendingTasks = pendingTasks.filter(t => {
          const current = this.store.getTask(t.id);
          return current && current.status !== 'done' && current.runtime.status !== 'done';
        });
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
          strategy,
          processedCount: processed,
          failedCount: failed,
        },
      });

      // Log activity
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
        results,
        stoppedReason: this.stopRequested ? 'Manual stop' : undefined,
      };
    } finally {
      this.running = false;
      this.runtime = null;
    }
  }

  /**
   * Get the next task that can be run (dependencies met).
   */
  private getNextRunnableTask(pendingTasks: Task[], allTasks: Task[]): Task | null {
    for (const task of pendingTasks) {
      // Skip blocked tasks
      if (task.runtime.status === 'blocked') continue;

      // Check dependencies
      if (!hasUnmetDependencies(task, allTasks)) {
        return task;
      }
    }
    return null;
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
    if (this.runtime) {
      this.runtime.cancel();
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
    const pendingTasks = this.store.getPendingTasks();
    const currentTask = state.activeTaskId ? this.store.getTask(state.activeTaskId) : null;

    return {
      total: pendingTasks.length + state.ralphMode.processedCount,
      completed: state.ralphMode.processedCount - state.ralphMode.failedCount,
      failed: state.ralphMode.failedCount,
      blocked: pendingTasks.filter(t => t.runtime.status === 'blocked').length,
      currentTaskId: state.activeTaskId,
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
  setProvider(provider: AgentProvider): void {
    this.provider = provider;
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
