/**
 * Interview Handlers Tests
 *
 * Tests for the IPC handlers that bridge the interview engine with the renderer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain, BrowserWindow, app } from 'electron';
import { registerInterviewHandlers } from '../interviewHandlers';
import { clearInterviewEngine } from '../../../services/InterviewEngine';
import type { InterviewConfig, InterviewAnswer } from '../../../../shared/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Track registered handlers
const registeredHandlers = new Map<string, Function>();

// Mock ipcMain to capture handlers
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler);
    }),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(() => mockWindow),
  },
  app: {
    getLocale: vi.fn(() => 'en-US'),
  },
}));

// Mock shared module
vi.mock('../shared', () => ({
  getStore: vi.fn(() => mockStore),
  getOrCreateProvider: vi.fn(() => mockProvider),
  hasProject: vi.fn(() => true),
}));

// Mock window
const mockWebContents = {
  send: vi.fn(),
};

const mockWindow = {
  webContents: mockWebContents,
  isDestroyed: vi.fn(() => false),
};

// Mock store
const mockStore = {
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
};

// Mock provider
const mockProvider = {
  getName: vi.fn(() => 'mock'),
  complete: vi.fn(async () => ({
    content: 'What is the main goal of this project?',
  })),
};

// Helper to invoke a registered handler
async function invokeHandler(channel: string, ...args: any[]) {
  const handler = registeredHandlers.get(channel);
  if (!handler) {
    throw new Error(`Handler not registered: ${channel}`);
  }

  // Create mock event
  const event = {
    sender: mockWebContents,
  };

  return handler(event, ...args);
}

// ============================================================================
// Tests
// ============================================================================

describe('interviewHandlers', () => {
  beforeEach(() => {
    registeredHandlers.clear();
    vi.clearAllMocks();
    clearInterviewEngine();
  });

  afterEach(() => {
    clearInterviewEngine();
  });

  describe('Handler Registration', () => {
    it('registers all handlers on ipcMain', () => {
      registerInterviewHandlers();

      const expectedChannels = [
        'interview:init',
        'interview:resume',
        'interview:nextQuestion',
        'interview:submitAnswer',
        'interview:getOptions',
        'interview:skip',
        'interview:getExample',
        'interview:generateBrief',
        'interview:generateBacklog',
        'interview:createTasks',
        'interview:saveAndExit',
        'interview:cancel',
        'interview:getLocale',
        'interview:isActive',
      ];

      for (const channel of expectedChannels) {
        expect(registeredHandlers.has(channel)).toBe(true);
      }
    });
  });

  describe('interview:init', () => {
    beforeEach(() => {
      registerInterviewHandlers();
    });

    it('creates engine and returns initial state', async () => {
      const config: InterviewConfig = {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test Project',
        projectIdea: 'A test application',
        depth: 'normal',
      };

      const state = await invokeHandler('interview:init', config);

      expect(state).toBeDefined();
      expect(state.projectName).toBe('Test Project');
      expect(state.projectIdea).toBe('A test application');
      expect(state.stage).toBe('interview');
    });

    it('sets nQuestions based on depth', async () => {
      const config: InterviewConfig = {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test',
        depth: 'pro',
      };

      const state = await invokeHandler('interview:init', config);

      expect(state.nQuestions).toBe(8);
    });
  });

  describe('interview:resume', () => {
    beforeEach(() => {
      registerInterviewHandlers();
    });

    it('returns null when no saved interview', async () => {
      mockStore.getInterview.mockReturnValue(null);

      const result = await invokeHandler('interview:resume', '/test/project');

      expect(result).toBeNull();
    });

    it('returns saved state when interview exists', async () => {
      const savedState = {
        stage: 'interview',
        projectPath: '/test/project',
        projectName: 'Saved Project',
        osLanguage: 'en',
        detectedUserLanguage: null,
        techLevelMode: 'infer',
        userProfile: { level: 'mixed' },
        nQuestions: 5,
        currentIndex: 2,
        currentQuestion: null,
        projectIdea: 'Test',
        answers: [],
        assumptions: [],
        risks: [],
        projectBrief: null,
        backlogDraft: null,
        createdAt: '2026-01-25T12:00:00Z',
        updatedAt: '2026-01-25T12:00:00Z',
      };
      mockStore.getInterview.mockReturnValue(savedState);

      // First init to create engine
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
      });

      const result = await invokeHandler('interview:resume', '/test/project');

      expect(result).toBeDefined();
      expect(result?.projectName).toBe('Saved Project');
    });
  });

  describe('interview:nextQuestion', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
        depth: 'normal',
      });
    });

    it('returns generated question', async () => {
      const question = await invokeHandler('interview:nextQuestion');

      expect(question).toBeDefined();
      expect(question.id).toBeTruthy();
      expect(question.text).toBeTruthy();
    });

    it('returns null on error', async () => {
      // Clear engine to simulate error
      clearInterviewEngine();

      const question = await invokeHandler('interview:nextQuestion');

      // Should return null instead of throwing
      expect(question).toBeNull();
    });
  });

  describe('interview:submitAnswer', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
        depth: 'normal',
      });
      await invokeHandler('interview:nextQuestion');
    });

    it('returns result with updated state', async () => {
      const answer: InterviewAnswer = {
        questionId: 'q-1',
        questionIndex: 0,
        questionText: 'Test question?',
        answer: 'My answer',
        skipped: false,
        timestamp: new Date().toISOString(),
      };

      const result = await invokeHandler('interview:submitAnswer', answer);

      expect(result).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.state.answers.length).toBe(1);
    });
  });

  describe('interview:skip', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
        depth: 'normal',
      });
      await invokeHandler('interview:nextQuestion');
    });

    it('skips current question', async () => {
      const state = await invokeHandler('interview:skip');

      expect(state).toBeDefined();
      expect(state.answers.length).toBe(1);
      expect(state.answers[0].skipped).toBe(true);
    });
  });

  describe('interview:generateBrief', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
        depth: 'quick',
      });
    });

    it('returns generated brief', async () => {
      // Configure mock provider for brief response
      mockProvider.complete.mockResolvedValueOnce({
        content: JSON.stringify({
          name: 'Test',
          summary: 'A test project',
          goals: ['Goal 1'],
          techStack: ['TypeScript'],
          constraints: [],
          assumptions: [],
          risks: [],
        }),
      });

      const brief = await invokeHandler('interview:generateBrief');

      expect(brief).toBeDefined();
      expect(brief.name).toBeDefined();
    });
  });

  describe('interview:generateBacklog', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
        depth: 'quick',
      });
    });

    it('returns epics array', async () => {
      mockProvider.complete.mockResolvedValueOnce({
        content: `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Task 1", "status": "backlog", "priority": "medium", "epic": {"name": "Setup", "color": "#3b82f6"}}}
\`\`\`
`,
      });

      const epics = await invokeHandler('interview:generateBacklog');

      expect(Array.isArray(epics)).toBe(true);
    });

    it('handles provider errors', async () => {
      mockProvider.complete.mockRejectedValueOnce(new Error('Provider error'));

      // Should not throw, should return empty array
      await expect(invokeHandler('interview:generateBacklog')).resolves.toBeDefined();
    });
  });

  describe('interview:createTasks', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
        depth: 'quick',
      });
      mockProvider.complete.mockResolvedValueOnce({
        content: `
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Task 1", "status": "backlog", "priority": "medium"}}
\`\`\`
`,
      });
      await invokeHandler('interview:generateBacklog');
    });

    it('returns task count summary', async () => {
      const result = await invokeHandler('interview:createTasks', '/test/project');

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.taskCount).toBeDefined();
    });

    it('handles errors gracefully', async () => {
      // Clear engine to simulate error
      clearInterviewEngine();

      const result = await invokeHandler('interview:createTasks', '/test/project');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('interview:saveAndExit', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
      });
    });

    it('returns success status', async () => {
      const result = await invokeHandler('interview:saveAndExit');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('interview:cancel', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
      });
    });

    it('returns success and clears engine', async () => {
      const result = await invokeHandler('interview:cancel');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockStore.deleteInterview).toHaveBeenCalled();
    });
  });

  describe('interview:getLocale', () => {
    beforeEach(() => {
      registerInterviewHandlers();
    });

    it('returns OS locale language code', async () => {
      (app.getLocale as any).mockReturnValue('es-ES');

      const locale = await invokeHandler('interview:getLocale');

      expect(locale).toBe('es');
    });

    it('returns en for English locales', async () => {
      (app.getLocale as any).mockReturnValue('en-US');

      const locale = await invokeHandler('interview:getLocale');

      expect(locale).toBe('en');
    });

    it('handles locale without region', async () => {
      (app.getLocale as any).mockReturnValue('fr');

      const locale = await invokeHandler('interview:getLocale');

      expect(locale).toBe('fr');
    });
  });

  describe('interview:isActive', () => {
    beforeEach(() => {
      registerInterviewHandlers();
    });

    it('returns false when no project is open', async () => {
      const { hasProject } = await import('../shared');
      (hasProject as any).mockReturnValue(false);

      const isActive = await invokeHandler('interview:isActive');

      expect(isActive).toBe(false);
    });

    it('returns false when no active interview', async () => {
      const { hasProject } = await import('../shared');
      (hasProject as any).mockReturnValue(true);
      mockStore.hasActiveInterview.mockReturnValue(false);

      const isActive = await invokeHandler('interview:isActive');

      expect(isActive).toBe(false);
    });

    it('returns true when interview is active', async () => {
      const { hasProject } = await import('../shared');
      (hasProject as any).mockReturnValue(true);
      mockStore.hasActiveInterview.mockReturnValue(true);

      const isActive = await invokeHandler('interview:isActive');

      expect(isActive).toBe(true);
    });
  });

  describe('interview:getOptions', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
      });
      await invokeHandler('interview:nextQuestion');
    });

    it('returns options array', async () => {
      mockProvider.complete.mockResolvedValueOnce({
        content: '["Option 1", "Option 2", "Option 3"]',
      });

      const options = await invokeHandler('interview:getOptions');

      expect(Array.isArray(options)).toBe(true);
    });
  });

  describe('interview:getExample', () => {
    beforeEach(async () => {
      registerInterviewHandlers();
      await invokeHandler('interview:init', {
        projectPath: '/test/project',
        osLanguage: 'en',
        projectName: 'Test',
        projectIdea: 'Test idea',
      });
      await invokeHandler('interview:nextQuestion');
    });

    it('returns example answer', async () => {
      mockProvider.complete.mockResolvedValueOnce({
        content: 'Here is an example answer for your question.',
      });

      const example = await invokeHandler('interview:getExample');

      expect(typeof example).toBe('string');
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('interviewHandlers Error Handling', () => {
  beforeEach(() => {
    registeredHandlers.clear();
    vi.clearAllMocks();
    clearInterviewEngine();
  });

  it('throws error when store not initialized', async () => {
    const { getStore } = await import('../shared');
    (getStore as any).mockImplementation(() => {
      throw new Error('Store not initialized');
    });

    registerInterviewHandlers();

    await expect(
      invokeHandler('interview:init', {
        projectPath: '/test',
        osLanguage: 'en',
      })
    ).rejects.toThrow('Store not initialized');
  });

  it('reuses existing engine instance', async () => {
    const { getStore } = await import('../shared');
    (getStore as any).mockReturnValue(mockStore);

    registerInterviewHandlers();

    // Initialize twice
    await invokeHandler('interview:init', {
      projectPath: '/test',
      osLanguage: 'en',
      projectName: 'First',
      projectIdea: 'First idea',
    });

    const state1 = await invokeHandler('interview:init', {
      projectPath: '/test',
      osLanguage: 'en',
      projectName: 'Second',
      projectIdea: 'Second idea',
    });

    // Second init should create new state
    expect(state1.projectName).toBe('Second');
  });
});
