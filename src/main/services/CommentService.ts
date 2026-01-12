/**
 * CommentService
 *
 * Service for managing task comments, including failure tracking,
 * clarification requests, and building context for agent retries.
 */

import { LocalKanbanStore } from './LocalKanbanStore';
import type { TaskComment } from '../../shared/types';

export interface FailureContext {
  runId: string;
  reason: string;
  timestamp: string;
  logPath?: string;
}

export interface ClarificationRequest {
  commentId: string;
  runId?: string;
  reason: string;
  question: string;
  timestamp: string;
  resolved: boolean;
}

export interface CommentContext {
  /** All comments for context */
  allComments: TaskComment[];
  /** Recent user instructions */
  recentInstructions: TaskComment[];
  /** Recent failures */
  recentFailures: TaskComment[];
  /** Unresolved clarification requests */
  pendingClarifications: ClarificationRequest[];
  /** Formatted context string for agent */
  formattedContext: string;
}

export class CommentService {
  private store: LocalKanbanStore;

  constructor(store: LocalKanbanStore) {
    this.store = store;
  }

  /**
   * Add a user note to a task.
   */
  addNote(taskId: string, content: string): TaskComment {
    return this.store.addTypedComment(taskId, 'note', 'user', content);
  }

  /**
   * Add a user instruction to a task.
   * Instructions are used by the agent when retrying.
   */
  addInstruction(taskId: string, content: string): TaskComment {
    return this.store.addTypedComment(taskId, 'instruction', 'user', content);
  }

  /**
   * Add an agent comment to a task.
   */
  addAgentComment(taskId: string, content: string, runId?: string): TaskComment {
    return this.store.addTypedComment(taskId, 'agent', 'dexter', content, runId);
  }

  /**
   * Add a failure comment with structured data.
   */
  addFailureComment(
    taskId: string,
    reason: string,
    runId: string,
    nextSteps?: string
  ): TaskComment {
    const logPath = `.local-kanban/agent-runs/${taskId}/${runId}.json`;
    let content = `**Task Failed**\n\n**Run ID:** ${runId}\n**Log Path:** ${logPath}\n\n**Reason:** ${reason}`;

    if (nextSteps) {
      content += `\n\n**Suggested Next Steps:** ${nextSteps}`;
    }

    return this.store.addTypedComment(taskId, 'failure', 'dexter', content, runId);
  }

  /**
   * Add a clarification request from the agent.
   */
  addClarificationRequest(
    taskId: string,
    reason: string,
    question: string,
    runId: string
  ): TaskComment {
    const content = `**Task Blocked**\n\n**Reason:** ${reason}\n\n**Question:** ${question}\n\n*Please add an instruction comment to help me proceed.*`;

    return this.store.addTypedComment(taskId, 'failure', 'dexter', content, runId);
  }

  /**
   * Add a system comment (cancellation, etc.)
   */
  addSystemComment(taskId: string, content: string, runId?: string): TaskComment {
    return this.store.addTypedComment(taskId, 'system', 'system', content, runId);
  }

  /**
   * Get all comments for a task.
   */
  getComments(taskId: string): TaskComment[] {
    const task = this.store.getTask(taskId);
    return task?.comments || [];
  }

  /**
   * Get recent failures for a task.
   */
  getRecentFailures(taskId: string, limit: number = 3): FailureContext[] {
    const comments = this.getComments(taskId);
    const failures = comments
      .filter(c => c.type === 'failure')
      .slice(-limit)
      .map(c => this.parseFailureComment(c));

    return failures;
  }

  /**
   * Parse a failure comment to extract structured data.
   */
  private parseFailureComment(comment: TaskComment): FailureContext {
    const content = comment.content;

    // Extract reason
    const reasonMatch = content.match(/\*\*Reason:\*\*\s*(.+?)(?:\n|$)/);
    const reason = reasonMatch ? reasonMatch[1].trim() : content.substring(0, 100);

    // Extract log path
    const logPathMatch = content.match(/\*\*Log Path:\*\*\s*(.+?)(?:\n|$)/);
    const logPath = logPathMatch ? logPathMatch[1].trim() : undefined;

    return {
      runId: comment.runId || 'unknown',
      reason,
      timestamp: comment.createdAt,
      logPath,
    };
  }

