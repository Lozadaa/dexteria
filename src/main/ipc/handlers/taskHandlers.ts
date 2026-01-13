/**
 * Task Handlers
 *
 * IPC handlers for task management operations.
 */

import { ipcMain } from 'electron';
import { hasProject, getStore, getOrCreateProvider } from './shared';
import { getCommentService } from '../../services/CommentService';
import type {
  Task,
  TaskComment,
  TaskStatus,
  TaskPatch,
} from '../../../shared/types';

/**
 * Register all task-related IPC handlers.
 */
export function registerTaskHandlers(): void {
  ipcMain.handle('tasks:getAll', async (): Promise<Task[]> => {
    if (!hasProject()) return [];
    return getStore().getTasks();
  });

  ipcMain.handle('tasks:get', async (_, taskId: string): Promise<Task | null> => {
    if (!hasProject()) return null;
    return getStore().getTask(taskId);
  });

  ipcMain.handle('tasks:create', async (_, title: string, status?: TaskStatus): Promise<Task | null> => {
    if (!hasProject()) return null;
    return getStore().createTask(title, status || 'backlog');
  });

  ipcMain.handle('tasks:update', async (_, taskId: string, patch: TaskPatch): Promise<Task | null> => {
    if (!hasProject()) return null;
    return getStore().updateTask(taskId, patch);
  });

  ipcMain.handle('tasks:delete', async (_, taskId: string): Promise<void> => {
    if (!hasProject()) return;
    getStore().deleteTask(taskId);
  });

  ipcMain.handle('tasks:move', async (_, taskId: string, toColumnId: TaskStatus, newOrder?: number): Promise<void> => {
    if (!hasProject()) return;
    getStore().moveTask(taskId, toColumnId, newOrder);
  });

  ipcMain.handle('tasks:addComment', async (_, taskId: string, comment: TaskComment): Promise<void> => {
    if (!hasProject()) return;
    getStore().addComment(taskId, comment);
  });

  ipcMain.handle('tasks:addTypedComment', async (
    _,
    taskId: string,
    type: TaskComment['type'],
    author: string,
    content: string,
    runId?: string
  ): Promise<TaskComment | null> => {
    if (!hasProject()) return null;
    return getStore().addTypedComment(taskId, type, author, content, runId);
  });

  ipcMain.handle('tasks:getPending', async (_, strategy?: 'fifo' | 'priority' | 'dependency'): Promise<Task[]> => {
    if (!hasProject()) return [];
    return getStore().getPendingTasks(strategy);
  });

  // Analyze task state against current codebase
  ipcMain.handle('tasks:analyzeState', async (_, taskId: string): Promise<{
    success: boolean;
    summary: string;
    criteria: { criterion: string; passed: boolean; evidence: string }[];
    suggestedStatus: string;
    error?: string;
  }> => {
    if (!hasProject()) {
      return {
        success: false,
        summary: '',
        criteria: [],
        suggestedStatus: '',
        error: 'No project open',
      };
    }
    try {
      const s = getStore();
      const task = s.getTask(taskId);

      if (!task) {
        return {
          success: false,
          summary: '',
          criteria: [],
          suggestedStatus: '',
          error: `Task not found: ${taskId}`,
        };
      }

      const provider = getOrCreateProvider();

      // Build analysis prompt
      const acceptanceCriteria = task.acceptanceCriteria || [];
      const definitionOfDone = task.agent?.definitionOfDone || [];
      const allCriteria = [...acceptanceCriteria, ...definitionOfDone];

      if (allCriteria.length === 0) {
        return {
          success: true,
          summary: 'No acceptance criteria defined for this task.',
          criteria: [],
          suggestedStatus: task.status,
        };
      }

      const analysisPrompt = `You are analyzing a software task to determine if it's in the correct state.

Task: ${task.title}
Description: ${task.description || 'No description'}
Current Status: ${task.status}
Goal: ${task.agent?.goal || 'Not specified'}
Scope: ${task.agent?.scope?.join(', ') || 'Not specified'}

Acceptance Criteria to verify:
${allCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Based on your knowledge of typical software projects and the task description, analyze whether each acceptance criterion is likely met. Consider:
- If the task is in "backlog" or "todo", criteria are likely NOT met yet
- If the task is in "doing", some criteria may be partially met
- If the task is in "review" or "done", criteria should be met

Respond in this exact JSON format:
{
  "summary": "Brief overall assessment of task state",
  "criteria": [
    {"criterion": "criterion text", "passed": true/false, "evidence": "reasoning"}
  ],
  "suggestedStatus": "backlog|todo|doing|review|done"
}`;

      const response = await provider.complete([
        { role: 'system', content: 'You are a software project analyst. Respond only with valid JSON.' },
        { role: 'user', content: analysisPrompt }
      ]);

      // Parse the response
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = response.content;
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        const analysis = JSON.parse(jsonStr);
        return {
          success: true,
          summary: analysis.summary || 'Analysis complete.',
          criteria: analysis.criteria || [],
          suggestedStatus: analysis.suggestedStatus || task.status,
        };
      } catch (parseError) {
        // If JSON parsing fails, return a basic analysis
        return {
          success: true,
          summary: response.content.substring(0, 500),
          criteria: allCriteria.map(c => ({
            criterion: c,
            passed: task.status === 'done' || task.status === 'review',
            evidence: 'Could not perform detailed analysis',
          })),
          suggestedStatus: task.status,
        };
      }
    } catch (error) {
      return {
        success: false,
        summary: '',
        criteria: [],
        suggestedStatus: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Get comment context for agent retry
  ipcMain.handle('tasks:getCommentContext', async (_, taskId: string): Promise<{
    formattedContext: string;
    failureCount: number;
    hasUnresolvedClarifications: boolean;
  }> => {
    if (!hasProject()) {
      return { formattedContext: '', failureCount: 0, hasUnresolvedClarifications: false };
    }
    const service = getCommentService(getStore());
    const context = service.buildRetryContext(taskId);
    return {
      formattedContext: context.formattedContext,
      failureCount: service.getFailureCount(taskId),
      hasUnresolvedClarifications: service.hasUnresolvedClarifications(taskId),
    };
  });

  // Get pending clarifications for a task
  ipcMain.handle('tasks:getPendingClarifications', async (_, taskId: string): Promise<{
    commentId: string;
    reason: string;
    question: string;
    timestamp: string;
    resolved: boolean;
  }[]> => {
    if (!hasProject()) return [];
    const service = getCommentService(getStore());
    return service.getPendingClarifications(taskId);
  });

  // Mark failures as addressed
  ipcMain.handle('tasks:markFailuresAddressed', async (_, taskId: string, note?: string): Promise<TaskComment | null> => {
    if (!hasProject()) return null;
    const service = getCommentService(getStore());
    return service.markFailuresAddressed(taskId, note);
  });
}
