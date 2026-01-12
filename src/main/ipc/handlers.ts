/**
 * IPC Handlers
 *
 * All IPC handlers for communication between main and renderer processes.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { LocalKanbanStore, initStore, getStore } from '../services/LocalKanbanStore';
import { getCommentService } from '../services/CommentService';
import { AgentRuntime } from '../agent/AgentRuntime';
import { initRalphEngine, getRalphEngine } from '../agent/RalphEngine';
import { Runner } from '../agent/tools/Runner';
import { AgentProvider, MockAgentProvider, AGENT_TOOLS } from '../agent/AgentProvider';
import { AnthropicProvider } from '../agent/providers/AnthropicProvider';
import { ClaudeCodeProvider } from '../agent/providers/ClaudeCodeProvider';
import type {
  Board,
  Task,
  AgentState,
  TaskComment,
  TaskStatus,
  TaskPatch,
  RunTaskOptions,
  RalphModeOptions,
  AgentRun,
  ProjectContext,
  RepoIndex,
  Policy,
  Chat,
  ChatMessage,
  AgentMessage,
} from '../../shared/types';

let store: LocalKanbanStore | null = null;
let runtime: AgentRuntime | null = null;
let runner: Runner | null = null;
let agentProvider: AgentProvider | null = null;

// Provider type for configuration
type ProviderType = 'mock' | 'anthropic' | 'claude-code';

// Store project root for ClaudeCodeProvider
let projectRoot: string = process.cwd();

/**
 * Initialize or get the agent provider based on configuration.
 * Default: ClaudeCodeProvider (uses Claude Code CLI)
 */
function getOrCreateProvider(): AgentProvider {
  if (agentProvider && agentProvider.isReady()) {
    return agentProvider;
  }

  // Default to Claude Code provider (uses existing Claude Code authentication)
  const claudeCodeProvider = new ClaudeCodeProvider({
    workingDirectory: projectRoot,
  });

  if (claudeCodeProvider.isReady()) {
    agentProvider = claudeCodeProvider;
    console.log('Using Claude Code provider');
    return agentProvider;
  }

  // Fallback to Anthropic if API key is set
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    agentProvider = new AnthropicProvider({ apiKey: anthropicKey });
    console.log('Using Anthropic provider (API key found)');
    return agentProvider;
  }

  // Last resort: Mock provider
  agentProvider = new MockAgentProvider();
  console.log('Using Mock provider (Claude Code not available, no API key)');
  return agentProvider;
}

/**
 * Initialize all IPC handlers.
 */
export function initializeIpcHandlers(root: string): void {
  // Set project root for providers
  projectRoot = root;

  // Initialize store and services
  store = initStore(projectRoot);
  const policy = store.getPolicy();

  // Initialize runner
  runner = new Runner(projectRoot, policy, store);

  // Initialize provider (will use Claude Code by default)
  agentProvider = getOrCreateProvider();

  // Initialize Ralph engine with provider
  initRalphEngine({
    projectRoot,
    store,
    provider: agentProvider,
  });

  // Register handlers
  registerBoardHandlers();
  registerTaskHandlers();
  registerStateHandlers();
  registerAgentHandlers();
  registerRunLogHandlers();
  registerContextHandlers();
  registerChatHandlers();
  registerSettingsHandlers();
}

// ============================================
// Board Handlers
// ============================================

function registerBoardHandlers(): void {
  ipcMain.handle('board:get', async (): Promise<Board> => {
    return getStore().getBoard();
  });

  ipcMain.handle('board:save', async (_, board: Board): Promise<void> => {
    getStore().saveBoard(board);
  });
}

// ============================================
// Task Handlers
// ============================================

