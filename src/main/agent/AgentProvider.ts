/**
 * AgentProvider
 *
 * Abstract interface for AI agent providers.
 * Allows swapping between Claude, OpenAI, local models, or mock providers.
 */

import type {
  AgentMessage,
  AgentToolDefinition,
  AgentResponse,
  Task,
  ProjectContext,
  RepoIndex,
} from '../../shared/types';

export interface AgentProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Abstract base class for agent providers.
 */
export abstract class AgentProvider {
  protected config: AgentProviderConfig;

  constructor(config: AgentProviderConfig = {}) {
    this.config = config;
  }

  /**
   * Send messages to the agent and get a response.
   * @param messages - The conversation history
   * @param tools - Optional tools available to the agent
   * @param onChunk - Optional callback for streaming responses
   */
  abstract complete(
    messages: AgentMessage[],
    tools?: AgentToolDefinition[],
    onChunk?: (chunk: string) => void
  ): Promise<AgentResponse>;

  /**
   * Check if the provider is ready/configured.
   */
  abstract isReady(): boolean;

  /**
   * Get provider name.
   */
  abstract getName(): string;
}

// ============================================
// Tool Definitions for Agent
// ============================================

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'list_files',
    description: 'List files matching a glob pattern in the project',
    parameters: {
      type: 'object',
      properties: {
        glob: {
          type: 'string',
          description: 'Glob pattern to match files (e.g., "src/**/*.ts")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
        },
      },
      required: ['glob'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read (relative to project root)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search',
    description: 'Search for content in files using regex',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Regex pattern to search for',
        },
        glob: {
          type: 'string',
          description: 'Optional glob pattern to filter files',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates backup)',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write',
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'apply_patch',
    description: 'Apply a unified diff patch to a file',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to patch',
        },
        unifiedDiff: {
          type: 'string',
          description: 'Unified diff patch content',
        },
      },
      required: ['path', 'unifiedDiff'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the project',
    parameters: {
      type: 'object',
      properties: {
        cmd: {
          type: 'string',
          description: 'Command to run',
        },
        cwd: {
          type: 'string',
          description: 'Working directory (relative to project root)',
        },
        timeoutSec: {
          type: 'number',
          description: 'Timeout in seconds (default 120)',
        },
      },
      required: ['cmd'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task in the Kanban board. Use this BEFORE starting any work to plan what will be done.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Clear, concise title for the task',
        },
        description: {
          type: 'string',
          description: 'Detailed description of what needs to be done',
        },
        acceptanceCriteria: {
          type: 'array',
          description: 'List of criteria that define when the task is complete',
          items: { type: 'string' },
        },
        status: {
          type: 'string',
          description: 'Initial status: backlog, todo, doing, review, or done',
          enum: ['backlog', 'todo', 'doing', 'review', 'done'],
        },
        epic: {
          type: 'object',
          description: 'Epic for Jira alignment (optional)',
          properties: {
            name: { type: 'string', description: 'Name of the epic' },
            color: { type: 'string', description: 'Hex color code (e.g., "#3b82f6")' },
          },
          required: ['name', 'color'],
        },
        sprint: {
          type: 'string',
          description: 'Sprint identifier for Jira alignment (e.g., "Sprint 1")',
        },
        humanOnly: {
          type: 'boolean',
          description: 'If true, this task can only be completed by a human. AI agents CANNOT execute or complete Human-Only tasks - they can only help plan or prepare.',
        },
        aiReviewable: {
          type: 'boolean',
          description: 'If true, AI will automatically review this task when moved to Review status.',
        },
        reviewCriteria: {
          type: 'string',
          description: 'Custom criteria for AI to use when reviewing the task (only used if aiReviewable is true).',
        },
      },
      required: ['title', 'description', 'acceptanceCriteria'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task. IMPORTANT: taskId must be a real ID from create_task or list_tasks - you cannot invent task IDs. NOTE: You CANNOT update or complete Human-Only tasks (humanOnly=true) - those are reserved for humans.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID of the task to update (must be a real ID from create_task result or list_tasks)',
        },
        title: {
          type: 'string',
          description: 'New title (optional)',
        },
        description: {
          type: 'string',
          description: 'New description (optional)',
        },
        status: {
          type: 'string',
          description: 'New status (optional)',
          enum: ['backlog', 'todo', 'doing', 'review', 'done'],
        },
        acceptanceCriteria: {
          type: 'array',
          description: 'New acceptance criteria (optional)',
          items: { type: 'string' },
        },
        epic: {
          type: 'object',
          description: 'Epic for Jira alignment (optional, set to null to remove)',
          properties: {
            name: { type: 'string', description: 'Name of the epic' },
            color: { type: 'string', description: 'Hex color code (e.g., "#3b82f6")' },
          },
          required: ['name', 'color'],
        },
        sprint: {
          type: 'string',
          description: 'Sprint identifier (optional, set to null to remove)',
        },
        humanOnly: {
          type: 'boolean',
          description: 'If true, this task can only be completed by a human (optional)',
        },
        aiReviewable: {
          type: 'boolean',
          description: 'If true, AI will automatically review this task when moved to Review status (optional)',
        },
        reviewCriteria: {
          type: 'string',
          description: 'Custom criteria for AI review (optional, only used if aiReviewable is true)',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List all tasks in the Kanban board, optionally filtered by status',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (optional)',
          enum: ['backlog', 'todo', 'doing', 'review', 'done'],
        },
      },
      required: [],
    },
  },
  {
    name: 'task_complete',
    description: 'Mark the task as complete with acceptance verification',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Summary of what was accomplished',
        },
        acceptanceResults: {
          type: 'array',
          description: 'Results for each acceptance criterion',
          items: {
            type: 'object',
            properties: {
              criterion: { type: 'string' },
              passed: { type: 'boolean' },
              evidence: { type: 'string' },
            },
            required: ['criterion', 'passed', 'evidence'],
          },
        },
      },
      required: ['summary', 'acceptanceResults'],
    },
  },
  {
    name: 'task_blocked',
    description: 'Mark the task as blocked and request human input',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Why the task is blocked',
        },
        question: {
          type: 'string',
          description: 'Question for the human to answer',
        },
      },
      required: ['reason', 'question'],
    },
  },
  {
    name: 'task_failed',
    description: 'Mark the task as failed with error details',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Why the task failed',
        },
        nextSteps: {
          type: 'string',
          description: 'Suggested next steps',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'submit_ai_review',
    description: 'Submit an AI review result for a task that has aiReviewable=true. This tool is used when performing automatic review of tasks in the Review column.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID of the task being reviewed',
        },
        passed: {
          type: 'boolean',
          description: 'Whether the task passes the review criteria',
        },
        feedback: {
          type: 'string',
          description: 'Detailed feedback explaining the review result',
        },
        checklist: {
          type: 'array',
          description: 'Optional checklist of criteria checked during review',
          items: {
            type: 'object',
            properties: {
              criterion: {
                type: 'string',
                description: 'The criterion being checked',
              },
              passed: {
                type: 'boolean',
                description: 'Whether this criterion passed',
              },
              note: {
                type: 'string',
                description: 'Optional note explaining the result',
              },
            },
            required: ['criterion', 'passed'],
          },
        },
      },
      required: ['taskId', 'passed', 'feedback'],
    },
  },
  {
    name: 'save_progress',
    description: 'Save your current progress so you can resume if interrupted. Call this after completing each significant step.',
    parameters: {
      type: 'object',
      properties: {
        completed: {
          type: 'string',
          description: 'What you have completed so far',
        },
        nextStep: {
          type: 'string',
          description: 'What you will do next',
        },
        tasksCreated: {
          type: 'array',
          description: 'List of task IDs created so far',
          items: { type: 'string' },
        },
      },
      required: ['completed', 'nextStep'],
    },
  },
  {
    name: 'configure_project',
    description: 'Configure the project commands (run, build, install). IMPORTANT: Use this when setting up a new project to tell Dexteria how to run and build it. This is essential for Ralph mode to execute your project correctly.',
    parameters: {
      type: 'object',
      properties: {
        runCommand: {
          type: 'string',
          description: 'Command to start the development server (e.g., "npm run dev", "yarn dev", "pnpm dev")',
        },
        buildCommand: {
          type: 'string',
          description: 'Command to build the project (e.g., "npm run build", "yarn build", "pnpm build")',
        },
        installCommand: {
          type: 'string',
          description: 'Command to install dependencies (e.g., "npm install", "yarn", "pnpm install")',
        },
        packageManager: {
          type: 'string',
          description: 'The package manager used (npm, yarn, pnpm, bun)',
          enum: ['npm', 'yarn', 'pnpm', 'bun'],
        },
      },
      required: [],
    },
  },
];

