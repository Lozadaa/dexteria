/**
 * AgentRuntime
 *
 * Executes a single task using the agent provider.
 * Manages the tool call loop, acceptance verification, and state updates.
 */

import { LocalKanbanStore } from '../services/LocalKanbanStore';
import { PolicyGuard } from '../services/PolicyGuard';
import { CommentService, getCommentService } from '../services/CommentService';
import { getPluginManager } from '../services/PluginManager';
import { RepoTools } from './tools/RepoTools';
import { Runner } from './tools/Runner';
import { AgentRunRecorder } from './AgentRunRecorder';
import {
  AgentProvider,
  MockAgentProvider,
  AGENT_TOOLS,
  buildSystemPrompt,
  buildTaskPrompt,
} from './AgentProvider';
// createComment is available via store.addTypedComment
import type {
  Task,
  AgentMessage,
  AgentToolCall,
  AgentRun,
  AcceptanceCriterionResult,
  RunTaskOptions,
  Policy,
} from '../../shared/types';

export interface RuntimeConfig {
  projectRoot: string;
  store: LocalKanbanStore;
  provider?: AgentProvider;
  maxSteps?: number;
  onStreamChunk?: (chunk: string) => void;
}

export interface RunResult {
  success: boolean;
  run: AgentRun;
  task: Task;
  error?: string;
}

interface ToolExecutionResult {
  output: string;
  shouldStop: boolean;
  stopReason?: 'complete' | 'blocked' | 'failed';
  stopData?: {
    summary?: string;
    acceptanceResults?: AcceptanceCriterionResult[];
    reason?: string;
    question?: string;
    nextSteps?: string;
  };
}

export class AgentRuntime {
  private projectRoot: string;
  private store: LocalKanbanStore;
  private commentService: CommentService;
  private provider: AgentProvider;
  private policy: Policy;
  private repoTools: RepoTools;
  private runner: Runner;
  private recorder: AgentRunRecorder;
  private maxSteps: number;
  private cancelled: boolean = false;
  private onStreamChunk?: (chunk: string) => void;

  constructor(config: RuntimeConfig) {
    this.projectRoot = config.projectRoot;
    this.store = config.store;
    this.commentService = getCommentService(config.store);
    this.policy = config.store.getPolicy();
    this.provider = config.provider || new MockAgentProvider();
    this.maxSteps = config.maxSteps || this.policy.limits.maxStepsPerRun;
    this.onStreamChunk = config.onStreamChunk;

    this.repoTools = new RepoTools(this.projectRoot, this.policy);
    this.runner = new Runner(this.projectRoot, this.policy, this.store);
    this.recorder = new AgentRunRecorder(this.projectRoot, this.store, this.policy);
  }

