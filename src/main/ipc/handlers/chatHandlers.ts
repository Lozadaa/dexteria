/**
 * Chat Handlers
 *
 * IPC handlers for chat operations and tool execution.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { AGENT_TOOLS } from '../../agent/AgentProvider';
import {
  hasProject,
  getStore,
  getOrCreateProvider,
  ClaudeCodeProvider,
  OpenCodeProvider,
} from './shared';
import type { OpenCodeTodo } from '../../agent/providers/OpenCodeProvider';
import { getPluginManager } from '../../services/PluginManager';
import type { ToolResult } from './types';
import type {
  Chat,
  ChatMessage,
  AgentMessage,
  TaskStatus,
  TaskPatch,
} from '../../../shared/types';

/**
 * Message boundary delimiter.
 * AI can use this to split responses into multiple distinct messages.
 * Usage: AI outputs "---MSG---" to indicate a new message should start.
 */
const MSG_DELIMITER = '---MSG---';

/**
 * Filter tool JSON blocks from streaming content and replace with friendly indicators.
 * This runs on the backend before sending to frontend to avoid any flash of JSON.
 */
function filterToolJsonForStreaming(content: string): string {
  if (!content) return content;

  let filtered = content;

  // 1. Replace complete JSON code blocks with tool calls (including batch tasks format)
  filtered = filtered.replace(
    /```json\s*\n?([\s\S]*?)\n?```/g,
    (match, jsonContent) => {
      try {
        const parsed = JSON.parse(jsonContent.trim().replace(/,(\s*[}\]])/g, '$1'));
        if (parsed.tool) {
          // Count tasks if batch format
          const taskCount = Array.isArray(parsed.tasks) ? parsed.tasks.length : 1;
          return getToolIndicator(parsed.tool, 'complete', taskCount);
        }
      } catch {
        // Not valid JSON, return original
      }
      return match;
    }
  );

  // 2. Handle partial/incomplete JSON blocks during streaming
  filtered = filtered.replace(
    /```json\s*\n?\s*\{\s*"tool"\s*:\s*"([^"]+)"[^`]*$/,
    (_match, toolName) => getToolIndicator(toolName, 'pending')
  );

  // 3. Replace inline tool JSON
  filtered = filtered.replace(
    /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}/g,
    (_match, toolName) => getToolIndicator(toolName, 'complete')
  );

  // 4. Handle partial inline tool JSON
  filtered = filtered.replace(
    /\{\s*"tool"\s*:\s*"([^"]+)"[^}]*$/,
    (_match, toolName) => getToolIndicator(toolName, 'pending')
  );

  return filtered;
}

function getToolIndicator(toolName: string, status: 'pending' | 'complete', count: number = 1): string {
  const icon = status === 'pending' ? '⏳' : '✅';
  const messages: Record<string, [string, string]> = {
    'create_task': ['Creating tasks...', count > 1 ? `Created ${count} tasks` : 'Task created'],
    'update_task': ['Updating task...', 'Task updated'],
    'list_tasks': ['Listing tasks...', 'Tasks listed'],
    'save_progress': ['Saving progress...', 'Progress saved'],
    'invoke_task_run': ['Requesting task execution...', 'Execution requested'],
  };
  const [pending, complete] = messages[toolName] || [`Running ${toolName}...`, `${toolName} complete`];
  return `\n${icon} ${status === 'pending' ? pending : complete}\n`;
}

