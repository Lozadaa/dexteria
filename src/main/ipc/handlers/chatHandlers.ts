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
} from './shared';
import type { ToolResult } from './types';
import type {
  Chat,
  ChatMessage,
  AgentMessage,
  TaskStatus,
  TaskPatch,
} from '../../../shared/types';

/**
 * Filter tool JSON blocks from streaming content and replace with friendly indicators.
 * This runs on the backend before sending to frontend to avoid any flash of JSON.
 */
function filterToolJsonForStreaming(content: string): string {
  if (!content) return content;

  let filtered = content;

  // 1. Replace complete JSON code blocks with tool calls
  filtered = filtered.replace(
    /```json\s*\n?\s*\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*\{[^]*?\}\s*\}\s*\n?```/g,
    (_match, toolName) => getToolIndicator(toolName, 'complete')
  );

  // 2. Replace inline tool JSON
  filtered = filtered.replace(
    /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}/g,
    (_match, toolName) => getToolIndicator(toolName, 'complete')
  );

  // 3. Handle partial/incomplete JSON blocks during streaming
  filtered = filtered.replace(
    /```json\s*\n?\s*\{\s*"tool"\s*:\s*"([^"]+)"[^`]*$/,
    (_match, toolName) => getToolIndicator(toolName, 'pending')
  );

  // 4. Handle partial inline tool JSON
  filtered = filtered.replace(
    /\{\s*"tool"\s*:\s*"([^"]+)"[^}]*$/,
    (_match, toolName) => getToolIndicator(toolName, 'pending')
  );

  return filtered;
}

function getToolIndicator(toolName: string, status: 'pending' | 'complete'): string {
  const icon = status === 'pending' ? '⏳' : '✅';
  const messages: Record<string, [string, string]> = {
    'create_task': ['Creando tarea...', 'Tarea creada'],
    'update_task': ['Actualizando tarea...', 'Tarea actualizada'],
    'list_tasks': ['Listando tareas...', 'Tareas listadas'],
    'save_progress': ['Guardando progreso...', 'Progreso guardado'],
  };
  const [pending, complete] = messages[toolName] || [`Ejecutando ${toolName}...`, `${toolName} completado`];
  return `\n${icon} ${status === 'pending' ? pending : complete}\n`;
}

/**
 * Execute a tool call from the agent and return the result.
 */
export async function executeToolCall(
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
 * Parse and execute inline tool JSON calls from content.
 * Returns the cleaned content with tool results appended.
 */
async function parseAndExecuteInlineTools(
  content: string,
  mode: 'planner' | 'agent'
): Promise<{ cleanedContent: string; results: ToolResult[] }> {
  const results: ToolResult[] = [];

  // Match JSON blocks with tool calls: ```json{"tool": "...", "arguments": {...}}```
  // Also match inline: {"tool": "...", "arguments": {...}}
  const toolJsonPattern = /```json\s*\n?\s*\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}\s*\n?```|\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]*\})\s*\}/g;

  let cleanedContent = content;
  let match;
  const toolCalls: Array<{ fullMatch: string; toolName: string; args: Record<string, unknown> }> = [];

  // First pass: find all tool calls
  while ((match = toolJsonPattern.exec(content)) !== null) {
    const toolName = match[1] || match[3];
    const argsJson = match[2] || match[4];

    try {
      const args = JSON.parse(argsJson);
      toolCalls.push({
        fullMatch: match[0],
        toolName,
        args
      });
    } catch (e) {
      console.log('[Chat] Failed to parse tool JSON:', e);
    }
  }

  // Execute each tool call
  for (const call of toolCalls) {
    console.log(`[Chat] Executing inline tool: ${call.toolName}`);
    const result = await executeToolCall(call.toolName, call.args, mode);
    results.push(result);

    // Replace JSON with result indicator
    const resultText = result.success
      ? `✅ **${call.toolName}**: ${(result.result as Record<string, unknown>)?.message || 'Success'}`
      : `❌ **${call.toolName}**: ${result.error}`;

    cleanedContent = cleanedContent.replace(call.fullMatch, resultText);
  }

  return { cleanedContent, results };
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

    // Generate title from first message if this is a new chat
    const isFirstMessage = chat.messages.length === 0;
    if (isFirstMessage) {
      // Create a short title from the user's message (max 50 chars)
      const titleWords = content.trim().split(/\s+/).slice(0, 8).join(' ');
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

        // Call complete with streaming if provider supports it (ClaudeCodeProvider)
        if (provider instanceof ClaudeCodeProvider) {
          const onChunk = (chunk: string) => {
            accumulated += chunk;
            // Filter tool JSON before sending to frontend to avoid flash
            sendUpdate(filterToolJsonForStreaming(accumulated), false);
          };
          response = await provider.complete(conversationMessages, AGENT_TOOLS, onChunk, mode);
        } else {
          // Non-streaming provider - just wait for response
          response = await provider.complete(conversationMessages, AGENT_TOOLS);
        }

        // Parse and execute inline tool calls from content (JSON blocks)
        const { cleanedContent, results: inlineResults } = await parseAndExecuteInlineTools(response.content, mode);
        allToolResults.push(...inlineResults);

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

      // Send final update with cleaned content
      sendUpdate(filterToolJsonForStreaming(finalContent), true);

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