  /**
   * Run a task with the agent.
   */
  async runTask(taskId: string, options: RunTaskOptions = { mode: 'manual' }): Promise<RunResult> {
    this.cancelled = false;

    // Load task
    let task = this.store.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // CRITICAL: Refuse to execute Human-Only tasks BEFORE calling AI (saves tokens)
    if (task.humanOnly) {
      throw new Error(
        `Task "${task.title}" is marked as Human-Only. ` +
        `AI agents cannot execute Human-Only tasks. ` +
        `Please uncheck the Human-Only option if you want the AI to work on this task.`
      );
    }

    // Validate task has acceptance criteria
    if (task.acceptanceCriteria.length === 0) {
      throw new Error('Task MUST have at least one acceptance criterion');
    }

    // Start recording
    const run = this.recorder.start(taskId, options.mode);

    // Execute beforeRun hooks
    const pluginManager = getPluginManager();
    if (pluginManager) {
      const hookResult = await pluginManager.executeAgentBeforeRunHooks({
        taskId,
        task,
        runId: run.id,
        mode: 'agent',
      });

      if (hookResult.cancel) {
        return this.handleCancelled(task, run);
      }

      // Apply any task modifications from plugins
      if (hookResult.modifiedTask) {
        this.store.updateTask(taskId, hookResult.modifiedTask);
        task = this.store.getTask(taskId)!;
      }
    }

    try {
      // Load context
      const projectContext = this.store.getProjectContext();
      const repoIndex = this.store.getRepoIndex();

      // Build comment context for retries
      const commentContext = this.commentService.buildRetryContext(taskId);
      const failureCount = this.commentService.getFailureCount(taskId);

      // Build the task prompt with retry context if this is a retry
      let taskPrompt = buildTaskPrompt(task);
      if (failureCount > 0 && commentContext.formattedContext) {
        taskPrompt += `\n## Retry Context (Attempt ${failureCount + 1})\n\n`;
        taskPrompt += `This task has failed ${failureCount} time(s) previously. Review the context below and adjust your approach.\n\n`;
        taskPrompt += commentContext.formattedContext;
        taskPrompt += `\n**IMPORTANT:** Learn from previous failures. Try a different approach if the same method keeps failing.\n`;
      }

      // Build initial messages
      const messages: AgentMessage[] = [
        {
          role: 'system',
          content: buildSystemPrompt(projectContext, repoIndex),
        },
        {
          role: 'user',
          content: taskPrompt,
        },
      ];

      // Main execution loop
      let stepCount = 0;
      const effectiveMaxSteps = options.maxSteps || this.maxSteps;

      while (stepCount < effectiveMaxSteps && !this.cancelled) {
        stepCount++;

        // Check runtime limits
        const runtimeCheck = new PolicyGuard(this.projectRoot, this.policy).enforceRuntimeLimits({
          startTime: new Date(run.startedAt).getTime(),
          stepsExecuted: stepCount,
          filesModified: this.repoTools.getTouchedFiles(),
        });

        if (!runtimeCheck.allowed) {
          const result = this.handleFailure(task, run, runtimeCheck.reason || 'Runtime limit exceeded');
          await this.executeAfterRunHook(result);
          return result;
        }

        // Get agent response (with streaming callback if available)
        const response = await this.provider.complete(messages, AGENT_TOOLS, this.onStreamChunk);

        // Ensure content is never null
        const responseContent = response.content || '';

        // Add assistant message
        messages.push({
          role: 'assistant',
          content: responseContent,
        });

        // Execute onStep hook
        if (pluginManager) {
          await pluginManager.executeAgentStepHooks({
            taskId,
            runId: run.id,
            stepNumber: stepCount,
            content: responseContent,
            isComplete: response.finishReason === 'stop' && !response.toolCalls?.length,
          });
        }

        // Handle finish reasons
        if (response.finishReason === 'stop') {
          // Agent finished without tool calls - check if stuck
          if (!responseContent.toLowerCase().includes('complete')) {
            const result = this.handleFailure(task, run, 'Agent stopped without completing the task');
            await this.executeAfterRunHook(result);
            return result;
          }
        }

        if (response.finishReason === 'error') {
          const result = this.handleFailure(task, run, 'Agent provider error');
          await this.executeAfterRunHook(result);
          return result;
        }

        if (response.finishReason === 'length') {
          const result = this.handleFailure(task, run, 'Agent response exceeded max length');
          await this.executeAfterRunHook(result);
          return result;
        }

        // Process tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
          for (const toolCall of response.toolCalls) {
            if (this.cancelled) {
              const result = this.handleCancelled(task, run);
              await this.executeAfterRunHook(result);
              return result;
            }

            // Execute onToolCall hook
            let toolInput = toolCall.arguments;
            if (pluginManager) {
              const hookResult = await pluginManager.executeAgentToolCallHooks({
                taskId,
                runId: run.id,
                toolName: toolCall.name,
                toolInput: toolCall.arguments,
                stepNumber: stepCount,
              });

              if (hookResult.cancel) {
                continue; // Skip this tool call
              }

              if (hookResult.modifiedInput) {
                toolInput = hookResult.modifiedInput;
              }
            }

            const modifiedToolCall = { ...toolCall, arguments: toolInput };
            const toolStartTime = Date.now();
            const result = await this.executeTool(modifiedToolCall, taskId, run.id);
            const toolDuration = Date.now() - toolStartTime;

            // Record tool call
            this.recorder.recordToolCall({
              name: toolCall.name,
              input: toolCall.arguments,
              outputSummary: result.output.substring(0, 500),
              durationMs: toolDuration,
            });

            // Add tool result to messages
            messages.push({
              role: 'user',
              content: `Tool result for ${toolCall.name}:\n${result.output}`,
            });

            // Check if tool indicates stop
            if (result.shouldStop) {
              const stopResult = this.handleToolStop(task, run, result);
              await this.executeAfterRunHook(stopResult);
              return stopResult;
            }
          }
        }
      }

      // Max steps reached
      const result = this.handleFailure(task, run, `Maximum steps (${effectiveMaxSteps}) reached without completion`);
      await this.executeAfterRunHook(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result = this.handleFailure(task, run, errorMessage);
      await this.executeAfterRunHook(result);
      return result;
    }
  }