function registerTaskHandlers(): void {
  ipcMain.handle('tasks:getAll', async (): Promise<Task[]> => {
    return getStore().getTasks();
  });

  ipcMain.handle('tasks:get', async (_, taskId: string): Promise<Task | null> => {
    return getStore().getTask(taskId);
  });

  ipcMain.handle('tasks:create', async (_, title: string, status?: TaskStatus): Promise<Task> => {
    return getStore().createTask(title, status || 'backlog');
  });

  ipcMain.handle('tasks:update', async (_, taskId: string, patch: TaskPatch): Promise<Task> => {
    return getStore().updateTask(taskId, patch);
  });

  ipcMain.handle('tasks:delete', async (_, taskId: string): Promise<void> => {
    getStore().deleteTask(taskId);
  });

  ipcMain.handle('tasks:move', async (_, taskId: string, toColumnId: TaskStatus, newOrder?: number): Promise<void> => {
    getStore().moveTask(taskId, toColumnId, newOrder);
  });

  ipcMain.handle('tasks:addComment', async (_, taskId: string, comment: TaskComment): Promise<void> => {
    getStore().addComment(taskId, comment);
  });

  ipcMain.handle('tasks:addTypedComment', async (
    _,
    taskId: string,
    type: TaskComment['type'],
    author: string,
    content: string,
    runId?: string
  ): Promise<TaskComment> => {
    return getStore().addTypedComment(taskId, type, author, content, runId);
  });

  ipcMain.handle('tasks:getPending', async (_, strategy?: 'fifo' | 'priority' | 'dependency'): Promise<Task[]> => {
    return getStore().getPendingTasks(strategy);
  });

  // Analyze task state against current codebase
  ipcMain.handle('tasks:analyzeState', async (_, taskId: string): Promise<{
    success: boolean;
    summary: string;
    criteria: { criterion: string; passed: boolean; evidence: string }[];
    suggestedStatus: string;
    error?: string;
  }> => {
    try {
      const store = getStore();
      const task = store.getTask(taskId);

      if (!task) {
        return {
          success: false,
          summary: '',
          criteria: [],
          suggestedStatus: '',
          error: `Task not found: ${taskId}`,
        };
      }

      const provider = getOrCreateProvider();

      // Build analysis prompt
      const acceptanceCriteria = task.acceptanceCriteria || [];
      const definitionOfDone = task.agent?.definitionOfDone || [];
      const allCriteria = [...acceptanceCriteria, ...definitionOfDone];

      if (allCriteria.length === 0) {
        return {
          success: true,
          summary: 'No acceptance criteria defined for this task.',
          criteria: [],
          suggestedStatus: task.status,
        };
      }

      const analysisPrompt = `You are analyzing a software task to determine if it's in the correct state.

Task: ${task.title}
Description: ${task.description || 'No description'}
Current Status: ${task.status}
Goal: ${task.agent?.goal || 'Not specified'}
Scope: ${task.agent?.scope?.join(', ') || 'Not specified'}

Acceptance Criteria to verify:
${allCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Based on your knowledge of typical software projects and the task description, analyze whether each acceptance criterion is likely met. Consider:
- If the task is in "backlog" or "todo", criteria are likely NOT met yet
- If the task is in "doing", some criteria may be partially met
- If the task is in "review" or "done", criteria should be met

Respond in this exact JSON format:
{
  "summary": "Brief overall assessment of task state",
  "criteria": [
    {"criterion": "criterion text", "passed": true/false, "evidence": "reasoning"}
  ],
  "suggestedStatus": "backlog|todo|doing|review|done"
}`;

      const response = await provider.complete([
        { role: 'system', content: 'You are a software project analyst. Respond only with valid JSON.' },
        { role: 'user', content: analysisPrompt }
      ]);

      // Parse the response
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = response.content;
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        const analysis = JSON.parse(jsonStr);
        return {
          success: true,
          summary: analysis.summary || 'Analysis complete.',
          criteria: analysis.criteria || [],
          suggestedStatus: analysis.suggestedStatus || task.status,
        };
      } catch (parseError) {
        // If JSON parsing fails, return a basic analysis
        return {
          success: true,
          summary: response.content.substring(0, 500),
          criteria: allCriteria.map(c => ({
            criterion: c,
            passed: task.status === 'done' || task.status === 'review',
            evidence: 'Could not perform detailed analysis',
          })),
          suggestedStatus: task.status,
        };
      }
    } catch (error) {
      return {
        success: false,
        summary: '',
        criteria: [],
        suggestedStatus: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Get comment context for agent retry
  ipcMain.handle('tasks:getCommentContext', async (_, taskId: string): Promise<{
    formattedContext: string;
    failureCount: number;
    hasUnresolvedClarifications: boolean;
  }> => {
    const service = getCommentService(getStore());
    const context = service.buildRetryContext(taskId);
    return {
      formattedContext: context.formattedContext,
      failureCount: service.getFailureCount(taskId),
      hasUnresolvedClarifications: service.hasUnresolvedClarifications(taskId),
    };
  });

  // Get pending clarifications for a task
  ipcMain.handle('tasks:getPendingClarifications', async (_, taskId: string): Promise<{
    commentId: string;
    reason: string;
    question: string;
    timestamp: string;
    resolved: boolean;
  }[]> => {
    const service = getCommentService(getStore());
    return service.getPendingClarifications(taskId);
  });

  // Mark failures as addressed
  ipcMain.handle('tasks:markFailuresAddressed', async (_, taskId: string, note?: string): Promise<TaskComment> => {
    const service = getCommentService(getStore());
    return service.markFailuresAddressed(taskId, note);
  });
}

// ============================================
// State Handlers
// ============================================

function registerStateHandlers(): void {
  ipcMain.handle('state:get', async (): Promise<AgentState> => {
    return getStore().getState();
  });

  ipcMain.handle('state:set', async (_, patch: Partial<AgentState>): Promise<AgentState> => {
    return getStore().setState(patch);
  });

  ipcMain.handle('policy:get', async (): Promise<Policy> => {
    return getStore().getPolicy();
  });
}

// ============================================
// Agent Handlers
// ============================================

function registerAgentHandlers(): void {
  // Run a single task
  ipcMain.handle('agent:runTask', async (_, taskId: string, options?: RunTaskOptions): Promise<{
    success: boolean;
    run: AgentRun;
    error?: string;
  }> => {
    const store = getStore();
    const projectRoot = (store as unknown as { projectRoot: string }).projectRoot;

    runtime = new AgentRuntime({
      projectRoot,
      store,
      provider: getOrCreateProvider(),
    });

    const result = await runtime.runTask(taskId, options || { mode: 'manual' });

    return {
      success: result.success,
      run: result.run,
      error: result.error,
    };
  });

  // Cancel current task
  ipcMain.handle('agent:cancel', async (): Promise<void> => {
    if (runtime) {
      runtime.cancel();
    }
  });

  // Check if running
  ipcMain.handle('agent:isRunning', async (): Promise<boolean> => {
    return runtime?.isRunning() || false;
  });

  // Get current run
  ipcMain.handle('agent:getCurrentRun', async (): Promise<AgentRun | null> => {
    return runtime?.getCurrentRun() || null;
  });

  // Start Ralph Mode
  ipcMain.handle('ralph:start', async (_, options?: RalphModeOptions): Promise<{
    success: boolean;
    processed: number;
    completed: number;
    failed: number;
    blocked: number;
    stoppedReason?: string;
  }> => {
    const result = await getRalphEngine().startRalphMode(options);
    return {
      success: result.success,
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      blocked: result.blocked,
      stoppedReason: result.stoppedReason,
    };
  });

  // Stop Ralph Mode
  ipcMain.handle('ralph:stop', async (): Promise<void> => {
    getRalphEngine().stopRalphMode();
  });

  // Pause Ralph Mode
  ipcMain.handle('ralph:pause', async (): Promise<void> => {
    getRalphEngine().pause();
  });

  // Resume Ralph Mode
  ipcMain.handle('ralph:resume', async (): Promise<void> => {
    getRalphEngine().resume();
  });

  // Get Ralph progress
  ipcMain.handle('ralph:getProgress', async (): Promise<{
    total: number;
    completed: number;
    failed: number;
    blocked: number;
    currentTaskId: string | null;
    currentTaskTitle: string | null;
    status: string;
  }> => {
    return getRalphEngine().getProgress();
  });

  // Check if Ralph is running
  ipcMain.handle('ralph:isRunning', async (): Promise<boolean> => {
    return getRalphEngine().isRunning();
  });
}

// ============================================
// Run Log Handlers
// ============================================

function registerRunLogHandlers(): void {
  ipcMain.handle('runs:getLog', async (_, taskId: string, runId: string): Promise<string | null> => {
    return runner?.getRunLog(taskId, runId) || null;
  });

  ipcMain.handle('runs:tailLog', async (_, taskId: string, runId: string, lines?: number): Promise<string | null> => {
    return runner?.tailRunLog(taskId, runId, lines) || null;
  });

  ipcMain.handle('runs:getMetadata', async (_, taskId: string, runId: string): Promise<unknown> => {
    return runner?.getRunMetadata(taskId, runId) || null;
  });
}

// ============================================
// Context Handlers
// ============================================

function registerContextHandlers(): void {
  ipcMain.handle('context:getProject', async (): Promise<ProjectContext | null> => {
    return getStore().getProjectContext();
  });

  ipcMain.handle('context:saveProject', async (_, context: ProjectContext): Promise<void> => {
    getStore().saveProjectContext(context);
  });

  ipcMain.handle('context:getRepoIndex', async (): Promise<RepoIndex | null> => {
    return getStore().getRepoIndex();
  });

  ipcMain.handle('context:saveRepoIndex', async (_, index: RepoIndex): Promise<void> => {
    getStore().saveRepoIndex(index);
  });
}

// ============================================
// Chat Handlers
// ============================================

function registerChatHandlers(): void {
  ipcMain.handle('chat:getAll', async (): Promise<Chat[]> => {
    const index = getStore().getChatIndex();
    const chats: Chat[] = [];
    for (const entry of index.chats) {
      const c = getStore().getChat(entry.id);
      if (c) chats.push(c);
    }
    return chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  ipcMain.handle('chat:get', async (_, chatId: string): Promise<Chat | null> => {
    return getStore().getChat(chatId);
  });

  ipcMain.handle('chat:create', async (_, title: string): Promise<Chat> => {
    const newChat: Chat = {
      id: uuidv4(),
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      taskId: undefined
    };
    getStore().saveChat(newChat);
    return newChat;
  });

  ipcMain.handle('chat:sendMessage', async (event, chatId: string, content: string, mode: 'planner' | 'agent' = 'planner'): Promise<ChatMessage> => {
    const store = getStore();
    const chat = store.getChat(chatId);

    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    // Get the window to send streaming updates
    const win = BrowserWindow.fromWebContents(event.sender);

    // Helper to send stream updates
    const sendUpdate = (text: string, done: boolean) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('chat:stream-update', {
          chatId,
          content: text,
          done,
        });
      }
    };

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
    chat.messages.push(userMsg);
    chat.updatedAt = new Date().toISOString();
    store.saveChat(chat);

    // 2. Get Agent Response with streaming
    const agentMessages: AgentMessage[] = chat.messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // Use configured provider
    const provider = getOrCreateProvider();
    console.log('Chat using provider:', provider.getName(), 'mode:', mode);

    try {
      let response;

      // Call complete with streaming if provider supports it (ClaudeCodeProvider)
      if (provider instanceof ClaudeCodeProvider) {
        // Accumulate content and send full text each time
        let accumulated = '';
        const onChunk = (chunk: string) => {
          accumulated += chunk;
          sendUpdate(accumulated, false);
        };
        response = await provider.complete(agentMessages, AGENT_TOOLS, onChunk, mode);
      } else {
        // Non-streaming provider - just wait for response
        response = await provider.complete(agentMessages, AGENT_TOOLS);
      }

      // Send final update with full content
      sendUpdate(response.content, true);

      // 3. Add Assistant Message
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now()
      };

      chat.messages.push(assistantMsg);
      chat.updatedAt = new Date().toISOString();
      store.saveChat(chat);

      return assistantMsg;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Chat error:', errorMsg);
      sendUpdate(`Error: ${errorMsg}`, true);
      throw error;
    }
  });
}

// ============================================
// Settings Handlers
// ============================================

function registerSettingsHandlers(): void {
  // Get current provider info
  ipcMain.handle('settings:getProvider', async (): Promise<{
    name: string;
    ready: boolean;
    type: ProviderType;
  }> => {
    const provider = getOrCreateProvider();
    let type: ProviderType = 'mock';
    if (provider instanceof ClaudeCodeProvider) {
      type = 'claude-code';
    } else if (provider instanceof AnthropicProvider) {
      type = 'anthropic';
    }
    return {
      name: provider.getName(),
      ready: provider.isReady(),
      type,
    };
  });

  // Set API key and switch to Anthropic provider
  ipcMain.handle('settings:setApiKey', async (_, apiKey: string): Promise<{
    success: boolean;
    provider: string;
    error?: string;
  }> => {
    try {
      if (!apiKey || apiKey.trim().length === 0) {
        // Clear API key and switch to mock
        agentProvider = new MockAgentProvider();
        return {
          success: true,
          provider: 'MockProvider',
        };
      }

      // Create new Anthropic provider with the key
      const newProvider = new AnthropicProvider({ apiKey: apiKey.trim() });

      if (!newProvider.isReady()) {
        return {
          success: false,
          provider: agentProvider?.getName() || 'Unknown',
          error: 'Failed to initialize Anthropic provider',
        };
      }

      agentProvider = newProvider;

      // Update Ralph engine with new provider
      getRalphEngine().setProvider(newProvider);

      return {
        success: true,
        provider: newProvider.getName(),
      };
    } catch (error) {
      return {
        success: false,
        provider: agentProvider?.getName() || 'Unknown',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Test current provider connection
  ipcMain.handle('settings:testProvider', async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      const provider = getOrCreateProvider();

      if (!provider.isReady()) {
        return {
          success: false,
          message: 'Provider not ready. Please configure an API key.',
        };
      }

      // Simple test call
      const response = await provider.complete([
        { role: 'user', content: 'Say "OK" if you can hear me.' }
      ]);

      if (response.finishReason === 'error') {
        return {
          success: false,
          message: response.content,
        };
      }

      return {
        success: true,
        message: `Provider working: ${response.content.substring(0, 100)}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
