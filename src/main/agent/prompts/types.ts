/**
 * Prompt System Types
 *
 * Defines types for the centralized prompt system including modes,
 * hierarchy levels, and builder options.
 */

/**
 * Operating modes for the AI agent.
 * Each mode has specific capabilities and restrictions.
 */
export type PromptMode = 'planner' | 'agent' | 'execution';

/**
 * Prompt hierarchy levels (highest priority first).
 * Higher levels cannot be overridden by lower levels.
 */
export enum PromptHierarchyLevel {
  /** Immutable safety rules - cannot be overridden */
  PRIME_DIRECTIVES = 1,
  /** Mode-specific permissions and restrictions */
  MODE_CONSTRAINTS = 2,
  /** Current task context and requirements */
  TASK_CONTEXT = 3,
  /** Human-provided instructions and comments */
  USER_INSTRUCTIONS = 4,
  /** Context from previous failures for retries */
  FAILURE_CONTEXT = 5,
}

/**
 * Confidence level for agent actions and decisions.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Structured reasoning format for agent responses.
 */
export interface StructuredReasoning {
  /** Assumptions made during analysis */
  assumptions: string[];
  /** Key decisions and rationale */
  decisions: string[];
  /** Trade-offs considered */
  tradeoffs: string[];
  /** Final rationale for the approach */
  rationale: string;
}

/**
 * Confidence declaration for agent actions.
 */
export interface ConfidenceDeclaration {
  level: ConfidenceLevel;
  reason: string;
}

/**
 * Options for building the system prompt.
 */
export interface SystemPromptOptions {
  /** Operating mode */
  mode: PromptMode;
  /** Project context (name, description, architecture, etc.) */
  projectContext?: {
    name: string;
    description: string;
    purpose: string;
    architecture: Record<string, string>;
    devWorkflow: Record<string, string>;
    constraints: string[];
  };
  /** Repository index (key files, important paths) */
  repoIndex?: {
    keyFiles: string[];
    importantPaths: string[];
  };
}

/**
 * Options for building the task prompt.
 */
export interface TaskPromptOptions {
  /** Previous failure context for retries */
  failureContext?: string;
  /** User instruction comments */
  instructionContext?: string;
  /** Current attempt number */
  attemptNumber?: number;
}

/**
 * Task structure for prompt building.
 */
export interface TaskForPrompt {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  acceptanceCriteria: string[];
  epic?: {
    name: string;
    color: string;
  };
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
}