/**
 * Execute a tool call from the agent and return the result.
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  _mode: 'planner' | 'agent' // Mode kept for API compatibility, but execution tools are blocked in chat
): Promise<ToolResult> {
  console.log(`[Tool] executeToolCall called: ${toolName}`, JSON.stringify(args).substring(0, 200));
  console.log(`[Tool] hasProject: ${hasProject()}`);

  if (!hasProject()) {
    console.log('[Tool] No project open, returning error');
    return {
      name: toolName,
      success: false,
      result: null,
      error: 'No project open',
    };
  }
  const s = getStore();
  console.log(`[Tool] Got store, has tasks: ${s.getTasks().length}`);

  try {
    switch (toolName) {
      // Task management tools (available in both modes)
      case 'create_task': {
        const title = args.title as string;
        const description = args.description as string || '';
        const acceptanceCriteria = args.acceptanceCriteria as string[] || ['Task completed'];
        const status = (args.status as TaskStatus) || 'backlog';
        const priority = (args.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium';

        console.log(`[Tool] Creating task: title="${title}", status="${status}", priority="${priority}"`);

        if (!title || title.trim() === '') {
          console.log('[Tool] Error: Empty title');
          return {
            name: toolName,
            success: false,
            result: null,
            error: 'Task title cannot be empty',
          };
        }

        // Create basic task
        const task = s.createTask(title, status);
        console.log(`[Tool] Task created with ID: ${task.id}`);

        // Update with additional fields
        const updatedTask = s.updateTask(task.id, {
          description,
          acceptanceCriteria,
          priority,
          agent: {
            goal: description,
            scope: ['*'],
            definitionOfDone: acceptanceCriteria,
          }
        });

        console.log(`[Tool] Task creation SUCCESS: ${updatedTask.id} - "${updatedTask.title}"`);
        return {
          name: toolName,
          success: true,
          result: {
            taskId: updatedTask.id,
            title: updatedTask.title,
            status: updatedTask.status,
            priority: updatedTask.priority,
            message: `Task created: "${updatedTask.title}"`
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

      case 'save_progress': {
        const completed = args.completed as string;
        const nextStep = args.nextStep as string;
        const tasksCreated = args.tasksCreated as string[] || [];

        // Log progress to activity
        s.logActivity('agent_completed', {
          type: 'progress_checkpoint',
          completed,
          nextStep,
          tasksCreated,
          timestamp: new Date().toISOString(),
        });

        console.log(`[Chat] Progress saved: ${completed} -> Next: ${nextStep}`);

        return {
          name: toolName,
          success: true,
          result: {
            message: `Progress saved. Completed: "${completed}". Next: "${nextStep}"`,
            tasksCreated,
          }
        };
      }

      // Read-only file tools - allowed in both modes
      case 'list_files':
      case 'read_file':
      case 'search': {
        // These are read-only operations, handled by Claude Code CLI
        return {
          name: toolName,
          success: true,
          result: {
            message: `Tool '${toolName}' executed (handled by Claude Code CLI)`
          }
        };
      }

      // Execution tools - FORBIDDEN in chat, must use invoke_task_run
      case 'write_file':
      case 'apply_patch':
      case 'run_command': {
        // Block execution tools in chat - AI must use invoke_task_run instead
        return {
          name: toolName,
          success: false,
          result: null,
          error: `Tool '${toolName}' cannot be executed directly from chat. Create a task and use 'invoke_task_run' to request execution via the TaskRunner.`
        };
      }

      // invoke_task_run - Request task execution via TaskRunner
      case 'invoke_task_run': {
        const taskId = args.taskId as string;
        const reason = args.reason as string || 'AI requested execution';

        if (!taskId) {
          return {
            name: toolName,
            success: false,
            result: null,
            error: 'taskId is required for invoke_task_run'
          };
        }

        // Verify the task exists
        const task = s.getTask(taskId);
        if (!task) {
          return {
            name: toolName,
            success: false,
            result: null,
            error: `Task not found: ${taskId}. Make sure to use a real task ID from create_task or list_tasks.`
          };
        }

        // Get the window to emit the event
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send('chat:task-run-requested', {
            taskId,
            taskTitle: task.title,
            reason
          });
        }

        return {
          name: toolName,
          success: true,
          result: {
            message: `Execution requested for task "${task.title}" (${taskId}). User will be prompted to run it in the TaskRunner.`,
            taskId,
            taskTitle: task.title
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
    console.error(`[Tool] Error in ${toolName}:`, error);
    return {
      name: toolName,
      success: false,
      result: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Parse and execute inline tool JSON calls from content.
 * Supports multiple formats:
 * - Standard: {"tool": "name", "arguments": {...}}
 * - Batch tasks: {"tool": "create_task", "tasks": [...]}
 * Returns the cleaned content with tool results appended.
 */