// ============================================
// Mock Provider for Testing
// ============================================

interface MockScenario {
  trigger: string;
  response: AgentResponse;
}

/**
 * Mock provider for testing without network calls.
 * Simulates agent behavior based on predefined scenarios.
 */
export class MockAgentProvider extends AgentProvider {
  private scenarios: MockScenario[] = [];
  private callHistory: Array<{ messages: AgentMessage[]; tools?: AgentToolDefinition[] }> = [];

  constructor(config: AgentProviderConfig = {}) {
    super(config);
    this.setupDefaultScenarios();
  }

  getName(): string {
    return 'MockProvider';
  }

  isReady(): boolean {
    return true;
  }

  /**
   * Add a custom scenario.
   */
  addScenario(trigger: string, response: AgentResponse): void {
    this.scenarios.unshift({ trigger, response });
  }

  /**
   * Get call history for testing.
   */
  getCallHistory(): typeof this.callHistory {
    return this.callHistory;
  }

  /**
   * Clear call history.
   */
  clearHistory(): void {
    this.callHistory = [];
  }

  async complete(messages: AgentMessage[], tools?: AgentToolDefinition[], _onChunk?: (chunk: string) => void): Promise<AgentResponse> {
    this.callHistory.push({ messages, tools });

    // Get the last user message content
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const content = lastUserMessage?.content || '';

    // Check scenarios
    for (const scenario of this.scenarios) {
      if (content.toLowerCase().includes(scenario.trigger.toLowerCase())) {
        return scenario.response;
      }
    }

    // Default behavior based on message content
    return this.generateDefaultResponse(content, messages);
  }