  /**
   * Get pending clarification requests.
   */
  getPendingClarifications(taskId: string): ClarificationRequest[] {
    const comments = this.getComments(taskId);
    const clarifications: ClarificationRequest[] = [];

    // Find failure comments with questions
    const failuresWithQuestions = comments.filter(
      c => c.type === 'failure' && c.content.includes('**Question:**')
    );

    for (const failure of failuresWithQuestions) {
      const reasonMatch = failure.content.match(/\*\*Reason:\*\*\s*(.+?)(?:\n|$)/);
      const questionMatch = failure.content.match(/\*\*Question:\*\*\s*(.+?)(?:\n|$)/);

      if (questionMatch) {
        // Check if resolved (instruction added after this comment)
        const failureIndex = comments.findIndex(c => c.id === failure.id);
        const laterInstructions = comments
          .slice(failureIndex + 1)
          .filter(c => c.type === 'instruction');

        clarifications.push({
          commentId: failure.id,
          runId: failure.runId,
          reason: reasonMatch ? reasonMatch[1].trim() : 'Unknown reason',
          question: questionMatch[1].trim(),
          timestamp: failure.createdAt,
          resolved: laterInstructions.length > 0,
        });
      }
    }

    return clarifications;
  }

  /**
   * Build context from comments for agent retry.
   * This includes recent failures, user instructions, and clarification responses.
   */
  buildRetryContext(taskId: string): CommentContext {
    const task = this.store.getTask(taskId);
    const allComments = task?.comments || [];

    // Get recent instructions (last 5)
    const recentInstructions = allComments
      .filter(c => c.type === 'instruction')
      .slice(-5);

    // Get recent failures (last 3)
    const recentFailures = allComments
      .filter(c => c.type === 'failure')
      .slice(-3);

    // Get pending clarifications
    const pendingClarifications = this.getPendingClarifications(taskId);

    // Build formatted context string for the agent
    const contextParts: string[] = [];

    if (recentFailures.length > 0) {
      contextParts.push('## Previous Failures');
      for (const failure of recentFailures) {
        const failureCtx = this.parseFailureComment(failure);
        contextParts.push(`- **Run ${failureCtx.runId.substring(0, 8)}** (${new Date(failureCtx.timestamp).toLocaleString()}): ${failureCtx.reason}`);
      }
      contextParts.push('');
    }

    if (recentInstructions.length > 0) {
      contextParts.push('## User Instructions');
      for (const instruction of recentInstructions) {
        contextParts.push(`- (${new Date(instruction.createdAt).toLocaleString()}): ${instruction.content}`);
      }
      contextParts.push('');
    }

    const unresolvedClarifications = pendingClarifications.filter(c => !c.resolved);
    if (unresolvedClarifications.length > 0) {
      contextParts.push('## Pending Clarifications (UNANSWERED)');
      for (const clarification of unresolvedClarifications) {
        contextParts.push(`- **Question:** ${clarification.question}`);
        contextParts.push(`  - Reason: ${clarification.reason}`);
      }
      contextParts.push('');
    }

    const resolvedClarifications = pendingClarifications.filter(c => c.resolved);
    if (resolvedClarifications.length > 0) {
      contextParts.push('## Answered Clarifications');
      for (const clarification of resolvedClarifications) {
        const responseInstruction = recentInstructions.find(
          i => new Date(i.createdAt) > new Date(clarification.timestamp)
        );
        contextParts.push(`- **Question:** ${clarification.question}`);
        contextParts.push(`  - **Response:** ${responseInstruction?.content || 'See instructions above'}`);
      }
      contextParts.push('');
    }

    return {
      allComments,
      recentInstructions,
      recentFailures,
      pendingClarifications,
      formattedContext: contextParts.join('\n'),
    };
  }

  /**
   * Check if task has unresolved clarifications that need user input.
   */
  hasUnresolvedClarifications(taskId: string): boolean {
    const clarifications = this.getPendingClarifications(taskId);
    return clarifications.some(c => !c.resolved);
  }

  /**
   * Get the failure count for a task.
   */
  getFailureCount(taskId: string): number {
    const comments = this.getComments(taskId);
    return comments.filter(c => c.type === 'failure').length;
  }

  /**
   * Clear failure history by adding a resolution comment.
   */
  markFailuresAddressed(taskId: string, note?: string): TaskComment {
    const content = note
      ? `Previous failures addressed: ${note}`
      : 'Previous failures have been addressed.';

    return this.store.addTypedComment(taskId, 'system', 'user', content);
  }
}

// Singleton instance
let serviceInstance: CommentService | null = null;

export function getCommentService(store: LocalKanbanStore): CommentService {
  if (!serviceInstance) {
    serviceInstance = new CommentService(store);
  }
  return serviceInstance;
}