async function parseAndExecuteInlineTools(
  content: string,
  mode: 'planner' | 'agent'
): Promise<{ cleanedContent: string; results: ToolResult[] }> {
  const results: ToolResult[] = [];
  let cleanedContent = content;

  // Try to find JSON blocks in the content
  const jsonBlockPattern = /```json\s*\n?([\s\S]*?)\n?```/g;
  const inlineJsonPattern = /\{\s*"tool"\s*:\s*"[^"]+"\s*,[\s\S]*?\}(?=\s*(?:$|[^}\]]))/g;

  const toolCalls: Array<{ fullMatch: string; parsed: Record<string, unknown> }> = [];

  // First, extract JSON from code blocks
  let blockMatch;
  while ((blockMatch = jsonBlockPattern.exec(content)) !== null) {
    const jsonContent = blockMatch[1].trim();
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.tool) {
        toolCalls.push({ fullMatch: blockMatch[0], parsed });
      }
    } catch (e) {
      // Try to fix common JSON issues (trailing commas, etc)
      try {
        const fixed = jsonContent.replace(/,(\s*[}\]])/g, '$1');
        const parsed = JSON.parse(fixed);
        if (parsed.tool) {
          toolCalls.push({ fullMatch: blockMatch[0], parsed });
        }
      } catch {
        console.log('[Chat] Failed to parse JSON block:', e);
      }
    }
  }

  // Then, try to find inline JSON tool calls
  let inlineMatch;
  while ((inlineMatch = inlineJsonPattern.exec(content)) !== null) {
    // Skip if this is inside a code block we already processed
    const isInCodeBlock = toolCalls.some(tc => tc.fullMatch.includes(inlineMatch![0]));
    if (isInCodeBlock) continue;

    try {
      const parsed = JSON.parse(inlineMatch[0]);
      if (parsed.tool) {
        toolCalls.push({ fullMatch: inlineMatch[0], parsed });
      }
    } catch {
      // Inline JSON might be incomplete, skip
    }
  }

  // Execute each tool call
  for (const call of toolCalls) {
    const { fullMatch, parsed } = call;
    const toolName = parsed.tool as string;

    console.log(`[Chat] Executing inline tool: ${toolName}`, parsed);

    // Handle batch task creation format: {"tool": "create_task", "tasks": [...]}
    if (toolName === 'create_task' && Array.isArray(parsed.tasks)) {
      const tasks = parsed.tasks as Array<Record<string, unknown>>;
      const createdTasks: string[] = [];

      for (const taskData of tasks) {
        const result = await executeToolCall('create_task', {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status || 'backlog',
          priority: taskData.priority || 'medium',
          acceptanceCriteria: taskData.acceptanceCriteria || ['Task completed'],
        }, mode);

        results.push(result);

        if (result.success && result.result) {
          const taskResult = result.result as { title?: string; taskId?: string };
          createdTasks.push(taskResult.title || taskResult.taskId || 'Unknown');
        }
      }

      // Replace JSON with summary
      const resultText = `\n✅ **Created ${createdTasks.length} tasks:**\n${createdTasks.map((t, i) => `   ${i + 1}. ${t}`).join('\n')}\n`;
      cleanedContent = cleanedContent.replace(fullMatch, resultText);
    }
    // Standard format: {"tool": "name", "arguments": {...}}
    else if (parsed.arguments) {
      const result = await executeToolCall(toolName, parsed.arguments as Record<string, unknown>, mode);
      results.push(result);

      const resultText = result.success
        ? `\n✅ **${toolName}**: ${(result.result as Record<string, unknown>)?.message || 'Success'}\n`
        : `\n❌ **${toolName}**: ${result.error}\n`;

      cleanedContent = cleanedContent.replace(fullMatch, resultText);
    }
    // Simple format without arguments wrapper
    else {
      // Pass the whole parsed object minus 'tool' as arguments
      const { tool: _tool, ...args } = parsed;
      const result = await executeToolCall(toolName, args, mode);
      results.push(result);

      const resultText = result.success
        ? `\n✅ **${toolName}**: ${(result.result as Record<string, unknown>)?.message || 'Success'}\n`
        : `\n❌ **${toolName}**: ${result.error}\n`;

      cleanedContent = cleanedContent.replace(fullMatch, resultText);
    }
  }

  return { cleanedContent, results };
}

/**
 * Process OpenCode todos and create Dexteria tasks from them.
 * Only creates tasks that don't already exist (based on title match).
 */