  private setupDefaultScenarios(): void {
    // Scenario: Simple file read request
    this.addScenario('read the file', {
      content: 'I will read the file to understand its contents.',
      toolCalls: [
        {
          id: 'call_1',
          name: 'read_file',
          arguments: { path: 'package.json' },
        },
      ],
      finishReason: 'tool_calls',
    });

    // Scenario: Search request
    this.addScenario('search for', {
      content: 'I will search the codebase for the requested pattern.',
      toolCalls: [
        {
          id: 'call_2',
          name: 'search',
          arguments: { query: 'TODO', maxResults: 10 },
        },
      ],
      finishReason: 'tool_calls',
    });

    // Scenario: Run tests
    this.addScenario('run tests', {
      content: 'I will run the tests to verify the implementation.',
      toolCalls: [
        {
          id: 'call_3',
          name: 'run_command',
          arguments: { cmd: 'npm test', timeoutSec: 120 },
        },
      ],
      finishReason: 'tool_calls',
    });

    // Scenario: Task blocked - needs clarification
    this.addScenario('unclear requirement', {
      content: 'I need clarification on the requirements before proceeding.',
      toolCalls: [
        {
          id: 'call_4',
          name: 'task_blocked',
          arguments: {
            reason: 'The requirements are unclear',
            question: 'Could you please clarify what specific behavior is expected?',
          },
        },
      ],
      finishReason: 'tool_calls',
    });

    // Scenario: Task complete
    this.addScenario('all criteria met', {
      content: 'All acceptance criteria have been verified and met.',
      toolCalls: [
        {
          id: 'call_5',
          name: 'task_complete',
          arguments: {
            summary: 'Successfully completed the task',
            acceptanceResults: [
              {
                criterion: 'Implementation works correctly',
                passed: true,
                evidence: 'Tests pass',
              },
            ],
          },
        },
      ],
      finishReason: 'tool_calls',
    });
  }

  private generateDefaultResponse(_content: string, messages: AgentMessage[]): AgentResponse {
    // Check if we're in a tool result chain
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user' && lastMessage.content.includes('Tool result')) {
      // After tool result, decide next step
      if (lastMessage.content.includes('error') || lastMessage.content.includes('failed')) {
        return {
          content: 'The operation encountered an error. I will mark the task as failed.',
          toolCalls: [
            {
              id: 'call_fail',
              name: 'task_failed',
              arguments: {
                reason: 'Tool execution failed',
                nextSteps: 'Review the error and try again',
              },
            },
          ],
          finishReason: 'tool_calls',
        };
      }

      // Success - continue or complete
      return {
        content: 'The operation completed successfully. I will verify the acceptance criteria.',
        toolCalls: [
          {
            id: 'call_complete',
            name: 'task_complete',
            arguments: {
              summary: 'Task completed successfully based on tool execution',
              acceptanceResults: [
                {
                  criterion: 'Task requirements met',
                  passed: true,
                  evidence: 'Tool execution successful',
                },
              ],
            },
          },
        ],
        finishReason: 'tool_calls',
      };
    }

    // Default: List files to understand the project
    return {
      content: 'Let me first explore the project structure to understand the codebase.',
      toolCalls: [
        {
          id: 'call_explore',
          name: 'list_files',
          arguments: { glob: 'src/**/*.ts', maxResults: 20 },
        },
      ],
      finishReason: 'tool_calls',
    };
  }
}

// ============================================
// Prompt Building Helpers
// ============================================

/**
 * Build a system prompt with project context.
 */