  /**
   * Execute afterRun hook with run result
   */
  private async executeAfterRunHook(result: RunResult): Promise<void> {
    const pluginManager = getPluginManager();
    if (pluginManager) {
      await pluginManager.executeAgentAfterRunHooks({
        taskId: result.task.id,
        task: result.task,
        runId: result.run.id,
        success: result.success,
        error: result.error,
        filesModified: result.run.filesModified,
        summary: result.run.summary,
      });
    }
  }

  /**
   * Execute a single tool call.
   */
  private async executeTool(
    toolCall: AgentToolCall,
    taskId: string,
    runId: string
  ): Promise<ToolExecutionResult> {
    const args = toolCall.arguments;

    switch (toolCall.name) {
      case 'list_files': {
        const result = this.repoTools.listFiles({
          glob: String(args.glob),
          maxResults: Number(args.maxResults) || 100,
        });
        return {
          output: result.success
            ? `Found ${result.data?.length || 0} files:\n${result.data?.join('\n') || 'none'}`
            : `Error: ${result.error}`,
          shouldStop: false,
        };
      }

      case 'read_file': {
        const result = this.repoTools.readFile({
          path: String(args.path),
        });
        return {
          output: result.success
            ? `File contents:\n${result.data}`
            : `Error: ${result.error}`,
          shouldStop: false,
        };
      }

      case 'search': {
        const result = this.repoTools.search({
          query: String(args.query),
          glob: args.glob ? String(args.glob) : undefined,
          maxResults: Number(args.maxResults) || 50,
        });
        return {
          output: result.success
            ? `Found ${result.data?.length || 0} matches:\n${result.data?.map(r => `${r.path}:${r.line}: ${r.content}`).join('\n') || 'none'}`
            : `Error: ${result.error}`,
          shouldStop: false,
        };
      }

      case 'write_file': {
        const result = this.repoTools.writeFile({
          path: String(args.path),
          content: String(args.content),
        });

        if (result.success) {
          this.recorder.recordPatch({
            path: String(args.path),
            diffSummary: 'File written',
            linesAdded: String(args.content).split('\n').length,
            linesRemoved: 0,
          });
        }

        return {
          output: result.success
            ? `Successfully wrote file: ${args.path}`
            : `Error: ${result.error}`,
          shouldStop: false,
        };
      }

      case 'apply_patch': {
        const result = this.repoTools.applyPatch({
          path: String(args.path),
          unifiedDiff: String(args.unifiedDiff),
        });

        if (result.success && result.data) {
          this.recorder.recordPatch({
            path: String(args.path),
            diffSummary: 'Patch applied',
            linesAdded: result.data.linesAdded,
            linesRemoved: result.data.linesRemoved,
          });
        }

        return {
          output: result.success
            ? `Patch applied: +${result.data?.linesAdded} -${result.data?.linesRemoved}`
            : `Error: ${result.error}`,
          shouldStop: false,
        };
      }

      case 'run_command': {
        const result = await this.runner.run({
          cmd: String(args.cmd),
          cwd: args.cwd ? String(args.cwd) : undefined,
          timeoutSec: Number(args.timeoutSec) || 120,
          taskId,
          runId,
        });

        this.recorder.recordCommand({
          command: String(args.cmd),
          exitCode: result.exitCode || -1,
          durationMs: result.durationMs,
          outputPath: result.logPath,
        });

        // Get last few lines of output for context
        const logTail = this.runner.tailRunLog(taskId, runId, 30) || '';

        return {
          output: result.success
            ? `Command succeeded (exit code ${result.exitCode}):\n${logTail}`
            : `Command failed (exit code ${result.exitCode}, timedOut: ${result.timedOut}):\n${logTail}`,
          shouldStop: false,
        };
      }

      case 'task_complete': {
        const acceptanceResults = (args.acceptanceResults as AcceptanceCriterionResult[]) || [];
        const allPassed = acceptanceResults.every(r => r.passed);

        return {
          output: allPassed
            ? 'Task completion accepted'
            : 'Task completion rejected: not all criteria passed',
          shouldStop: true,
          stopReason: allPassed ? 'complete' : 'failed',
          stopData: {
            summary: String(args.summary),
            acceptanceResults,
          },
        };
      }

      case 'task_blocked': {
        return {
          output: 'Task marked as blocked',
          shouldStop: true,
          stopReason: 'blocked',
          stopData: {
            reason: String(args.reason),
            question: String(args.question),
          },
        };
      }

      case 'task_failed': {
        return {
          output: 'Task marked as failed',
          shouldStop: true,
          stopReason: 'failed',
          stopData: {
            reason: String(args.reason),
            nextSteps: args.nextSteps ? String(args.nextSteps) : undefined,
          },
        };
      }

      case 'configure_project': {
        try {
          // Get current project settings
          const settings = this.store.getSettings();

          // Build update object
          const updates: Record<string, unknown> = {};

          if (args.runCommand) {
            updates['projectCommands.run.cmd'] = String(args.runCommand);
          }
          if (args.buildCommand) {
            updates['projectCommands.build.cmd'] = String(args.buildCommand);
          }
          if (args.installCommand) {
            updates['projectCommands.install.cmd'] = String(args.installCommand);
          }

          // Apply updates to settings
          let updatedSettings = { ...settings };
          if (args.runCommand) {
            updatedSettings = {
              ...updatedSettings,
              projectCommands: {
                ...updatedSettings.projectCommands,
                run: {
                  ...updatedSettings.projectCommands.run,
                  cmd: String(args.runCommand),
                },
              },
            };
          }
          if (args.buildCommand) {
            updatedSettings = {
              ...updatedSettings,
              projectCommands: {
                ...updatedSettings.projectCommands,
                build: {
                  ...updatedSettings.projectCommands.build,
                  cmd: String(args.buildCommand),
                },
              },
            };
          }
          if (args.installCommand) {
            updatedSettings = {
              ...updatedSettings,
              projectCommands: {
                ...updatedSettings.projectCommands,
                install: {
                  ...updatedSettings.projectCommands.install,
                  cmd: String(args.installCommand),
                },
              },
            };
          }

          // Save the updated settings
          this.store.saveSettings(updatedSettings);

          const configured = [];
          if (args.runCommand) configured.push(`Run: ${args.runCommand}`);
          if (args.buildCommand) configured.push(`Build: ${args.buildCommand}`);
          if (args.installCommand) configured.push(`Install: ${args.installCommand}`);
          if (args.packageManager) configured.push(`Package Manager: ${args.packageManager}`);

          return {
            output: `Project commands configured successfully:\n${configured.join('\n')}`,
            shouldStop: false,
          };
        } catch (error) {
          return {
            output: `Failed to configure project: ${error instanceof Error ? error.message : String(error)}`,
            shouldStop: false,
          };
        }
      }

      default:
        return {
          output: `Unknown tool: ${toolCall.name}`,
          shouldStop: false,
        };
    }
  }