async function processOpenCodeTodos(todos: OpenCodeTodo[], mode: 'planner' | 'agent'): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  console.log('[Chat] processOpenCodeTodos called with', todos.length, 'todos');
  console.log('[Chat] hasProject:', hasProject());
  console.log('[Chat] Todos to process:', JSON.stringify(todos.slice(0, 3)));

  if (!hasProject()) {
    console.log('[Chat] processOpenCodeTodos: NO PROJECT OPEN - cannot create tasks');
    return results;
  }

  if (todos.length === 0) {
    console.log('[Chat] processOpenCodeTodos: no todos to process');
    return results;
  }

  const s = getStore();
  const existingTasks = s.getTasks();
  console.log('[Chat] Existing tasks count:', existingTasks.length);

  // Only create tasks that don't already exist (by title)
  const existingTitles = new Set(existingTasks.map(t => t.title.toLowerCase()));

  for (let i = 0; i < todos.length; i++) {
    const todo = todos[i];
    const title = todo.content;
    console.log(`[Chat] Processing todo ${i + 1}/${todos.length}: "${title}" (status: ${todo.status})`);

    if (!title || title.trim() === '') {
      console.log(`[Chat] Skipping todo ${i + 1} - empty title`);
      continue;
    }

    const titleLower = title.toLowerCase().trim();

    // Skip if task with same title exists
    if (existingTitles.has(titleLower)) {
      console.log(`[Chat] Skipping todo ${i + 1} - task already exists: "${title}"`);
      continue;
    }

    // Map OpenCode status to Dexteria status
    let status: 'backlog' | 'todo' | 'doing' | 'review' | 'done' = 'backlog';
    if (todo.status === 'in_progress') {
      status = 'doing';
    } else if (todo.status === 'completed') {
      status = 'done';
    }

    console.log(`[Chat] Creating task: "${title}" with status="${status}"`);

    // Create task
    const result = await executeToolCall('create_task', {
      title: title.trim(),
      description: '',
      status,
      priority: todo.priority || 'medium',
    }, mode);

    results.push(result);

    if (result.success) {
      existingTitles.add(titleLower); // Add to set to prevent duplicates in same batch
      console.log(`[Chat] SUCCESS: Created task from OpenCode todo: "${title}"`);
    } else {
      console.log(`[Chat] FAILED to create task: "${title}" - Error: ${result.error}`);
    }
  }

  console.log(`[Chat] processOpenCodeTodos completed: ${results.filter(r => r.success).length}/${results.length} tasks created`);
  return results;
}

/**
 * Register all chat-related IPC handlers.
 */
