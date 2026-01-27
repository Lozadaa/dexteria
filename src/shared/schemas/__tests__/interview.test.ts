/**
 * Interview Schema Tests
 *
 * Tests for Zod schema validation of interview-related data.
 */

import { describe, it, expect } from 'vitest';
import {
  InterviewStageSchema,
  TechLevelSchema,
  InterviewDepthSchema,
  InterviewQuestionCategorySchema,
  InterviewQuestionSchema,
  InterviewAnswerSchema,
  InterviewAssumptionSchema,
  InterviewRiskSchema,
  ProjectBriefSchema,
  BacklogStorySchema,
  BacklogEpicSchema,
  InterviewStateSchema,
  InterviewConfigSchema,
  InterviewStreamUpdateSchema,
  SubmitAnswerResultSchema,
  CreateTasksResultSchema,
} from '../interview';

// ============================================================================
// Primitive Schema Tests
// ============================================================================

describe('InterviewStageSchema', () => {
  it('accepts valid stage values', () => {
    const stages = ['seed_name', 'seed_idea', 'interview', 'finalize', 'done'];
    for (const stage of stages) {
      expect(InterviewStageSchema.safeParse(stage).success).toBe(true);
    }
  });

  it('rejects invalid stage values', () => {
    const result = InterviewStageSchema.safeParse('invalid_stage');
    expect(result.success).toBe(false);
  });
});

describe('TechLevelSchema', () => {
  it('accepts valid tech levels', () => {
    const levels = ['technical', 'non_technical', 'mixed'];
    for (const level of levels) {
      expect(TechLevelSchema.safeParse(level).success).toBe(true);
    }
  });

  it('rejects invalid tech levels', () => {
    const result = TechLevelSchema.safeParse('expert');
    expect(result.success).toBe(false);
  });
});

describe('InterviewDepthSchema', () => {
  it('accepts valid depth values', () => {
    const depths = ['quick', 'normal', 'pro'];
    for (const depth of depths) {
      expect(InterviewDepthSchema.safeParse(depth).success).toBe(true);
    }
  });

  it('rejects invalid depth values', () => {
    const result = InterviewDepthSchema.safeParse('ultra');
    expect(result.success).toBe(false);
  });
});