  /**
   * Handle tool-initiated stop (complete/blocked/failed).
   */
  private handleToolStop(task: Task, run: AgentRun, result: ToolExecutionResult): RunResult {
    const { stopReason, stopData } = result;

    switch (stopReason) {
      case 'complete': {
        // Verify all acceptance criteria passed
        const acceptanceResults = stopData?.acceptanceResults || [];
        const allPassed = acceptanceResults.every(r => r.passed);

        if (!allPassed) {
          return this.handleFailure(task, run, 'Not all acceptance criteria passed');
        }

        // Finalize successful run
        const finalRun = this.recorder.finalize({
          summary: stopData?.summary || 'Task completed',
          success: true,
          acceptanceReport: acceptanceResults,
        });

        // Add agent comment
        this.store.addTypedComment(
          task.id,
          'agent',
          'dexter',
          `Task completed successfully.\n\n**Summary:** ${stopData?.summary}\n\n**Acceptance Results:**\n${acceptanceResults.map(r => `- [${r.passed ? '✓' : '✗'}] ${r.criterion}: ${r.evidence}`).join('\n')}`,
          finalRun.id
        );

        // Move task to done
        task.runtime.status = 'done';
        this.store.updateTaskRuntime(task.id, { status: 'done' });
        this.store.moveTask(task.id, 'done');

        // Refresh task
        const updatedTask = this.store.getTask(task.id)!;

        return {
          success: true,
          run: finalRun,
          task: updatedTask,
        };
      }

      case 'blocked': {
        const finalRun = this.recorder.finalize({
          summary: `Blocked: ${stopData?.reason}`,
          success: false,
          error: stopData?.reason,
        });

        // Add instruction request comment
        this.store.addTypedComment(
          task.id,
          'failure',
          'dexter',
          `**Task Blocked**\n\n**Reason:** ${stopData?.reason}\n\n**Question:** ${stopData?.question}\n\n*Please add an instruction comment to help me proceed.*`,
          finalRun.id
        );

        const updatedTask = this.store.getTask(task.id)!;

        return {
          success: false,
          run: finalRun,
          task: updatedTask,
          error: stopData?.reason,
        };
      }

      case 'failed':
      default:
        return this.handleFailure(task, run, stopData?.reason || 'Task failed', stopData?.nextSteps);
    }
  }

