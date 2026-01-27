/**
 * PromptBuilder
 *
 * Central builder class for constructing agent prompts.
 * Assembles prompts following the hierarchy:
 *   1. Identity
 *   2. Prime Directives (Level 1)
 *   3. Conflict Resolution
 *   4. Mode Prompt (Level 2)
 *   5. Output Contracts
 *   6. Failure Handling
 *   7. Project Context (Level 3)
 *   8. Repository Index
 */

import type {
  PromptMode,
  SystemPromptOptions,
  TaskPromptOptions,
  TaskForPrompt,
} from './types';
import type { Skill } from '../../../shared/types/skill';
import { buildPrimeDirectivesPrompt } from './primeDirectives';
import { buildModePrompt } from './modePrompts';
import { buildOutputContractsPrompt } from './outputContracts';
import { buildFailureHandlingPrompt, buildRetryContextPrompt } from './failureHandling';

/**
 * PromptBuilder - Static utility class for building agent prompts.
 */
export class PromptBuilder {
  /**
   * Build the complete system prompt for the agent.
   * Follows the prompt hierarchy for proper layering.
   */
  static buildSystemPrompt(options: SystemPromptOptions & { skills?: Skill[] }): string {
    const { mode, projectContext, repoIndex, skills } = options;

    const sections: string[] = [];

    // 1. Mode Prompt (includes identity)
    sections.push(buildModePrompt(mode));

    // 2. Prime Directives (Level 1 - immutable)
    sections.push(buildPrimeDirectivesPrompt());

    // 3. Output Contracts
    sections.push(buildOutputContractsPrompt());

    // 4. Active Skills (injected expertise)
    if (skills && skills.length > 0) {
      sections.push(this.buildSkillsSection(skills));
    }

    // 5. Failure Handling
    sections.push(buildFailureHandlingPrompt());

    // 6. Project Context (Level 3 - if available)
    if (projectContext) {
      sections.push(this.buildProjectContextSection(projectContext));
    }

    // 7. Repository Index (if available)
    if (repoIndex) {
      sections.push(this.buildRepoIndexSection(repoIndex));
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Build skills section from matched skills.
   */
  private static buildSkillsSection(skills: Skill[]): string {
    const skillBlocks = skills
      .sort((a, b) => b.priority - a.priority)
      .map(s => s.promptContent)
      .join('\n\n---\n\n');

    return `## Active Skills

The following domain expertise has been activated for this task:

${skillBlocks}`;
  }

  /**
   * Build a task execution prompt.
   * Used for individual task execution in AgentRuntime.
   */
  static buildTaskPrompt(task: TaskForPrompt, options: TaskPromptOptions = {}): string {
    const { failureContext, instructionContext, attemptNumber = 1 } = options;

    const sections: string[] = [];

    // Task header
    sections.push(this.buildTaskHeaderSection(task));

    // Human-only and AI-reviewable flags
    if (task.humanOnly || task.aiReviewable) {
      sections.push(this.buildTaskFlagsSection(task));
    }

    // Task description and criteria
    sections.push(this.buildTaskDescriptionSection(task));

    // Agent goal and scope
    sections.push(this.buildAgentGoalSection(task));

    // User instruction comments (Level 4 - override agent plan)
    if (instructionContext) {
      sections.push(this.buildInstructionSection(instructionContext));
    }

    // Failure context for retries (Level 5)
    if (failureContext && attemptNumber > 1) {
      sections.push(buildRetryContextPrompt(failureContext, attemptNumber));
    }

    // Recent comments for context
    const recentComments = this.getRecentComments(task);
    if (recentComments) {
      sections.push(recentComments);
    }

    // Execution instructions
    sections.push(this.buildExecutionInstructions());

    return sections.join('\n\n');
  }

  /**
   * Build project context section.
   */
  private static buildProjectContextSection(
    context: NonNullable<SystemPromptOptions['projectContext']>
  ): string {
    return `## Project Context (Level 3)

**Name:** ${context.name}
**Description:** ${context.description}
**Purpose:** ${context.purpose}

**Architecture:**
${Object.entries(context.architecture).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**Dev Workflow:**
${Object.entries(context.devWorkflow).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**Constraints:**
${context.constraints.map(c => `- ${c}`).join('\n')}`;
  }

  /**
   * Build repository index section.
   */
  private static buildRepoIndexSection(
    repoIndex: NonNullable<SystemPromptOptions['repoIndex']>
  ): string {
    return `## Repository Index

**Key Files:**
${repoIndex.keyFiles.map(f => `- ${f}`).join('\n')}

**Important Paths:**
${repoIndex.importantPaths.map(p => `- ${p}`).join('\n')}`;
  }

  /**
   * Build task header section.
   */
  private static buildTaskHeaderSection(task: TaskForPrompt): string {
    let header = `## Current Task

**ID:** ${task.id}
**Title:** ${task.title}
**Status:** ${task.status}
**Priority:** ${task.priority}`;

    // Add Epic and Sprint if defined (Jira alignment)
    if (task.epic) {
      header += `\n**Epic:** ${task.epic.name}`;
    }
    if (task.sprint) {
      header += `\n**Sprint:** ${task.sprint}`;
    }

    return header;
  }

  /**
   * Build task flags section (human-only, ai-reviewable).
   */
  private static buildTaskFlagsSection(task: TaskForPrompt): string {
    const flags: string[] = [];

    if (task.humanOnly) {
      flags.push(`**HUMAN-ONLY TASK:** This task can only be completed by a human. You cannot execute or complete this task directly.`);
    }

    if (task.aiReviewable) {
      flags.push(`**AI-Reviewable:** This task will be automatically reviewed by AI when moved to Review.`);
      if (task.reviewCriteria) {
        flags.push(`**Review Criteria:** ${task.reviewCriteria}`);
      }
    }

    return flags.join('\n');
  }

  /**
   * Build task description section.
   */
  private static buildTaskDescriptionSection(task: TaskForPrompt): string {
    return `**Description:**
${task.description}

**Acceptance Criteria:**
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
  }

  /**
   * Build agent goal section.
   */
  private static buildAgentGoalSection(task: TaskForPrompt): string {
    return `**Agent Goal:**
${task.agent.goal}

**Scope:**
${task.agent.scope.map(s => `- ${s}`).join('\n')}

**Definition of Done:**
${task.agent.definitionOfDone.map(d => `- ${d}`).join('\n')}`;
  }

  /**
   * Build instruction section from user comments.
   */
  private static buildInstructionSection(instructionContext: string): string {
    return `## User Instructions (Level 4 - Override agent plan)

${instructionContext}`;
  }

  /**
   * Get recent comments for context.
   */
  private static getRecentComments(task: TaskForPrompt): string | null {
    const recentComments = task.comments
      .filter(c => c.type !== 'instruction' && c.type !== 'failure')
      .slice(-5);

    if (recentComments.length === 0) {
      return null;
    }

    return `## Recent Comments

${recentComments.map(c => `[${c.type}] ${c.author}: ${c.content}`).join('\n')}`;
  }

  /**
   * Build execution instructions footer.
   */
  private static buildExecutionInstructions(): string {
    return `## Instructions

1. Plan your approach based on the task requirements
2. Use Structured Reasoning to explain your approach
3. Execute using the available tools
4. Verify ALL acceptance criteria with evidence
5. Mark the task complete only when ALL criteria are met
6. If blocked or need human input, use task_blocked
7. If failed, use task_failed with clear reason
8. Include Confidence Declaration with each significant action

Begin execution now.`;
  }
}

/**
 * Legacy function for backwards compatibility with AgentProvider.
 * @deprecated Use PromptBuilder.buildSystemPrompt() instead
 */
export function buildSystemPrompt(
  projectContext: {
    name: string;
    description: string;
    purpose: string;
    architecture: Record<string, string>;
    devWorkflow: Record<string, string>;
    constraints: string[];
    updatedAt?: string;
  } | null,
  repoIndex: {
    keyFiles: string[];
    importantPaths: string[];
    updatedAt?: string;
  } | null,
  mode: PromptMode = 'execution'
): string {
  return PromptBuilder.buildSystemPrompt({
    mode,
    projectContext: projectContext ? {
      name: projectContext.name,
      description: projectContext.description,
      purpose: projectContext.purpose,
      architecture: projectContext.architecture,
      devWorkflow: projectContext.devWorkflow,
      constraints: projectContext.constraints,
    } : undefined,
    repoIndex: repoIndex ? {
      keyFiles: repoIndex.keyFiles,
      importantPaths: repoIndex.importantPaths,
    } : undefined,
  });
}

/**
 * Legacy function for backwards compatibility with AgentProvider.
 * Accepts the full Task type from shared/types.
 * @deprecated Use PromptBuilder.buildTaskPrompt() instead
 */
export function buildTaskPrompt(task: {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  acceptanceCriteria: string[];
  epic?: { name: string; color: string };
  sprint?: string;
  humanOnly?: boolean;
  aiReviewable?: boolean;
  reviewCriteria?: string;
  comments: Array<{
    id: string;
    type: string;
    author: string;
    content: string;
    createdAt: string;
    runId?: string;
  }>;
  agent: {
    goal: string;
    scope: string[];
    definitionOfDone: string[];
  };
}): string {
  // Build instruction context from instruction comments
  const instructionComments = task.comments.filter(c => c.type === 'instruction');
  let instructionContext: string | undefined;
  if (instructionComments.length > 0) {
    instructionContext = instructionComments
      .map(c => `[${c.createdAt}] ${c.content}`)
      .join('\n\n');
  }

  // Build failure context from failure comments
  const failureComments = task.comments.filter(c => c.type === 'failure');
  let failureContext: string | undefined;
  let attemptNumber = 1;
  if (failureComments.length > 0) {
    attemptNumber = failureComments.length + 1;
    const latest = failureComments[failureComments.length - 1];
    failureContext = `**Run ID:** ${latest.runId || 'unknown'}\n**Details:** ${latest.content}\n\nLearn from this failure and try a different approach.`;
  }

  // Convert to TaskForPrompt format
  const taskForPrompt: TaskForPrompt = {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    acceptanceCriteria: task.acceptanceCriteria,
    epic: task.epic,
    sprint: task.sprint,
    humanOnly: task.humanOnly,
    aiReviewable: task.aiReviewable,
    reviewCriteria: task.reviewCriteria,
    comments: task.comments,
    agent: task.agent,
  };

  return PromptBuilder.buildTaskPrompt(taskForPrompt, {
    instructionContext,
    failureContext,
    attemptNumber,
  });
}