export function buildSystemPrompt(
  projectContext: ProjectContext | null,
  repoIndex: RepoIndex | null
): string {
  let prompt = `You are Dexter, an AI agent executing tasks in a software project.

Your capabilities:
- Read and write files in the project
- Search for content in files
- Run shell commands
- Apply patches to modify files

Your constraints:
- Only modify files within the project scope
- Follow the policy restrictions
- Always verify acceptance criteria before marking a task complete
- If blocked or unclear, ask for human input

## Human-Only and AI-Reviewable Tasks

**Human-Only Tasks (humanOnly=true):**
- You CANNOT execute, complete, or directly work on Human-Only tasks
- When you encounter a Human-Only task, you can only:
  - Provide information or analysis to HELP the human
  - Create sub-tasks to prepare materials
  - Answer questions about the task
- NEVER use update_task, task_complete, or task_failed on Human-Only tasks
- If asked to work on a Human-Only task, politely explain that it requires human completion

**AI-Reviewable Tasks (aiReviewable=true):**
- These tasks will be automatically reviewed by AI when moved to Review status
- When reviewing such tasks, use the submit_ai_review tool to submit your review
- Check the task's reviewCriteria field for specific criteria to evaluate
- Be thorough but fair in your review - check acceptance criteria and code quality

`;

  if (projectContext) {
    prompt += `## Project Context

**Name:** ${projectContext.name}
**Description:** ${projectContext.description}
**Purpose:** ${projectContext.purpose}

**Architecture:**
${Object.entries(projectContext.architecture).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**Dev Workflow:**
${Object.entries(projectContext.devWorkflow).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**Constraints:**
${projectContext.constraints.map(c => `- ${c}`).join('\n')}

`;
  }

  if (repoIndex) {
    prompt += `## Key Files
${repoIndex.keyFiles.map(f => `- ${f}`).join('\n')}

## Important Paths
${repoIndex.importantPaths.map(p => `- ${p}`).join('\n')}

`;
  }

  return prompt;
}

/**
 * Build a task execution prompt.
 */
export function buildTaskPrompt(task: Task): string {
  let prompt = `## Current Task

**ID:** ${task.id}
**Title:** ${task.title}
**Status:** ${task.status}
**Priority:** ${task.priority}
`;

  // Add Epic and Sprint if defined (for Jira alignment)
  if (task.epic) {
    prompt += `**Epic:** ${task.epic.name}\n`;
  }
  if (task.sprint) {
    prompt += `**Sprint:** ${task.sprint}\n`;
  }

  // Add Human-Only and AI-Reviewable flags
  if (task.humanOnly) {
    prompt += `**⚠️ HUMAN-ONLY TASK:** This task can only be completed by a human. You cannot execute or complete this task directly.\n`;
  }
  if (task.aiReviewable) {
    prompt += `**AI-Reviewable:** This task will be automatically reviewed by AI when moved to Review.\n`;
    if (task.reviewCriteria) {
      prompt += `**Review Criteria:** ${task.reviewCriteria}\n`;
    }
  }

  prompt += `
**Description:**
${task.description}

**Acceptance Criteria:**
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Agent Goal:**
${task.agent.goal}

**Scope:**
${task.agent.scope.map(s => `- ${s}`).join('\n')}

**Definition of Done:**
${task.agent.definitionOfDone.map(d => `- ${d}`).join('\n')}

`;

  // Add instruction comments (they override agent plan)
  const instructionComments = task.comments.filter(c => c.type === 'instruction');
  if (instructionComments.length > 0) {
    prompt += `## Human Instructions (OVERRIDE agent plan)
${instructionComments.map(c => `[${c.createdAt}] ${c.content}`).join('\n\n')}

`;
  }

  // Add latest failure comment if exists
  const failureComments = task.comments.filter(c => c.type === 'failure');
  if (failureComments.length > 0) {
    const latest = failureComments[failureComments.length - 1];
    prompt += `## Previous Failure
**Run ID:** ${latest.runId || 'unknown'}
**Details:** ${latest.content}

Learn from this failure and try a different approach.

`;
  }

  // Add recent comments for context
  const recentComments = task.comments
    .filter(c => c.type !== 'instruction' && c.type !== 'failure')
    .slice(-5);
  if (recentComments.length > 0) {
    prompt += `## Recent Comments
${recentComments.map(c => `[${c.type}] ${c.author}: ${c.content}`).join('\n')}

`;
  }

  prompt += `## Instructions

1. Plan your approach based on the task requirements
2. Execute using the available tools
3. Verify ALL acceptance criteria with evidence
4. Mark the task complete only when ALL criteria are met
5. If blocked or need human input, use task_blocked
6. If failed, use task_failed with clear reason

Begin execution now.
`;

  return prompt;
}