  /**
   * Handle task failure.
   */
  private handleFailure(task: Task, _run: AgentRun, reason: string, nextSteps?: string): RunResult {
    const finalRun = this.recorder.finalize({
      summary: `Failed: ${reason}`,
      success: false,
      error: reason,
    });

    // Add failure comment (MUST include runId and logPath)
    const logPath = `.local-kanban/agent-runs/${task.id}/${finalRun.id}.json`;
    let comment = `**Task Failed**\n\n**Run ID:** ${finalRun.id}\n**Log Path:** ${logPath}\n\n**Reason:** ${reason}`;

    if (nextSteps) {
      comment += `\n\n**Suggested Next Steps:** ${nextSteps}`;
    }

    this.store.addTypedComment(task.id, 'failure', 'dexter', comment, finalRun.id);

    const updatedTask = this.store.getTask(task.id)!;

    return {
      success: false,
      run: finalRun,
      task: updatedTask,
      error: reason,
    };
  }

  /**
   * Handle task cancellation.
   */
  private handleCancelled(task: Task, run: AgentRun): RunResult {
    const finalRun = this.recorder.cancel('Task execution cancelled by user');

    if (finalRun) {
      this.store.addTypedComment(
        task.id,
        'system',
        'system',
        'Task execution was cancelled by user.',
        finalRun.id
      );
    }

    const updatedTask = this.store.getTask(task.id)!;

    return {
      success: false,
      run: finalRun || run,
      task: updatedTask,
      error: 'Cancelled',
    };
  }

  /**
   * Cancel the current execution.
   */
  cancel(): void {
    this.cancelled = true;
    this.runner.cancelAll();
  }

  /**
   * Check if currently running.
   */
  isRunning(): boolean {
    return this.recorder.getCurrentRun() !== null;
  }

  /**
   * Get the current run if any.
   */
  getCurrentRun(): AgentRun | null {
    return this.recorder.getCurrentRun();
  }

  /**
   * Set a new agent provider.
   */
  setProvider(provider: AgentProvider): void {
    this.provider = provider;
  }
}
