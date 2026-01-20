/**
 * TaskDetail Constants and Types
 */

import type { AcceptanceCriterionResult } from '../../../shared/types';

/**
 * Predefined epic colors for task categorization.
 */
export const EPIC_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
] as const;

/**
 * Result of analyzing a task's current state.
 */
export interface AnalysisResult {
  status: 'analyzing' | 'complete' | 'error';
  summary?: string;
  criteria?: AcceptanceCriterionResult[];
  suggestedStatus?: string;
  error?: string;
}
