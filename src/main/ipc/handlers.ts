/**
 * IPC Handlers
 *
 * All IPC handlers for communication between main and renderer processes.
 */

import { ipcMain, BrowserWindow, dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
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
let projectRoot: string | null = null;

// Recent projects file path
const RECENT_PROJECTS_FILE = path.join(app.getPath('userData'), 'recent-projects.json');

interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

function loadRecentProjects(): RecentProject[] {
  try {
    if (fs.existsSync(RECENT_PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(RECENT_PROJECTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load recent projects:', err);
  }
  return [];
}

function saveRecentProjects(projects: RecentProject[]): void {
  try {
    fs.writeFileSync(RECENT_PROJECTS_FILE, JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error('Failed to save recent projects:', err);
  }
}

function addToRecentProjects(projectPath: string): void {
  const projects = loadRecentProjects();
  const name = path.basename(projectPath);
  const now = new Date().toISOString();

  // Remove if already exists
  const filtered = projects.filter(p => p.path !== projectPath);

  // Add at the beginning
  filtered.unshift({ path: projectPath, name, lastOpened: now });

  // Keep only 10 recent
  saveRecentProjects(filtered.slice(0, 10));
}

/**
 * Check if a project is currently open.
 */
function hasProject(): boolean {
  return projectRoot !== null && store !== null;
}

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
    workingDirectory: projectRoot || process.cwd(),
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
export function initializeIpcHandlers(root?: string): void {
  // Only initialize project if root is provided
  if (root) {
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
  } else {
    // No project - just initialize provider
    agentProvider = getOrCreateProvider();
  }

  // Register handlers (always register, even without project)
  registerBoardHandlers();
  registerTaskHandlers();
  registerStateHandlers();
  registerAgentHandlers();
  registerRunLogHandlers();
  registerContextHandlers();
  registerChatHandlers();
  registerSettingsHandlers();
  registerProjectHandlers();
}

// ============================================
// Board Handlers
// ============================================

function registerBoardHandlers(): void {
  ipcMain.handle('board:get', async (): Promise<Board | null> => {
    if (!hasProject()) return null;
    return getStore().getBoard();
  });

  ipcMain.handle('board:save', async (_, board: Board): Promise<void> => {
    if (!hasProject()) return;
    getStore().saveBoard(board);
  });
}

// ============================================
// Task Handlers
// ============================================

function registerTaskHandlers(): void {
  ipcMain.handle('tasks:getAll', async (): Promise<Task[]> => {
    if (!hasProject()) return [];
    return getStore().getTasks();
  });

  ipcMain.handle('tasks:get', async (_, taskId: string): Promise<Task | null> => {
    if (!hasProject()) return null;
    return getStore().getTask(taskId);
  });

  ipcMain.handle('tasks:create', async (_, title: string, status?: TaskStatus): Promise<Task | null> => {
    if (!hasProject()) return null;
    return getStore().createTask(title, status || 'backlog');
  });

  ipcMain.handle('tasks:update', async (_, taskId: string, patch: TaskPatch): Promise<Task | null> => {
    if (!hasProject()) return null;
    return getStore().updateTask(taskId, patch);
  });

  ipcMain.handle('tasks:delete', async (_, taskId: string): Promise<void> => {
    if (!hasProject()) return;
    getStore().deleteTask(taskId);
  });

  ipcMain.handle('tasks:move', async (_, taskId: string, toColumnId: TaskStatus, newOrder?: number): Promise<void> => {
    if (!hasProject()) return;
    getStore().moveTask(taskId, toColumnId, newOrder);
  });

  ipcMain.handle('tasks:addComment', async (_, taskId: string, comment: TaskComment): Promise<void> => {
    if (!hasProject()) return;
    getStore().addComment(taskId, comment);
  });

  ipcMain.handle('tasks:addTypedComment', async (
    _,
    taskId: string,
    type: TaskComment['type'],
    author: string,
    content: string,
    runId?: string
  ): Promise<TaskComment | null> => {
    if (!hasProject()) return null;
    return getStore().addTypedComment(taskId, type, author, content, runId);
  });

  ipcMain.handle('tasks:getPending', async (_, strategy?: 'fifo' | 'priority' | 'dependency'): Promise<Task[]> => {
    if (!hasProject()) return [];
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
    if (!hasProject()) {
      return {
        success: false,
        summary: '',
        criteria: [],
        suggestedStatus: '',
        error: 'No project open',
      };
    }
    try {
      const s = getStore();
      const task = s.getTask(taskId);

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
    if (!hasProject()) {
      return { formattedContext: '', failureCount: 0, hasUnresolvedClarifications: false };
    }
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
    if (!hasProject()) return [];
    const service = getCommentService(getStore());
    return service.getPendingClarifications(taskId);
  });

  // Mark failures as addressed
  ipcMain.handle('tasks:markFailuresAddressed', async (_, taskId: string, note?: string): Promise<TaskComment | null> => {
    if (!hasProject()) return null;
    const service = getCommentService(getStore());
    return service.markFailuresAddressed(taskId, note);
  });
}

// ============================================
// State Handlers
// ============================================

function registerStateHandlers(): void {
  ipcMain.handle('state:get', async (): Promise<AgentState | null> => {
    if (!hasProject()) return null;
    return getStore().getState();
  });

  ipcMain.handle('state:set', async (_, patch: Partial<AgentState>): Promise<AgentState | null> => {
    if (!hasProject()) return null;
    return getStore().setState(patch);
  });

  ipcMain.handle('policy:get', async (): Promise<Policy | null> => {
    if (!hasProject()) return null;
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
    run: AgentRun | null;
    error?: string;
  }> => {
    if (!hasProject() || !projectRoot) {
      return {
        success: false,
        run: null,
        error: 'No project open',
      };
    }

    const s = getStore();

    runtime = new AgentRuntime({
      projectRoot,
      store: s,
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
    if (!hasProject()) {
      return { success: false, processed: 0, completed: 0, failed: 0, blocked: 0, stoppedReason: 'No project open' };
    }
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
    if (!hasProject()) return;
    getRalphEngine().stopRalphMode();
  });

  // Pause Ralph Mode
  ipcMain.handle('ralph:pause', async (): Promise<void> => {
    if (!hasProject()) return;
    getRalphEngine().pause();
  });

  // Resume Ralph Mode
  ipcMain.handle('ralph:resume', async (): Promise<void> => {
    if (!hasProject()) return;
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
    if (!hasProject()) {
      return { total: 0, completed: 0, failed: 0, blocked: 0, currentTaskId: null, currentTaskTitle: null, status: 'idle' };
    }
    return getRalphEngine().getProgress();
  });

  // Check if Ralph is running
  ipcMain.handle('ralph:isRunning', async (): Promise<boolean> => {
    if (!hasProject()) return false;
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
    if (!hasProject()) return null;
    return getStore().getProjectContext();
  });

  ipcMain.handle('context:saveProject', async (_, context: ProjectContext): Promise<void> => {
    if (!hasProject()) return;
    getStore().saveProjectContext(context);
  });

  ipcMain.handle('context:getRepoIndex', async (): Promise<RepoIndex | null> => {
    if (!hasProject()) return null;
    return getStore().getRepoIndex();
  });

  ipcMain.handle('context:saveRepoIndex', async (_, index: RepoIndex): Promise<void> => {
    if (!hasProject()) return;
    getStore().saveRepoIndex(index);
  });
}

// ============================================
// Tool Executor for Chat
// ============================================

interface ToolResult {
  name: string;
  success: boolean;
  result: unknown;
  error?: string;
}

/**
 * Execute a tool call from the agent and return the result.
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  mode: 'planner' | 'agent'
): Promise<ToolResult> {
  if (!hasProject()) {
    return {
      name: toolName,
      success: false,
      result: null,
      error: 'No project open',
    };
  }
  const s = getStore();

  try {
    switch (toolName) {
      // Task management tools (available in both modes)
      case 'create_task': {
        const title = args.title as string;
        const description = args.description as string || '';
        const acceptanceCriteria = args.acceptanceCriteria as string[] || ['Task completed'];
        const status = (args.status as TaskStatus) || 'backlog';

        // Create basic task
        const task = s.createTask(title, status);

        // Update with additional fields
        const updatedTask = s.updateTask(task.id, {
          description,
          acceptanceCriteria,
          agent: {
            goal: description,
            scope: ['*'],
            definitionOfDone: acceptanceCriteria,
          }
        });

        return {
          name: toolName,
          success: true,
          result: {
            taskId: updatedTask.id,
            title: updatedTask.title,
            status: updatedTask.status,
            message: `Task created! ID: "${updatedTask.id}" - Title: "${updatedTask.title}" - Use this ID for update_task calls.`
          }
        };
      }

      case 'update_task': {
        const taskId = args.taskId as string;
        const patch: TaskPatch = {};

        if (args.title) patch.title = args.title as string;
        if (args.description) patch.description = args.description as string;
        if (args.status) patch.status = args.status as TaskStatus;
        if (args.acceptanceCriteria) patch.acceptanceCriteria = args.acceptanceCriteria as string[];

        const task = s.updateTask(taskId, patch);

        return {
          name: toolName,
          success: true,
          result: {
            taskId: task.id,
            title: task.title,
            status: task.status,
            message: `Task updated: ${task.title}`
          }
        };
      }

      case 'list_tasks': {
        let tasks = s.getTasks();

        if (args.status) {
          tasks = tasks.filter(t => t.status === args.status);
        }

        return {
          name: toolName,
          success: true,
          result: {
            count: tasks.length,
            tasks: tasks.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
            }))
          }
        };
      }

      case 'task_complete': {
        // This would typically mark the current task as done
        return {
          name: toolName,
          success: true,
          result: {
            message: 'Task marked as complete',
            summary: args.summary,
            acceptanceResults: args.acceptanceResults
          }
        };
      }

      case 'task_blocked': {
        return {
          name: toolName,
          success: true,
          result: {
            message: 'Task marked as blocked',
            reason: args.reason,
            question: args.question
          }
        };
      }

      case 'task_failed': {
        return {
          name: toolName,
          success: true,
          result: {
            message: 'Task marked as failed',
            reason: args.reason,
            nextSteps: args.nextSteps
          }
        };
      }

      // File/command tools - only in agent mode
      case 'list_files':
      case 'read_file':
      case 'search':
      case 'write_file':
      case 'apply_patch':
      case 'run_command': {
        if (mode === 'planner') {
          return {
            name: toolName,
            success: false,
            result: null,
            error: `Tool '${toolName}' is not available in Planner mode. Switch to Agent mode to execute code changes.`
          };
        }

        // In agent mode, these would be executed by the Runner
        // For now, return a placeholder - Claude Code CLI handles these internally
        return {
          name: toolName,
          success: true,
          result: {
            message: `Tool '${toolName}' executed (handled by Claude Code CLI)`
          }
        };
      }

      default:
        return {
          name: toolName,
          success: false,
          result: null,
          error: `Unknown tool: ${toolName}`
        };
    }
  } catch (error) {
    return {
      name: toolName,
      success: false,
      result: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Format tool results for display in chat.
 */
function formatToolResults(results: ToolResult[]): string {
  if (results.length === 0) return '';

  const lines: string[] = ['\n\n---\n**Tool Execution Results:**\n'];

  for (const result of results) {
    if (result.success) {
      const resultObj = result.result as Record<string, unknown>;
      if (resultObj.message) {
        lines.push(`- **${result.name}**: ${resultObj.message}`);
      } else {
        lines.push(`- **${result.name}**: Success`);
      }
    } else {
      lines.push(`- **${result.name}**: Failed - ${result.error}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Chat Handlers
// ============================================

function registerChatHandlers(): void {
  ipcMain.handle('chat:getAll', async (): Promise<Chat[]> => {
    if (!hasProject()) return [];
    const index = getStore().getChatIndex();
    const chats: Chat[] = [];
    for (const entry of index.chats) {
      const c = getStore().getChat(entry.id);
      if (c) chats.push(c);
    }
    return chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  ipcMain.handle('chat:get', async (_, chatId: string): Promise<Chat | null> => {
    if (!hasProject()) return null;
    return getStore().getChat(chatId);
  });

  ipcMain.handle('chat:create', async (_, title: string): Promise<Chat | null> => {
    if (!hasProject()) return null;
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

  ipcMain.handle('chat:sendMessage', async (event, chatId: string, content: string, mode: 'planner' | 'agent' = 'planner'): Promise<ChatMessage | null> => {
    if (!hasProject()) return null;
    const s = getStore();
    const chat = s.getChat(chatId);

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
    s.saveChat(chat);

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

      // 3. Execute tool calls if any
      let finalContent = response.content;
      const toolResults: ToolResult[] = [];

      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log('[Chat] Executing tool calls:', response.toolCalls.map(t => t.name));

        for (const toolCall of response.toolCalls) {
          const result = await executeToolCall(toolCall.name, toolCall.arguments, mode);
          toolResults.push(result);
          console.log(`[Chat] Tool ${toolCall.name} result:`, result.success ? 'success' : result.error);
        }

        // Append tool results to content
        finalContent += formatToolResults(toolResults);
      }

      // Send final update with full content including tool results
      sendUpdate(finalContent, true);

      // 4. Add Assistant Message
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: finalContent,
        timestamp: Date.now()
      };

      chat.messages.push(assistantMsg);
      chat.updatedAt = new Date().toISOString();
      s.saveChat(chat);

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

// ============================================
// Project Handlers
// ============================================

function openProject(projectPath: string, mainWindow: BrowserWindow | null): boolean {
  try {
    // Initialize store for this project
    store = initStore(projectPath);
    projectRoot = projectPath;

    // Re-initialize provider with new working directory
    if (agentProvider instanceof ClaudeCodeProvider) {
      agentProvider.setWorkingDirectory(projectPath);
    } else {
      agentProvider = new ClaudeCodeProvider({ workingDirectory: projectPath });
    }

    // Initialize runner and ralph engine
    const policy = store.getPolicy();
    runner = new Runner(projectPath, policy, store);
    initRalphEngine({
      projectRoot: projectPath,
      store,
      provider: agentProvider,
    });

    // Add to recent projects
    addToRecentProjects(projectPath);

    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('project:changed', projectPath);
    }

    console.log('Opened project:', projectPath);
    return true;
  } catch (err) {
    console.error('Failed to open project:', err);
    return false;
  }
}

function registerProjectHandlers(): void {
  // Open project via dialog
  ipcMain.handle('project:open', async (event): Promise<{ success: boolean; path?: string; error?: string }> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: 'Open Project',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' };
    }

    const projectPath = result.filePaths[0];
    const success = openProject(projectPath, win);

    return success
      ? { success: true, path: projectPath }
      : { success: false, error: 'Failed to open project' };
  });

  // Create new project via dialog
  ipcMain.handle('project:create', async (event): Promise<{ success: boolean; path?: string; error?: string }> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Folder for New Project',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' };
    }

    const projectPath = result.filePaths[0];
    const success = openProject(projectPath, win);

    return success
      ? { success: true, path: projectPath }
      : { success: false, error: 'Failed to create project' };
  });

  // Open project by path
  ipcMain.handle('project:openPath', async (event, projectPath: string): Promise<{ success: boolean; error?: string }> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!fs.existsSync(projectPath)) {
      return { success: false, error: 'Path does not exist' };
    }

    const success = openProject(projectPath, win);
    return success
      ? { success: true }
      : { success: false, error: 'Failed to open project' };
  });

  // Close current project
  ipcMain.handle('project:close', async (event): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    // Clear project state
    store = null;
    projectRoot = null;
    runner = null;

    // Notify renderer
    if (win && !win.isDestroyed()) {
      win.webContents.send('project:changed', null);
    }

    console.log('Project closed');
  });

  // Get current project path
  ipcMain.handle('project:getCurrent', async (): Promise<string | null> => {
    return projectRoot;
  });

  // Get recent projects
  ipcMain.handle('project:getRecent', async (): Promise<RecentProject[]> => {
    const projects = loadRecentProjects();
    // Filter out projects that no longer exist
    return projects.filter(p => fs.existsSync(p.path));
  });
}

/**
 * Get current project root (can be null if no project is open)
 */
export function getProjectRoot(): string | null {
  return projectRoot;
}
