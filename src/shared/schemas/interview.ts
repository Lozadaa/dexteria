/**
 * Interview Schemas
 *
 * Zod schemas for validating interview-related data.
 */

import { z } from 'zod';

// ============================================
// Primitive Schemas
// ============================================

/**
 * Interview stage values.
 */
export const InterviewStageSchema = z.enum(['seed_name', 'seed_idea', 'interview', 'finalize', 'done']);

/**
 * Technical proficiency level.
 */
export const TechLevelSchema = z.enum(['technical', 'non_technical', 'mixed']);

/**
 * Interview depth preset.
 */
export const InterviewDepthSchema = z.enum(['quick', 'normal', 'pro']);

/**
 * Tech level detection mode.
 */
export const TechLevelModeSchema = z.enum(['ask', 'infer']);

/**
 * Interview question category.
 */
export const InterviewQuestionCategorySchema = z.enum([
  'scope',
  'technology',
  'timeline',
  'constraints',
  'features',
  'users',
  'integrations',
  'other',
]);

/**
 * Risk severity levels.
 */
export const RiskSeveritySchema = z.enum(['low', 'medium', 'high']);

/**
 * Task priority (shared with task schemas).
 */
export const BacklogPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Estimated complexity for stories.
 */
export const EstimatedComplexitySchema = z.enum(['simple', 'medium', 'complex']);

/**
 * Stream update types.
 */
export const InterviewStreamTypeSchema = z.enum(['question', 'options', 'example', 'brief', 'backlog']);

// ============================================
// Component Schemas
// ============================================

/**
 * User profile schema.
 */
export const InterviewUserProfileSchema = z.object({
  level: TechLevelSchema,
  inferredFromResponse: z.boolean().optional(),
});

/**
 * Interview question schema.
 */
export const InterviewQuestionSchema = z.object({
  id: z.string(),
  index: z.number().int().min(0),
  text: z.string().min(1),
  context: z.string().optional(),
  suggestedOptions: z.array(z.string()).optional(),
  exampleAnswer: z.string().optional(),
  category: InterviewQuestionCategorySchema,
  isRequired: z.boolean(),
});

/**
 * Interview answer schema.
 */
export const InterviewAnswerSchema = z.object({
  questionId: z.string(),
  questionIndex: z.number().int().min(0),
  questionText: z.string(),
  answer: z.string(),
  skipped: z.boolean(),
  timestamp: z.string(),
});

/**
 * Interview assumption schema.
 */
export const InterviewAssumptionSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  assumption: z.string(),
  reason: z.string(),
  timestamp: z.string(),
});

/**
 * Interview risk schema.
 */
export const InterviewRiskSchema = z.object({
  id: z.string(),
  description: z.string(),
  severity: RiskSeveritySchema,
  mitigation: z.string().optional(),
});

/**
 * Project brief schema.
 */
export const ProjectBriefSchema = z.object({
  name: z.string(),
  summary: z.string(),
  goals: z.array(z.string()),
  techStack: z.array(z.string()),
  constraints: z.array(z.string()),
  timeline: z.string().optional(),
  targetUsers: z.string().optional(),
  assumptions: z.array(InterviewAssumptionSchema),
  risks: z.array(InterviewRiskSchema),
});

/**
 * Backlog story schema.
 */
export const BacklogStorySchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: BacklogPrioritySchema,
  isSetupTask: z.boolean(),
  estimatedComplexity: EstimatedComplexitySchema.optional(),
});

/**
 * Backlog epic schema.
 */
export const BacklogEpicSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  description: z.string().optional(),
  stories: z.array(BacklogStorySchema),
});

// ============================================
// Main Interview State Schema
// ============================================

/**
 * Complete interview state schema.
 */
export const InterviewStateSchema = z.object({
  stage: InterviewStageSchema,
  osLanguage: z.string(),
  detectedUserLanguage: z.string().nullable(),
  techLevelMode: TechLevelModeSchema,
  userProfile: InterviewUserProfileSchema,
  nQuestions: z.number().int().min(1).max(10),
  currentIndex: z.number().int().min(0),
  currentQuestion: InterviewQuestionSchema.nullable(),
  projectName: z.string(),
  projectIdea: z.string(),
  answers: z.array(InterviewAnswerSchema),
  assumptions: z.array(InterviewAssumptionSchema),
  risks: z.array(InterviewRiskSchema),
  projectBrief: ProjectBriefSchema.nullable(),
  backlogDraft: z.array(BacklogEpicSchema).nullable(),
  projectPath: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// Configuration Schemas
// ============================================

/**
 * Interview configuration schema.
 */
export const InterviewConfigSchema = z.object({
  projectPath: z.string(),
  osLanguage: z.string(),
  depth: InterviewDepthSchema.optional(),
  techLevelMode: TechLevelModeSchema.optional(),
});

/**
 * Stream update schema.
 */
export const InterviewStreamUpdateSchema = z.object({
  type: InterviewStreamTypeSchema,
  content: z.string(),
  done: z.boolean(),
});

/**
 * Submit answer result schema.
 */
export const SubmitAnswerResultSchema = z.object({
  state: InterviewStateSchema,
  nextQuestion: InterviewQuestionSchema.nullable(),
  isComplete: z.boolean(),
});

/**
 * Create tasks result schema.
 */
export const CreateTasksResultSchema = z.object({
  success: z.boolean(),
  taskCount: z.number().int().min(0),
  setupTaskCount: z.number().int().min(0),
  backlogTaskCount: z.number().int().min(0),
  error: z.string().optional(),
});

// ============================================
// Type exports from schemas
// ============================================

export type InterviewStageSchemaType = z.infer<typeof InterviewStageSchema>;
export type TechLevelSchemaType = z.infer<typeof TechLevelSchema>;
export type InterviewDepthSchemaType = z.infer<typeof InterviewDepthSchema>;
export type InterviewStateSchemaType = z.infer<typeof InterviewStateSchema>;
export type InterviewQuestionSchemaType = z.infer<typeof InterviewQuestionSchema>;
export type InterviewAnswerSchemaType = z.infer<typeof InterviewAnswerSchema>;
export type ProjectBriefSchemaType = z.infer<typeof ProjectBriefSchema>;
export type BacklogEpicSchemaType = z.infer<typeof BacklogEpicSchema>;
export type BacklogStorySchemaType = z.infer<typeof BacklogStorySchema>;
