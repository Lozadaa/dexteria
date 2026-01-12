/**
 * AgentRunRecorder
 *
 * Records agent execution runs with tool calls, patches, commands, and results.
 * Stores compact summaries with redacted secrets.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LocalKanbanStore } from '../services/LocalKanbanStore';
import { PolicyGuard } from '../services/PolicyGuard';
import { createAgentRun, AgentRunSchema } from '../../shared/schemas';
import type {
  AgentRun,
  AgentRunToolCall,
  AgentRunPatch,
  AgentRunCommand,
  AcceptanceCriterionResult,
  Policy,
} from '../../shared/types';

export interface RecordToolCallInput {
  name: string;
  input: Record<string, unknown>;
  outputSummary: string;
  durationMs: number;
}

export interface RecordPatchInput {
  path: string;
  diffSummary: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface RecordCommandInput {
  command: string;
  exitCode: number;
  durationMs: number;
  outputPath: string;
}

export interface FinalizeInput {
  summary: string;
  success: boolean;
  acceptanceReport?: AcceptanceCriterionResult[];
  error?: string;
}

export class AgentRunRecorder {
  private store: LocalKanbanStore;
  private policyGuard: PolicyGuard;
  private currentRun: AgentRun | null = null;
  private projectRoot: string;

  constructor(projectRoot: string, store: LocalKanbanStore, policy: Policy) {
    this.projectRoot = projectRoot;
    this.store = store;
    this.policyGuard = new PolicyGuard(projectRoot, policy);
  }

  /**
   * Start recording a new agent run.
   */
  start(taskId: string, mode: 'manual' | 'dexter'): AgentRun {
    this.currentRun = createAgentRun(taskId, mode);

    // Ensure directory exists
    this.store.ensureRunDir(taskId);

    // Log activity
    this.store.logActivity('agent_started', {
      runId: this.currentRun.id,
      mode,
    }, { taskId, runId: this.currentRun.id });

    // Update task runtime
    this.store.updateTaskRuntime(taskId, {
      status: 'running',
      currentRunId: this.currentRun.id,
      lastRunAt: this.currentRun.startedAt,
      runCount: (this.store.getTask(taskId)?.runtime.runCount || 0) + 1,
    });

    // Save initial run state
    this.saveCurrentRun();

    return this.currentRun;
  }

  /**
   * Get the current run.
   */
  getCurrentRun(): AgentRun | null {
    return this.currentRun;
  }

  /**
   * Record a tool call.
   */
  recordToolCall(input: RecordToolCallInput): void {
    if (!this.currentRun) {
      throw new Error('No active run. Call start() first.');
    }

    // Redact any secrets in the input/output
    const redactedInput = this.redactObject(input.input);
    const redactedOutput = this.policyGuard.redactSecrets(input.outputSummary);

    const toolCall: AgentRunToolCall = {
      timestamp: new Date().toISOString(),
      name: input.name,
      input: redactedInput,
      outputSummary: this.truncate(redactedOutput, 500),
      durationMs: input.durationMs,
    };

    this.currentRun.toolCalls.push(toolCall);
    this.currentRun.steps++;

    this.saveCurrentRun();
  }

  /**
   * Record a file patch.
   */
  recordPatch(input: RecordPatchInput): void {
    if (!this.currentRun) {
      throw new Error('No active run. Call start() first.');
    }

    const patch: AgentRunPatch = {
      timestamp: new Date().toISOString(),
      path: input.path,
      diffSummary: this.truncate(input.diffSummary, 300),
      linesAdded: input.linesAdded,
      linesRemoved: input.linesRemoved,
    };

    this.currentRun.patches.push(patch);

    // Track modified files
    if (!this.currentRun.filesModified.includes(input.path)) {
      this.currentRun.filesModified.push(input.path);
    }

    this.saveCurrentRun();
  }

  /**
   * Record a command execution.
   */
  recordCommand(input: RecordCommandInput): void {
    if (!this.currentRun) {
      throw new Error('No active run. Call start() first.');
    }

    // Redact any secrets in the command
    const redactedCommand = this.policyGuard.redactSecrets(input.command);

    const command: AgentRunCommand = {
      timestamp: new Date().toISOString(),
      command: redactedCommand,
      exitCode: input.exitCode,
      durationMs: input.durationMs,
      outputPath: input.outputPath,
    };

    this.currentRun.commands.push(command);

    this.saveCurrentRun();
  }

  /**
   * Finalize the run with summary and results.
   */
  finalize(input: FinalizeInput): AgentRun {
    if (!this.currentRun) {
      throw new Error('No active run. Call start() first.');
    }

    this.currentRun.completedAt = new Date().toISOString();
    this.currentRun.summary = this.truncate(input.summary, 1000);

    if (input.success) {
      this.currentRun.status = 'completed';
    } else if (input.error?.toLowerCase().includes('blocked') || input.error?.toLowerCase().includes('need')) {
      this.currentRun.status = 'blocked';
    } else {
      this.currentRun.status = 'failed';
    }

    if (input.acceptanceReport) {
      this.currentRun.acceptanceResults = input.acceptanceReport;
    }

    if (input.error) {
      this.currentRun.error = this.truncate(this.policyGuard.redactSecrets(input.error), 500);
    }

    // Save final state
    this.saveCurrentRun();

    // Update task runtime
    const taskRuntime = {
      status: input.success ? 'done' as const : this.currentRun.status === 'blocked' ? 'blocked' as const : 'failed' as const,
      currentRunId: undefined,
      lastRunId: this.currentRun.id,
      lastRunAt: this.currentRun.completedAt,
      failureCount: input.success
        ? (this.store.getTask(this.currentRun.taskId)?.runtime.failureCount || 0)
        : (this.store.getTask(this.currentRun.taskId)?.runtime.failureCount || 0) + 1,
    };

    this.store.updateTaskRuntime(this.currentRun.taskId, taskRuntime);

    // Log activity
    const activityType = input.success ? 'agent_completed' : 'agent_failed';
    this.store.logActivity(activityType, {
      runId: this.currentRun.id,
      status: this.currentRun.status,
      steps: this.currentRun.steps,
      filesModified: this.currentRun.filesModified.length,
    }, { taskId: this.currentRun.taskId, runId: this.currentRun.id });

    const completedRun = this.currentRun;
    this.currentRun = null;

    return completedRun;
  }

  /**
   * Cancel the current run.
   */
  cancel(reason: string): AgentRun | null {
    if (!this.currentRun) {
      return null;
    }

    this.currentRun.completedAt = new Date().toISOString();
    this.currentRun.status = 'cancelled';
    this.currentRun.error = reason;

    this.saveCurrentRun();

    // Update task runtime
    this.store.updateTaskRuntime(this.currentRun.taskId, {
      status: 'idle',
      currentRunId: undefined,
      lastRunId: this.currentRun.id,
    });

    const cancelledRun = this.currentRun;
    this.currentRun = null;

    return cancelledRun;
  }

  /**
   * Save the current run to disk.
   */
  private saveCurrentRun(): void {
    if (!this.currentRun) return;

    const runPath = this.store.getAgentRunPath(this.currentRun.taskId, this.currentRun.id);
    const dir = path.dirname(runPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Validate before saving
    const validation = AgentRunSchema.safeParse(this.currentRun);
    if (!validation.success) {
      console.error('Invalid run data:', validation.error);
      return;
    }

    fs.writeFileSync(runPath, JSON.stringify(this.currentRun, null, 2));
  }

  /**
   * Load a run from disk.
   */
  loadRun(taskId: string, runId: string): AgentRun | null {
    const runPath = this.store.getAgentRunPath(taskId, runId);

    if (!fs.existsSync(runPath)) {
      return null;
    }

    const content = fs.readFileSync(runPath, 'utf-8');
    const data = JSON.parse(content);

    const validation = AgentRunSchema.safeParse(data);
    if (!validation.success) {
      console.warn(`Invalid run data for ${runId}:`, validation.error);
      return null;
    }

    return validation.data;
  }

  /**
   * List all runs for a task.
   */
  listRuns(taskId: string): AgentRun[] {
    const runDir = path.join(this.projectRoot, '.local-kanban', 'agent-runs', taskId);

    if (!fs.existsSync(runDir)) {
      return [];
    }

    const files = fs.readdirSync(runDir).filter(f => f.endsWith('.json'));
    const runs: AgentRun[] = [];

    for (const file of files) {
      const runId = file.replace('.json', '');
      const run = this.loadRun(taskId, runId);
      if (run) {
        runs.push(run);
      }
    }

    // Sort by start time descending
    runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return runs;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Truncate a string to max length.
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Redact secrets from an object (recursively).
   */
  private redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Redact known sensitive keys
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('key') ||
        lowerKey.includes('credential') ||
        lowerKey.includes('auth')
      ) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        result[key] = this.policyGuard.redactSecrets(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.redactObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
