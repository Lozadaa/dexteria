/**
 * Centralized Prompt System
 *
 * This module provides a centralized, hierarchical prompt system for the AI agent.
 *
 * ## Architecture
 *
 * The prompt system follows a strict hierarchy:
 * 1. Prime Directives (Level 1) - Immutable safety rules
 * 2. Mode Constraints (Level 2) - Per-mode permissions
 * 3. Task Context (Level 3) - Current task details
 * 4. User Instructions (Level 4) - Human comments
 * 5. Failure Context (Level 5) - Retry guidance
 *
 * ## Usage
 *
 * ```typescript
 * import { PromptBuilder } from './prompts';
 *
 * // Build system prompt
 * const systemPrompt = PromptBuilder.buildSystemPrompt({
 *   mode: 'execution',
 *   projectContext,
 *   repoIndex,
 * });
 *
 * // Build task prompt
 * const taskPrompt = PromptBuilder.buildTaskPrompt(task, {
 *   failureContext,
 *   instructionContext,
 *   attemptNumber,
 * });
 * ```
 */

// Types
export type {
  PromptMode,
  ConfidenceLevel,
  StructuredReasoning,
  ConfidenceDeclaration,
  SystemPromptOptions,
  TaskPromptOptions,
  TaskForPrompt,
} from './types';

export { PromptHierarchyLevel } from './types';

// Prime Directives
export {
  DIRECTIVE_SAFETY_FIRST,
  DIRECTIVE_HONESTY,
  DIRECTIVE_SCOPE_ADHERENCE,
  DIRECTIVE_HUMAN_ONLY_BOUNDARY,
  DIRECTIVE_MODE_ISOLATION,
  ALL_PRIME_DIRECTIVES,
  CONFLICT_RESOLUTION,
  buildPrimeDirectivesPrompt,
} from './primeDirectives';

// Mode Prompts
export {
  BASE_IDENTITY,
  PLANNER_MODE_PROMPT,
  AGENT_MODE_PROMPT,
  EXECUTION_MODE_PROMPT,
  getModePrompt,
  buildModePrompt,
} from './modePrompts';

// Output Contracts
export {
  STRUCTURED_REASONING_FORMAT,
  CONFIDENCE_DECLARATION_FORMAT,
  TASK_CREATION_CONTRACT,
  TASK_COMPLETION_CONTRACT,
  TASK_BLOCKED_CONTRACT,
  TASK_FAILED_CONTRACT,
  buildOutputContractsPrompt,
} from './outputContracts';

// Failure Handling
export {
  WHEN_TO_BLOCK,
  WHEN_TO_FAIL,
  ESCALATION_TRIGGERS,
  RETRY_PROTOCOL,
  buildFailureHandlingPrompt,
  buildRetryContextPrompt,
} from './failureHandling';

// Main Builder
export {
  PromptBuilder,
  buildSystemPrompt,
  buildTaskPrompt,
} from './PromptBuilder';