export function registerChatHandlers(): void {
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

  ipcMain.handle('chat:delete', async (_, chatId: string): Promise<boolean> => {
    if (!hasProject()) return false;
    return getStore().deleteChat(chatId);
  });

  ipcMain.handle('chat:sendMessage', async (event, chatId: string, content: string, mode: 'planner' | 'agent' = 'planner', attachedFiles: string[] = []): Promise<ChatMessage | null> => {
    if (!hasProject()) return null;
    const s = getStore();
    const chat = s.getChat(chatId);

    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    // Execute chat:beforeSend hooks
    let processedContent = content;
    const pluginManager = getPluginManager();
    if (pluginManager) {
      const hookResult = await pluginManager.executeBeforeSendHooks({
        message: content,
        chatId,
        mode,
      });

      // Check if a plugin cancelled the message
      if (hookResult.cancel) {
        console.log('[Chat] Message cancelled by plugin hook');
        return null;
      }

      // Use potentially modified message
      processedContent = hookResult.message;
    }

    // Get the window to send streaming updates
    const win = BrowserWindow.fromWebContents(event.sender);

    // Track completed messages from delimiter splits
    const completedMessages: string[] = [];

    // Helper to send stream updates
    const sendUpdate = (text: string, done: boolean, isNewMessage: boolean = false) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('chat:stream-update', {
          chatId,
          content: text,
          done,
          isNewMessage, // Indicates a new message bubble should be created
          messageIndex: completedMessages.length, // Which message we're on
        });
      }
    };

    // Helper to process content and detect message boundaries
    const processContentWithDelimiters = (fullContent: string): { current: string; completed: string[] } => {
      const parts = fullContent.split(MSG_DELIMITER);
      if (parts.length === 1) {
        return { current: parts[0], completed: [] };
      }
      // All parts except the last are completed messages
      const completed = parts.slice(0, -1).map(p => p.trim()).filter(p => p.length > 0);
      const current = parts[parts.length - 1].trim();
      return { current, completed };
    };

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: processedContent,
      timestamp: Date.now()
    };

    // Generate title from first message if this is a new chat
    const isFirstMessage = chat.messages.length === 0;
    if (isFirstMessage) {
      // Create a short title from the user's message (max 50 chars)
      const titleWords = processedContent.trim().split(/\s+/).slice(0, 8).join(' ');
      chat.title = titleWords.length > 50 ? titleWords.substring(0, 47) + '...' : titleWords;
    }

    chat.messages.push(userMsg);
    chat.updatedAt = new Date().toISOString();
    s.saveChat(chat);

    // Use configured provider
    const provider = getOrCreateProvider();
    console.log('Chat using provider:', provider.getName(), 'mode:', mode);

    try {
      // Build initial agent messages from chat history
      const buildAgentMessages = (): AgentMessage[] => {
        return chat.messages.map((m, idx) => {
          const isLastUserMessage = idx === chat.messages.length - 1 && m.role === 'user';

          // Inject mode reminder into the last user message to prevent agent from forgetting
          if (isLastUserMessage && mode === 'agent') {
            return {
              role: m.role as 'user' | 'assistant' | 'system',
              content: `${m.content}\n\n---\n[REMINDER: You are in AGENT MODE. Create tasks using JSON blocks, do NOT execute code directly. Output \`\`\`json{"tool": "create_task", ...}\`\`\` blocks.]`
            };
          }

          return {
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
          };
        });
      };

      // Conversation loop - handle tool calls by sending results back to Claude
      const MAX_TOOL_ITERATIONS = 5; // Prevent infinite loops
      let iteration = 0;
      let conversationMessages = buildAgentMessages();
      let accumulated = '';
      let allToolResults: ToolResult[] = [];
      let finalResponse: { content: string; toolCalls?: { name: string; arguments: Record<string, unknown> }[] } | null = null;

      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;
        console.log(`[Chat] Conversation iteration ${iteration}`);

        let response;

        // Streaming callback for providers that support it
        const onChunk = (chunk: string) => {
          accumulated += chunk;

          // Check for message boundaries
          const { current, completed } = processContentWithDelimiters(accumulated);

          // If we have newly completed messages, emit them
          while (completed.length > completedMessages.length) {
            const newCompletedIdx = completedMessages.length;
            const completedContent = completed[newCompletedIdx];
            completedMessages.push(completedContent);

            // Send the completed message
            sendUpdate(filterToolJsonForStreaming(completedContent), true, true);
          }

          // Send current (in-progress) message
          if (current) {
            sendUpdate(filterToolJsonForStreaming(current), false, completedMessages.length > 0);
          }
        };

        // Set attached files for providers that support it
        if (attachedFiles.length > 0) {
          if ('setAttachedFiles' in provider && typeof provider.setAttachedFiles === 'function') {
            provider.setAttachedFiles(attachedFiles);
          }
        }

        // Call complete with streaming for providers that support it
        if (provider instanceof ClaudeCodeProvider || provider instanceof OpenCodeProvider) {
          response = await provider.complete(conversationMessages, AGENT_TOOLS, onChunk, mode);
        } else {
          // Other providers - no mode parameter support
          response = await provider.complete(conversationMessages, AGENT_TOOLS);
        }

        // Clear attached files after use
        if ('setAttachedFiles' in provider && typeof provider.setAttachedFiles === 'function') {
          provider.setAttachedFiles([]);
        }

        // Parse and execute inline tool calls from content (JSON blocks)
        const { cleanedContent, results: inlineResults } = await parseAndExecuteInlineTools(response.content, mode);
        allToolResults.push(...inlineResults);

        // Process OpenCode todos if any were collected
        console.log('[Chat] Provider type:', provider.getName(), 'isOpenCode:', provider instanceof OpenCodeProvider);
        if (provider instanceof OpenCodeProvider) {
          const collectedTodos = provider.getCollectedTodos();
          console.log('[Chat] OpenCode collected todos:', collectedTodos.length, JSON.stringify(collectedTodos.slice(0, 2)));
          if (collectedTodos.length > 0) {
            console.log('[Chat] Processing OpenCode todos:', collectedTodos.length);
            const todoResults = await processOpenCodeTodos(collectedTodos, mode);
            allToolResults.push(...todoResults);

            // Add summary to content if tasks were created
            const createdCount = todoResults.filter(r => r.success).length;
            if (createdCount > 0) {
              const taskSummary = `\n\n✅ **Created ${createdCount} tasks in Dexteria**`;
              response.content = (cleanedContent || response.content) + taskSummary;
            }

            // Clear collected todos
            provider.clearCollectedTodos();
          }
        }

        // Handle structured tool calls if provider returned them
        const structuredToolCalls = response.toolCalls || [];

        if (structuredToolCalls.length > 0) {
          console.log('[Chat] Executing structured tool calls:', structuredToolCalls.map(t => t.name));

          const toolResultsForClaude: string[] = [];

          for (const toolCall of structuredToolCalls) {
            const result = await executeToolCall(toolCall.name, toolCall.arguments, mode);
            allToolResults.push(result);
            console.log(`[Chat] Tool ${toolCall.name} result:`, result.success ? 'success' : result.error);

            // Format result for Claude
            if (result.success) {
              toolResultsForClaude.push(`Tool "${toolCall.name}" succeeded:\n${JSON.stringify(result.result, null, 2)}`);
            } else {
              toolResultsForClaude.push(`Tool "${toolCall.name}" failed: ${result.error}`);
            }
          }

          // Add assistant's response and tool results to conversation
          conversationMessages.push({
            role: 'assistant',
            content: cleanedContent || `[Executing tools: ${structuredToolCalls.map(t => t.name).join(', ')}]`
          });

          // Add tool results as a system message for Claude to see
          conversationMessages.push({
            role: 'user',
            content: `[TOOL RESULTS]\n${toolResultsForClaude.join('\n\n')}\n\n[Continue your response based on these results. Remember to explain what you found or did.]`
          });

          // Continue the loop to get Claude's next response
          console.log('[Chat] Continuing conversation with tool results...');
        } else {
          // No more tool calls - we're done
          finalResponse = { content: cleanedContent, toolCalls: structuredToolCalls };
          break;
        }
      }

      // Log executed tools summary
      if (allToolResults.length > 0) {
        console.log(`[Chat] Executed ${allToolResults.length} tools total:`, allToolResults.map(r => `${r.name}:${r.success ? 'ok' : 'fail'}`));
      }

      const finalContent = finalResponse?.content || accumulated;

      // Process final content for any remaining delimiters
      const { current: lastMessageContent, completed: finalCompleted } = processContentWithDelimiters(finalContent);

      // Add any remaining completed messages we haven't processed yet
      for (let i = completedMessages.length; i < finalCompleted.length; i++) {
        completedMessages.push(finalCompleted[i]);
      }

      // Add the last message content if not empty
      if (lastMessageContent.trim()) {
        completedMessages.push(lastMessageContent.trim());
      }

      // If no messages were split, treat the whole content as one message
      if (completedMessages.length === 0 && finalContent.trim()) {
        completedMessages.push(finalContent.trim());
      }

      // Send final update
      sendUpdate(filterToolJsonForStreaming(completedMessages[completedMessages.length - 1] || ''), true, completedMessages.length > 1);

      // Execute chat:afterResponse hooks on each completed message
      const processedMessages: string[] = [];
      for (const msgContent of completedMessages) {
        if (msgContent.trim()) {
          let processedResponse = msgContent;
          if (pluginManager) {
            const hookResult = await pluginManager.executeAfterResponseHooks({
              response: msgContent,
              chatId,
            });
            processedResponse = hookResult.response;
          }
          processedMessages.push(processedResponse);
        }
      }

      // 4. Add Assistant Messages (one for each split message)
      const assistantMessages: ChatMessage[] = [];
      for (const msgContent of processedMessages) {
        if (msgContent.trim()) {
          const assistantMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: msgContent,
            timestamp: Date.now()
          };
          assistantMessages.push(assistantMsg);
          chat.messages.push(assistantMsg);
        }
      }

      chat.updatedAt = new Date().toISOString();
      s.saveChat(chat);

      // Return the last assistant message (for backwards compatibility)
      return assistantMessages[assistantMessages.length - 1] || null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Chat error:', errorMsg);
      sendUpdate(`Error: ${errorMsg}`, true);
      throw error;
    }
  });
}
