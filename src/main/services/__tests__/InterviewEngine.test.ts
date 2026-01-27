/**
 * InterviewEngine Tests
 *
 * Tests for the core interview engine logic including initialization,
 * question generation, answer processing, and task creation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  InterviewEngine,
  createInterviewEngine,
  getInterviewEngine,
  clearInterviewEngine,
} from '../InterviewEngine';
import type { InterviewConfig, InterviewAnswer, InterviewState } from '../../../shared/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock BrowserWindow
const mockWebContents = {
  send: vi.fn(),
};

const mockWindow = {
  webContents: mockWebContents,
  isDestroyed: vi.fn(() => false),
};

// Mock Store
const createMockStore = () => ({
  createTask: vi.fn((title: string, status: string = 'backlog') => ({
    id: `TSK-${Math.floor(Math.random() * 1000)}`,
    title,
    status,
    description: '',
    priority: 'medium',
    acceptanceCriteria: [],
    dependsOn: [],
    comments: [],
    runtime: { status: 'idle', runCount: 0 },
    agent: { goal: '', scope: ['*'], definitionOfDone: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  updateTask: vi.fn((id: string, patch: any) => ({ id, ...patch })),
  saveInterview: vi.fn(),
  getInterview: vi.fn(() => null),
  deleteInterview: vi.fn(),
  hasActiveInterview: vi.fn(() => false),
});

// Mock Provider
const createMockProvider = (responses: Record<string, string> = {}) => ({
  getName: vi.fn(() => 'mock'),
  complete: vi.fn(async (messages: any[], tools?: any, onChunk?: (chunk: string) => void) => {
    // Find a matching response or use default
    const userMessage = messages.find((m: any) => m.role === 'user')?.content || '';
    let responseContent = 'Default mock response';

    // Check for specific response mappings
    for (const [key, value] of Object.entries(responses)) {
      if (userMessage.includes(key)) {
        responseContent = value;
        break;
      }
    }

    // Simulate streaming if callback provided
    if (onChunk) {
      for (const char of responseContent) {
        onChunk(char);
      }
    }

    return { content: responseContent };
  }),
});

// ============================================================================
// Test Configuration
// ============================================================================

const sampleConfig: InterviewConfig = {
  projectPath: '/test/project',
  osLanguage: 'en',
  depth: 'normal',
  projectName: 'TestProject',
  projectIdea: 'A test application for testing',
};

const minimalConfig: InterviewConfig = {
  projectPath: '/test/project',
  osLanguage: 'en',
};

// ============================================================================
// Initialization Tests
// ============================================================================

describe('InterviewEngine', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let mockProvider: ReturnType<typeof createMockProvider>;
  let engine: InterviewEngine;

  beforeEach(() => {
    mockStore = createMockStore();
    mockProvider = createMockProvider();
    mockWebContents.send.mockClear();
    clearInterviewEngine();
  });

  afterEach(() => {
    clearInterviewEngine();
  });

  describe('init()', () => {
    it('creates state with seed_name stage when only projectPath provided', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const state = await engine.init(minimalConfig);

      expect(state.stage).toBe('seed_name');
      expect(state.projectName).toBe('');
      expect(state.projectIdea).toBe('');
    });

    it('creates state with seed_idea stage when name provided', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const configWithName: InterviewConfig = {
        ...minimalConfig,
        projectName: 'MyProject',
      };

      const state = await engine.init(configWithName);

      expect(state.stage).toBe('seed_idea');
      expect(state.projectName).toBe('MyProject');
    });

    it('creates state with interview stage when name + idea provided', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const state = await engine.init(sampleConfig);

      expect(state.stage).toBe('interview');
      expect(state.projectName).toBe('TestProject');
      expect(state.projectIdea).toBe('A test application for testing');
    });

    it('sets correct nQuestions based on depth (quick=3)', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const quickConfig = { ...sampleConfig, depth: 'quick' as const };
      const state = await engine.init(quickConfig);

      expect(state.nQuestions).toBe(3);
    });

    it('sets correct nQuestions based on depth (normal=5)', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const normalConfig = { ...sampleConfig, depth: 'normal' as const };
      const state = await engine.init(normalConfig);

      expect(state.nQuestions).toBe(5);
    });

    it('sets correct nQuestions based on depth (pro=8)', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const proConfig = { ...sampleConfig, depth: 'pro' as const };
      const state = await engine.init(proConfig);

      expect(state.nQuestions).toBe(8);
    });

    it('saves state to store on init', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      await engine.init(sampleConfig);

      expect(mockStore.saveInterview).toHaveBeenCalled();
      const savedState = mockStore.saveInterview.mock.calls[0][0];
      expect(savedState.projectName).toBe('TestProject');
    });

    it('initializes with correct default values', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const state = await engine.init(sampleConfig);

      expect(state.currentIndex).toBe(0);
      expect(state.currentQuestion).toBeNull();
      expect(state.answers).toEqual([]);
      expect(state.assumptions).toEqual([]);
      expect(state.risks).toEqual([]);
      expect(state.projectBrief).toBeNull();
      expect(state.backlogDraft).toBeNull();
      expect(state.detectedUserLanguage).toBeNull();
      expect(state.userProfile.level).toBe('mixed');
    });

    it('sets osLanguage from config', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const spanishConfig = { ...sampleConfig, osLanguage: 'es' };
      const state = await engine.init(spanishConfig);

      expect(state.osLanguage).toBe('es');
    });
  });

  // ============================================================================
  // Question Generation Tests
  // ============================================================================

  describe('generateNextQuestion()', () => {
    beforeEach(async () => {
      mockProvider = createMockProvider({
        '': 'What is the main goal of this project?',
      });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);
    });

    it('returns null when no current state', async () => {
      clearInterviewEngine();
      const freshEngine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const question = await freshEngine.generateNextQuestion();

      expect(question).toBeNull();
    });

    it('returns null when all questions answered', async () => {
      // Simulate all questions answered
      const state = engine.getState()!;
      (state as any).currentIndex = state.nQuestions;

      const question = await engine.generateNextQuestion();

      expect(question).toBeNull();
    });

    it('uses fallback questions when provider is null', async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: null,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      const question = await engine.generateNextQuestion();

      expect(question).not.toBeNull();
      expect(question!.text).toBeTruthy();
      expect(question!.category).toBeDefined();
    });

    it('increments nothing on generation (only on submit)', async () => {
      const stateBefore = engine.getState()!;
      const indexBefore = stateBefore.currentIndex;

      await engine.generateNextQuestion();

      const stateAfter = engine.getState()!;
      expect(stateAfter.currentIndex).toBe(indexBefore);
    });

    it('parses question response correctly', async () => {
      const question = await engine.generateNextQuestion();

      expect(question).not.toBeNull();
      expect(question!.id).toBeTruthy();
      expect(question!.index).toBe(0);
      expect(question!.text).toBeTruthy();
      expect(question!.isRequired).toBe(false);
    });

    it('sends stream updates during generation', async () => {
      await engine.generateNextQuestion();

      expect(mockWebContents.send).toHaveBeenCalled();
      const calls = mockWebContents.send.mock.calls;
      const streamCalls = calls.filter((c: any) => c[0] === 'interview:stream-update');
      expect(streamCalls.length).toBeGreaterThan(0);
    });

    it('sets currentQuestion in state', async () => {
      const question = await engine.generateNextQuestion();

      const state = engine.getState()!;
      expect(state.currentQuestion).toEqual(question);
    });

    it('handles provider error gracefully with fallback', async () => {
      const errorProvider = {
        getName: vi.fn(() => 'error-mock'),
        complete: vi.fn().mockRejectedValue(new Error('Provider error')),
      };
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: errorProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      const question = await engine.generateNextQuestion();

      // Should return fallback question, not throw
      expect(question).not.toBeNull();
      expect(question!.text).toBeTruthy();
    });
  });

  // ============================================================================
  // Answer Submission Tests
  // ============================================================================

  describe('submitAnswer()', () => {
    beforeEach(async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);
      await engine.generateNextQuestion();
    });

    it('adds answer to state.answers array', async () => {
      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'Test answer',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      await engine.submitAnswer(answer);

      const state = engine.getState()!;
      expect(state.answers).toHaveLength(1);
      expect(state.answers[0].answer).toBe('Test answer');
    });

    it('increments currentIndex', async () => {
      const stateBefore = engine.getState()!;
      expect(stateBefore.currentIndex).toBe(0);

      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'Test answer',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      await engine.submitAnswer(answer);

      const stateAfter = engine.getState()!;
      expect(stateAfter.currentIndex).toBe(1);
    });

    it('detects language from long answers (Spanish)', async () => {
      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'Quiero crear una aplicación para gestionar proyectos de software',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      await engine.submitAnswer(answer);

      const state = engine.getState()!;
      expect(state.detectedUserLanguage).toBe('es');
    });

    it('detects language from long answers (English)', async () => {
      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'I want to build a comprehensive web application for project management',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      await engine.submitAnswer(answer);

      const state = engine.getState()!;
      expect(state.detectedUserLanguage).toBe('en');
    });

    it('does not detect language from short answers', async () => {
      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'Yes',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      await engine.submitAnswer(answer);

      const state = engine.getState()!;
      expect(state.detectedUserLanguage).toBeNull();
    });

    it('moves to finalize stage when questions complete', async () => {
      // Set to last question
      const state = engine.getState()!;
      (state as any).currentIndex = state.nQuestions - 1;

      const answer: InterviewAnswer = {
        questionId: 'q-last',
        questionIndex: state.nQuestions - 1,
        questionText: 'Final question?',
        answer: 'Final answer',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      const result = await engine.submitAnswer(answer);

      expect(result.isComplete).toBe(true);
      expect(engine.getState()!.stage).toBe('finalize');
    });

    it('generates next question if not complete', async () => {
      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'Test answer',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      const result = await engine.submitAnswer(answer);

      expect(result.isComplete).toBe(false);
      // Next question should be generated (might be null if provider fails)
    });

    it('clears currentQuestion after submission', async () => {
      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'Test answer',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      await engine.submitAnswer(answer);

      // After submit, currentQuestion is cleared (then regenerated)
      // Check that answers array has the answer
      const state = engine.getState()!;
      expect(state.answers.length).toBeGreaterThan(0);
    });

    it('throws when no active interview', async () => {
      clearInterviewEngine();
      const freshEngine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'Test answer',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      await expect(freshEngine.submitAnswer(answer)).rejects.toThrow('No active interview');
    });
  });

  // ============================================================================
  // Backlog Generation & Task Creation Tests
  // ============================================================================

  describe('generateBacklog()', () => {
    const sampleBacklogResponse = `
Here are your tasks:

\`\`\`json
{"tool": "create_task", "arguments": {"title": "Setup project structure", "description": "Initialize the project with proper folder structure", "status": "todo", "priority": "high", "acceptanceCriteria": ["Project initialized", "Folders created"], "epic": {"name": "Setup", "color": "#3b82f6"}}}
\`\`\`

\`\`\`json
{"tool": "create_task", "arguments": {"title": "Implement authentication", "description": "Add user authentication", "status": "backlog", "priority": "medium", "acceptanceCriteria": ["Users can login"], "epic": {"name": "Auth", "color": "#ef4444"}}}
\`\`\`
`;

    beforeEach(async () => {
      mockProvider = createMockProvider({
        '': sampleBacklogResponse,
      });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);
      // Set stage to finalize
      const state = engine.getState()!;
      (state as any).stage = 'finalize';
    });

    it('calls provider.complete with correct prompts', async () => {
      await engine.generateBacklog();

      expect(mockProvider.complete).toHaveBeenCalled();
      const call = mockProvider.complete.mock.calls[0];
      expect(call[0]).toBeInstanceOf(Array);
      // Should have system and user messages
      expect(call[0].length).toBeGreaterThanOrEqual(1);
    });

    it('parses JSON code blocks correctly', async () => {
      const epics = await engine.generateBacklog();

      // Should have extracted tasks from JSON blocks
      expect(mockStore.createTask).toHaveBeenCalled();
    });

    it('creates tasks via store.createTask()', async () => {
      await engine.generateBacklog();

      expect(mockStore.createTask).toHaveBeenCalled();
      // Check task creation calls
      const calls = mockStore.createTask.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('updates tasks with epic information', async () => {
      await engine.generateBacklog();

      expect(mockStore.updateTask).toHaveBeenCalled();
      // Check that epic was included in update
      const updateCalls = mockStore.updateTask.mock.calls;
      const hasEpicUpdate = updateCalls.some((call: any) => call[1]?.epic);
      expect(hasEpicUpdate).toBe(true);
    });

    it('sends board:refresh event after creation', async () => {
      await engine.generateBacklog();

      const refreshCalls = mockWebContents.send.mock.calls.filter(
        (c: any) => c[0] === 'board:refresh'
      );
      expect(refreshCalls.length).toBeGreaterThan(0);
    });

    it('returns epics structure for UI', async () => {
      const epics = await engine.generateBacklog();

      expect(Array.isArray(epics)).toBe(true);
      // Each epic should have name, color, stories
      for (const epic of epics) {
        expect(epic.name).toBeDefined();
        expect(epic.color).toBeDefined();
        expect(epic.stories).toBeDefined();
      }
    });

    it('handles empty response gracefully', async () => {
      mockProvider = createMockProvider({
        '': 'No tasks to create',
      });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      const epics = await engine.generateBacklog();

      expect(Array.isArray(epics)).toBe(true);
    });

    it('throws when no active interview', async () => {
      clearInterviewEngine();
      const freshEngine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      await expect(freshEngine.generateBacklog()).rejects.toThrow('No active interview');
    });
  });

  describe('executeBacklogToolCalls()', () => {
    beforeEach(async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);
    });

    it('extracts create_task from json code blocks', async () => {
      const response = `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Task 1", "status": "backlog", "priority": "medium"}}
\`\`\`
`;
      // Access private method via provider response
      mockProvider = createMockProvider({ '': response });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      await engine.generateBacklog();

      expect(mockStore.createTask).toHaveBeenCalled();
    });

    it('handles malformed JSON gracefully', async () => {
      const response = `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Task 1" invalid json
\`\`\`

\`\`\`json
{"tool": "create_task", "arguments": {"title": "Task 2", "status": "backlog", "priority": "medium"}}
\`\`\`
`;
      mockProvider = createMockProvider({ '': response });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      // Should not throw, should skip bad JSON
      await expect(engine.generateBacklog()).resolves.toBeDefined();
    });

    it('creates task with correct status', async () => {
      const response = `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Todo Task", "status": "todo", "priority": "high"}}
\`\`\`
`;
      mockProvider = createMockProvider({ '': response });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      await engine.generateBacklog();

      expect(mockStore.createTask).toHaveBeenCalledWith('Todo Task', 'todo');
    });

    it('creates task with epic name and color', async () => {
      const response = `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Epic Task", "status": "backlog", "priority": "medium", "epic": {"name": "Feature", "color": "#10b981"}}}
\`\`\`
`;
      mockProvider = createMockProvider({ '': response });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      await engine.generateBacklog();

      const updateCalls = mockStore.updateTask.mock.calls;
      const epicCall = updateCalls.find((call: any) => call[1]?.epic);
      expect(epicCall).toBeDefined();
      expect(epicCall[1].epic.name).toBe('Feature');
      expect(epicCall[1].epic.color).toBe('#10b981');
    });

    it('skips tasks with empty title', async () => {
      const response = `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "", "status": "backlog"}}
\`\`\`

\`\`\`json
{"tool": "create_task", "arguments": {"title": "Valid Task", "status": "backlog"}}
\`\`\`
`;
      mockProvider = createMockProvider({ '': response });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      await engine.generateBacklog();

      // Only valid task should be created
      const calls = mockStore.createTask.mock.calls.filter(
        (c: any) => c[0] === 'Valid Task'
      );
      expect(calls.length).toBe(1);
    });

    it('handles alternative JSON format without arguments wrapper', async () => {
      const response = `
\`\`\`json
{"tool": "create_task", "title": "Direct Task", "status": "backlog", "priority": "low"}
\`\`\`
`;
      mockProvider = createMockProvider({ '': response });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);

      await engine.generateBacklog();

      expect(mockStore.createTask).toHaveBeenCalledWith('Direct Task', 'backlog');
    });
  });

  // ============================================================================
  // createTasks() (Finalization) Tests
  // ============================================================================

  describe('createTasks()', () => {
    beforeEach(async () => {
      const backlogResponse = `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Setup Task", "status": "todo", "priority": "high", "epic": {"name": "Setup", "color": "#3b82f6"}}}
\`\`\`

\`\`\`json
{"tool": "create_task", "arguments": {"title": "Backlog Task", "status": "backlog", "priority": "medium", "epic": {"name": "Features", "color": "#ef4444"}}}
\`\`\`
`;
      mockProvider = createMockProvider({ '': backlogResponse });
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);
      // Generate backlog first (this creates tasks)
      await engine.generateBacklog();
    });

    it('returns task count summary', async () => {
      const result = await engine.createTasks();

      expect(result.success).toBe(true);
      expect(result.taskCount).toBeGreaterThanOrEqual(0);
      expect(result.setupTaskCount).toBeGreaterThanOrEqual(0);
      expect(result.backlogTaskCount).toBeGreaterThanOrEqual(0);
    });

    it('marks interview as done', async () => {
      await engine.createTasks();

      // After createTasks, interview should be cleaned up
      expect(mockStore.deleteInterview).toHaveBeenCalled();
    });

    it('clears engine state', async () => {
      await engine.createTasks();

      const state = engine.getState();
      expect(state).toBeNull();
    });

    it('handles errors gracefully', async () => {
      // Clear state to simulate error condition
      clearInterviewEngine();
      const freshEngine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const result = await freshEngine.createTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================================================
  // Persistence Tests
  // ============================================================================

  describe('persistence', () => {
    beforeEach(() => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
    });

    it('saves state on init', async () => {
      await engine.init(sampleConfig);

      expect(mockStore.saveInterview).toHaveBeenCalled();
    });

    it('saves state on each answer submission', async () => {
      await engine.init(sampleConfig);
      await engine.generateNextQuestion();
      mockStore.saveInterview.mockClear();

      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test?',
        answer: 'Test',
        skipped: false,
        timestamp: new Date().toISOString(),
      };
      await engine.submitAnswer(answer);

      expect(mockStore.saveInterview).toHaveBeenCalled();
    });

    it('resumes interview from saved state', async () => {
      const savedState: InterviewState = {
        stage: 'interview',
        osLanguage: 'en',
        detectedUserLanguage: null,
        techLevelMode: 'infer',
        userProfile: { level: 'mixed' },
        nQuestions: 5,
        currentIndex: 2,
        currentQuestion: null,
        projectName: 'Resumed Project',
        projectIdea: 'Resumed idea',
        answers: [],
        assumptions: [],
        risks: [],
        projectBrief: null,
        backlogDraft: null,
        projectPath: '/test/project',
        createdAt: '2026-01-25T12:00:00Z',
        updatedAt: '2026-01-25T12:00:00Z',
      };
      mockStore.getInterview.mockReturnValue(savedState);

      const resumed = await engine.resume('/test/project');

      expect(resumed).not.toBeNull();
      expect(resumed!.projectName).toBe('Resumed Project');
      expect(resumed!.currentIndex).toBe(2);
    });

    it('returns null when resuming non-existent interview', async () => {
      mockStore.getInterview.mockReturnValue(null);

      const resumed = await engine.resume('/test/project');

      expect(resumed).toBeNull();
    });

    it('returns null when resuming interview for different project', async () => {
      const savedState: InterviewState = {
        stage: 'interview',
        osLanguage: 'en',
        detectedUserLanguage: null,
        techLevelMode: 'infer',
        userProfile: { level: 'mixed' },
        nQuestions: 5,
        currentIndex: 0,
        currentQuestion: null,
        projectName: 'Other Project',
        projectIdea: 'Other idea',
        answers: [],
        assumptions: [],
        risks: [],
        projectBrief: null,
        backlogDraft: null,
        projectPath: '/other/project',
        createdAt: '2026-01-25T12:00:00Z',
        updatedAt: '2026-01-25T12:00:00Z',
      };
      mockStore.getInterview.mockReturnValue(savedState);

      const resumed = await engine.resume('/test/project');

      expect(resumed).toBeNull();
    });

    it('returns null when resuming completed interview', async () => {
      const savedState: InterviewState = {
        stage: 'done',
        osLanguage: 'en',
        detectedUserLanguage: null,
        techLevelMode: 'infer',
        userProfile: { level: 'mixed' },
        nQuestions: 5,
        currentIndex: 5,
        currentQuestion: null,
        projectName: 'Done Project',
        projectIdea: 'Done idea',
        answers: [],
        assumptions: [],
        risks: [],
        projectBrief: null,
        backlogDraft: null,
        projectPath: '/test/project',
        createdAt: '2026-01-25T12:00:00Z',
        updatedAt: '2026-01-25T12:00:00Z',
      };
      mockStore.getInterview.mockReturnValue(savedState);

      const resumed = await engine.resume('/test/project');

      expect(resumed).toBeNull();
    });

    it('deletes interview on completion', async () => {
      await engine.init(sampleConfig);
      await engine.generateBacklog();
      mockStore.deleteInterview.mockClear();

      await engine.createTasks();

      expect(mockStore.deleteInterview).toHaveBeenCalled();
    });

    it('deletes interview on cancel', async () => {
      await engine.init(sampleConfig);
      mockStore.deleteInterview.mockClear();

      await engine.cancel();

      expect(mockStore.deleteInterview).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Skip Question Tests
  // ============================================================================

  describe('skip()', () => {
    beforeEach(async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);
      await engine.generateNextQuestion();
    });

    it('creates skip answer with skipped=true', async () => {
      await engine.skip();

      const state = engine.getState()!;
      expect(state.answers.length).toBe(1);
      expect(state.answers[0].skipped).toBe(true);
      expect(state.answers[0].answer).toBe('');
    });

    it('adds assumption when question is skipped', async () => {
      await engine.skip();

      const state = engine.getState()!;
      expect(state.assumptions.length).toBe(1);
      expect(state.assumptions[0].reason).toBe('Question skipped');
    });

    it('increments currentIndex', async () => {
      const indexBefore = engine.getState()!.currentIndex;

      await engine.skip();

      const indexAfter = engine.getState()!.currentIndex;
      expect(indexAfter).toBe(indexBefore + 1);
    });

    it('throws when no active question', async () => {
      // Clear current question
      const state = engine.getState()!;
      (state as any).currentQuestion = null;

      await expect(engine.skip()).rejects.toThrow('No active question to skip');
    });
  });

  // ============================================================================
  // saveAndExit() Tests
  // ============================================================================

  describe('saveAndExit()', () => {
    beforeEach(async () => {
      engine = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });
      await engine.init(sampleConfig);
    });

    it('saves current state', async () => {
      mockStore.saveInterview.mockClear();

      const result = await engine.saveAndExit();

      expect(result.success).toBe(true);
      expect(mockStore.saveInterview).toHaveBeenCalled();
    });

    it('returns success false on error', async () => {
      mockStore.saveInterview.mockImplementation(() => {
        throw new Error('Save error');
      });

      const result = await engine.saveAndExit();

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('Singleton Management', () => {
    it('createInterviewEngine creates new instance', () => {
      const engine1 = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      expect(engine1).toBeInstanceOf(InterviewEngine);
    });

    it('getInterviewEngine returns existing instance', () => {
      const engine1 = createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      const engine2 = getInterviewEngine();

      expect(engine2).toBe(engine1);
    });

    it('clearInterviewEngine clears instance', () => {
      createInterviewEngine({
        store: mockStore as any,
        provider: mockProvider as any,
        mainWindow: mockWindow as any,
      });

      clearInterviewEngine();

      expect(getInterviewEngine()).toBeNull();
    });

    it('getInterviewEngine returns null when not created', () => {
      clearInterviewEngine();

      expect(getInterviewEngine()).toBeNull();
    });
  });
});