describe('InterviewQuestionCategorySchema', () => {
  it('accepts valid categories', () => {
    const categories = ['scope', 'technology', 'timeline', 'constraints', 'features', 'users', 'integrations', 'other'];
    for (const category of categories) {
      expect(InterviewQuestionCategorySchema.safeParse(category).success).toBe(true);
    }
  });

  it('rejects invalid categories', () => {
    const result = InterviewQuestionCategorySchema.safeParse('random');
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Component Schema Tests
// ============================================================================

describe('InterviewQuestionSchema', () => {
  const validQuestion = {
    id: 'q-123',
    index: 0,
    text: 'What is the main goal of this project?',
    category: 'scope',
    isRequired: false,
  };

  it('validates question with all required fields', () => {
    const result = InterviewQuestionSchema.safeParse(validQuestion);
    expect(result.success).toBe(true);
  });

  it('validates question with optional fields', () => {
    const questionWithOptionals = {
      ...validQuestion,
      context: 'This helps us understand scope',
      suggestedOptions: ['Option A', 'Option B'],
      exampleAnswer: 'An example answer here',
    };
    const result = InterviewQuestionSchema.safeParse(questionWithOptionals);
    expect(result.success).toBe(true);
  });

  it('rejects question with empty text', () => {
    const invalidQuestion = { ...validQuestion, text: '' };
    const result = InterviewQuestionSchema.safeParse(invalidQuestion);
    expect(result.success).toBe(false);
  });

  it('rejects question with negative index', () => {
    const invalidQuestion = { ...validQuestion, index: -1 };
    const result = InterviewQuestionSchema.safeParse(invalidQuestion);
    expect(result.success).toBe(false);
  });

  it('rejects question with invalid category', () => {
    const invalidQuestion = { ...validQuestion, category: 'invalid' };
    const result = InterviewQuestionSchema.safeParse(invalidQuestion);
    expect(result.success).toBe(false);
  });
});

describe('InterviewAnswerSchema', () => {
  const validAnswer = {
    questionId: 'q-123',
    questionIndex: 0,
    questionText: 'What is your goal?',
    answer: 'Build a web app',
    skipped: false,
    timestamp: '2026-01-25T12:00:00Z',
  };

  it('validates answer with all fields', () => {
    const result = InterviewAnswerSchema.safeParse(validAnswer);
    expect(result.success).toBe(true);
  });

  it('validates skipped answer with empty string', () => {
    const skippedAnswer = { ...validAnswer, answer: '', skipped: true };
    const result = InterviewAnswerSchema.safeParse(skippedAnswer);
    expect(result.success).toBe(true);
  });

  it('rejects answer with missing fields', () => {
    const incompleteAnswer = { questionId: 'q-123', answer: 'test' };
    const result = InterviewAnswerSchema.safeParse(incompleteAnswer);
    expect(result.success).toBe(false);
  });
});

describe('InterviewAssumptionSchema', () => {
  const validAssumption = {
    id: 'a-123',
    questionId: 'q-123',
    assumption: 'User wants a web application',
    reason: 'Question skipped',
    timestamp: '2026-01-25T12:00:00Z',
  };

  it('validates assumption with all fields', () => {
    const result = InterviewAssumptionSchema.safeParse(validAssumption);
    expect(result.success).toBe(true);
  });
});

describe('InterviewRiskSchema', () => {
  const validRisk = {
    id: 'r-123',
    description: 'Tight timeline',
    severity: 'high',
  };

  it('validates risk with required fields', () => {
    const result = InterviewRiskSchema.safeParse(validRisk);
    expect(result.success).toBe(true);
  });

  it('validates risk with optional mitigation', () => {
    const riskWithMitigation = { ...validRisk, mitigation: 'Add buffer time' };
    const result = InterviewRiskSchema.safeParse(riskWithMitigation);
    expect(result.success).toBe(true);
  });

  it('rejects risk with invalid severity', () => {
    const invalidRisk = { ...validRisk, severity: 'extreme' };
    const result = InterviewRiskSchema.safeParse(invalidRisk);
    expect(result.success).toBe(false);
  });
});

describe('ProjectBriefSchema', () => {
  const validBrief = {
    name: 'Test Project',
    summary: 'A test project for unit tests',
    goals: ['Goal 1', 'Goal 2'],
    techStack: ['TypeScript', 'React'],
    constraints: ['Budget limit'],
    assumptions: [],
    risks: [],
  };

  it('validates brief with required fields', () => {
    const result = ProjectBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
  });

  it('validates brief with optional fields', () => {
    const briefWithOptionals = {
      ...validBrief,
      timeline: '3 months',
      targetUsers: 'Developers',
    };
    const result = ProjectBriefSchema.safeParse(briefWithOptionals);
    expect(result.success).toBe(true);
  });

  it('validates brief with nested assumptions and risks', () => {
    const briefWithNested = {
      ...validBrief,
      assumptions: [{
        id: 'a-1',
        questionId: 'q-1',
        assumption: 'Test assumption',
        reason: 'Skipped',
        timestamp: '2026-01-25T12:00:00Z',
      }],
      risks: [{
        id: 'r-1',
        description: 'Test risk',
        severity: 'medium',
      }],
    };
    const result = ProjectBriefSchema.safeParse(briefWithNested);
    expect(result.success).toBe(true);
  });
});

describe('BacklogStorySchema', () => {
  const validStory = {
    title: 'Implement login',
    description: 'User should be able to log in',
    acceptanceCriteria: ['User can enter credentials', 'System validates user'],
    priority: 'high',
    isSetupTask: false,
  };

  it('validates story with required fields', () => {
    const result = BacklogStorySchema.safeParse(validStory);
    expect(result.success).toBe(true);
  });

  it('validates story with optional complexity', () => {
    const storyWithComplexity = { ...validStory, estimatedComplexity: 'medium' };
    const result = BacklogStorySchema.safeParse(storyWithComplexity);
    expect(result.success).toBe(true);
  });

  it('rejects story with empty title', () => {
    const invalidStory = { ...validStory, title: '' };
    const result = BacklogStorySchema.safeParse(invalidStory);
    expect(result.success).toBe(false);
  });

  it('rejects story with invalid priority', () => {
    const invalidStory = { ...validStory, priority: 'urgent' };
    const result = BacklogStorySchema.safeParse(invalidStory);
    expect(result.success).toBe(false);
  });

  it('rejects story with invalid complexity', () => {
    const invalidStory = { ...validStory, estimatedComplexity: 'extreme' };
    const result = BacklogStorySchema.safeParse(invalidStory);
    expect(result.success).toBe(false);
  });
});

describe('BacklogEpicSchema', () => {
  const validEpic = {
    name: 'Authentication',
    color: '#3b82f6',
    stories: [{
      title: 'Login',
      description: 'User login feature',
      acceptanceCriteria: ['Can login'],
      priority: 'high',
      isSetupTask: false,
    }],
  };

  it('validates epic with required fields', () => {
    const result = BacklogEpicSchema.safeParse(validEpic);
    expect(result.success).toBe(true);
  });

  it('validates epic with optional description', () => {
    const epicWithDesc = { ...validEpic, description: 'All auth features' };
    const result = BacklogEpicSchema.safeParse(epicWithDesc);
    expect(result.success).toBe(true);
  });

  it('validates epic with empty stories array', () => {
    const epicNoStories = { ...validEpic, stories: [] };
    const result = BacklogEpicSchema.safeParse(epicNoStories);
    expect(result.success).toBe(true);
  });

  it('rejects epic with empty name', () => {
    const invalidEpic = { ...validEpic, name: '' };
    const result = BacklogEpicSchema.safeParse(invalidEpic);
    expect(result.success).toBe(false);
  });

  it('rejects epic with invalid color format', () => {
    const invalidEpic = { ...validEpic, color: 'blue' };
    const result = BacklogEpicSchema.safeParse(invalidEpic);
    expect(result.success).toBe(false);
  });

  it('rejects epic with 3-char hex color', () => {
    const invalidEpic = { ...validEpic, color: '#fff' };
    const result = BacklogEpicSchema.safeParse(invalidEpic);
    expect(result.success).toBe(false);
  });

  it('accepts epic with uppercase hex color', () => {
    const epicUppercase = { ...validEpic, color: '#3B82F6' };
    const result = BacklogEpicSchema.safeParse(epicUppercase);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Main Interview State Tests
// ============================================================================

describe('InterviewStateSchema', () => {
  const validState = {
    stage: 'interview',
    osLanguage: 'en',
    detectedUserLanguage: null,
    techLevelMode: 'infer',
    userProfile: { level: 'mixed' },
    nQuestions: 5,
    currentIndex: 0,
    currentQuestion: null,
    projectName: 'Test Project',
    projectIdea: 'A test application',
    answers: [],
    assumptions: [],
    risks: [],
    projectBrief: null,
    backlogDraft: null,
    projectPath: '/path/to/project',
    createdAt: '2026-01-25T12:00:00Z',
    updatedAt: '2026-01-25T12:00:00Z',
  };

  it('validates complete state', () => {
    const result = InterviewStateSchema.safeParse(validState);
    expect(result.success).toBe(true);
  });

  it('validates state with current question', () => {
    const stateWithQuestion = {
      ...validState,
      currentQuestion: {
        id: 'q-1',
        index: 0,
        text: 'What is your goal?',
        category: 'scope',
        isRequired: false,
      },
    };
    const result = InterviewStateSchema.safeParse(stateWithQuestion);
    expect(result.success).toBe(true);
  });

  it('validates state with detected language', () => {
    const stateWithLang = { ...validState, detectedUserLanguage: 'es' };
    const result = InterviewStateSchema.safeParse(stateWithLang);
    expect(result.success).toBe(true);
  });

  it('validates state with answers array', () => {
    const stateWithAnswers = {
      ...validState,
      answers: [{
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'What is your goal?',
        answer: 'Build a web app',
        skipped: false,
        timestamp: '2026-01-25T12:00:00Z',
      }],
    };
    const result = InterviewStateSchema.safeParse(stateWithAnswers);
    expect(result.success).toBe(true);
  });

  it('rejects state with invalid stage', () => {
    const invalidState = { ...validState, stage: 'invalid' };
    const result = InterviewStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });

  it('rejects state with nQuestions out of range', () => {
    const invalidState = { ...validState, nQuestions: 15 };
    const result = InterviewStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });

  it('rejects state with nQuestions less than 1', () => {
    const invalidState = { ...validState, nQuestions: 0 };
    const result = InterviewStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });

  it('rejects state with negative currentIndex', () => {
    const invalidState = { ...validState, currentIndex: -1 };
    const result = InterviewStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Configuration Schema Tests
// ============================================================================

describe('InterviewConfigSchema', () => {
  it('validates config with required fields', () => {
    const config = {
      projectPath: '/path/to/project',
      osLanguage: 'en',
    };
    const result = InterviewConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('validates config with optional fields', () => {
    const config = {
      projectPath: '/path/to/project',
      osLanguage: 'es',
      depth: 'pro',
      techLevelMode: 'ask',
    };
    const result = InterviewConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects config with invalid depth', () => {
    const config = {
      projectPath: '/path/to/project',
      osLanguage: 'en',
      depth: 'invalid',
    };
    const result = InterviewConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('InterviewStreamUpdateSchema', () => {
  it('validates stream update', () => {
    const update = {
      type: 'question',
      content: 'What is your goal?',
      done: false,
    };
    const result = InterviewStreamUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('validates all stream types', () => {
    const types = ['question', 'options', 'example', 'brief', 'backlog'];
    for (const type of types) {
      const update = { type, content: 'test', done: true };
      expect(InterviewStreamUpdateSchema.safeParse(update).success).toBe(true);
    }
  });

  it('rejects stream update with invalid type', () => {
    const update = { type: 'invalid', content: 'test', done: false };
    const result = InterviewStreamUpdateSchema.safeParse(update);
    expect(result.success).toBe(false);
  });
});

describe('SubmitAnswerResultSchema', () => {
  const validState = {
    stage: 'interview',
    osLanguage: 'en',
    detectedUserLanguage: null,
    techLevelMode: 'infer',
    userProfile: { level: 'mixed' },
    nQuestions: 5,
    currentIndex: 1,
    currentQuestion: null,
    projectName: 'Test',
    projectIdea: 'Test idea',
    answers: [],
    assumptions: [],
    risks: [],
    projectBrief: null,
    backlogDraft: null,
    projectPath: '/path',
    createdAt: '2026-01-25T12:00:00Z',
    updatedAt: '2026-01-25T12:00:00Z',
  };

  it('validates result with no next question', () => {
    const result = {
      state: validState,
      nextQuestion: null,
      isComplete: true,
    };
    expect(SubmitAnswerResultSchema.safeParse(result).success).toBe(true);
  });

  it('validates result with next question', () => {
    const result = {
      state: validState,
      nextQuestion: {
        id: 'q-2',
        index: 1,
        text: 'Next question?',
        category: 'features',
        isRequired: false,
      },
      isComplete: false,
    };
    expect(SubmitAnswerResultSchema.safeParse(result).success).toBe(true);
  });
});

describe('CreateTasksResultSchema', () => {
  it('validates successful result', () => {
    const result = {
      success: true,
      taskCount: 10,
      setupTaskCount: 3,
      backlogTaskCount: 7,
    };
    expect(CreateTasksResultSchema.safeParse(result).success).toBe(true);
  });

  it('validates failed result with error', () => {
    const result = {
      success: false,
      taskCount: 0,
      setupTaskCount: 0,
      backlogTaskCount: 0,
      error: 'Failed to create tasks',
    };
    expect(CreateTasksResultSchema.safeParse(result).success).toBe(true);
  });

  it('rejects result with negative counts', () => {
    const result = {
      success: true,
      taskCount: -1,
      setupTaskCount: 0,
      backlogTaskCount: 0,
    };
    expect(CreateTasksResultSchema.safeParse(result).success).toBe(false);
  });
});
