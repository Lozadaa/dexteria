/**
 * OpenCodeProvider
 *
 * Uses OpenCode CLI as the LLM backend.
 * OpenCode is an open-source alternative to Claude Code.
 * See: https://github.com/sst/opencode
 */

import { spawn, spawnSync } from 'child_process';
import { AgentProvider, AgentProviderConfig } from '../AgentProvider';
import type {
  AgentMessage,
  AgentToolDefinition,
  AgentResponse,
  AgentToolCall,
  ProjectContext,
} from '../../../shared/types';
import { OpenCodeInstaller } from '../../services/OpenCodeInstaller';

export interface OpenCodeProviderConfig extends AgentProviderConfig {
  binaryPath?: string; // Path to opencode executable
  workingDirectory?: string;
  timeout?: number; // Timeout in ms
}

/**
 * Provider that uses OpenCode CLI for LLM interactions.
 */
// Todowrite task from OpenCode
export interface OpenCodeTodo {
  id?: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
}

export class OpenCodeProvider extends AgentProvider {
  private binaryPath: string;
  private workingDirectory: string;
  private timeout: number;
  private ready: boolean = false;
  private currentProcess: ReturnType<typeof spawn> | null = null;
  private currentTimeout: NodeJS.Timeout | null = null;
  private cancelled: boolean = false;
  private projectContext: ProjectContext | null = null;
  private attachedFiles: string[] = [];
  private collectedTodos: OpenCodeTodo[] = [];
  private onTodoCallback?: (todos: OpenCodeTodo[]) => void;

  constructor(config: OpenCodeProviderConfig = {}) {
    super(config);
    this.binaryPath = config.binaryPath || OpenCodeInstaller.getBinaryPath();
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.timeout = config.timeout || 1800000; // 30 minutes default

    // Check if opencode is available
    this.checkOpenCodeAvailable();
  }

  getName(): string {
    return 'OpenCode';
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if OpenCode CLI is available (synchronous).
   */
  private checkOpenCodeAvailable(): void {
    try {
      const result = spawnSync(this.binaryPath, ['--version'], {
        cwd: this.workingDirectory,
        timeout: 10000,
        encoding: 'utf-8',
        windowsHide: true,
      });

      if (result.status === 0 && result.stdout) {
        this.ready = true;
        console.log('[OpenCode] Available:', result.stdout.trim());
      } else {
        this.ready = false;
        console.log('[OpenCode] Not available, status:', result.status);
      }
    } catch (error) {
      console.warn('[OpenCode] Not available:', error);
      this.ready = false;
    }
  }

  /**
   * Cancel the current execution.
   */
  cancel(): void {
    this.cancelled = true;

    // Clear timeout to prevent memory leaks
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    if (this.currentProcess) {
      console.log('[OpenCode] Cancelling current process');
      try {
        // Kill the process tree on Windows
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.currentProcess.pid), '/f', '/t'], { shell: true });
        } else {
          this.currentProcess.kill('SIGTERM');
        }
      } catch (e) {
        console.error('[OpenCode] Error killing process:', e);
      }
      this.currentProcess = null;
    }
  }

  /**
   * Check if currently running.
   */
  isExecuting(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Execute an opencode command with streaming JSON output.
   * Parses NDJSON events and streams text in real-time.
   *
   * OpenCode CLI syntax: opencode run --format json < prompt
   * Uses stdin for prompt to avoid command line length limits on Windows.
   */
  private executeStreamingCommand(args: string[], onChunk?: (chunk: string) => void, stdinData?: string): Promise<string> {
    this.cancelled = false;

    return new Promise((resolve, reject) => {
      console.log('[OpenCode] Spawning opencode with args:', args.slice(0, 3), '(prompt via stdin)');

      const proc = spawn(this.binaryPath, args, {
        cwd: this.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,  // Critical: pass environment variables (API keys, etc.)
        windowsHide: true,
      });

      // Write prompt to stdin and close it
      if (stdinData && proc.stdin) {
        proc.stdin.write(stdinData);
        proc.stdin.end();
      }

      // Track the current process for cancellation
      this.currentProcess = proc;

      let fullContent = '';
      let stderr = '';
      let lineBuffer = '';

      // Typing effect - queue text and type character by character
      let typingQueue = '';
      let isTyping = false;

      const processTypingQueue = async () => {
        if (isTyping || typingQueue.length === 0 || !onChunk) return;
        isTyping = true;

        while (typingQueue.length > 0) {
          // Send characters in small batches (3-5 chars at a time for speed)
          const batchSize = Math.min(4, typingQueue.length);
          const batch = typingQueue.substring(0, batchSize);
          typingQueue = typingQueue.substring(batchSize);
          onChunk(batch);
          await new Promise(r => setTimeout(r, 10));
        }

        isTyping = false;
      };

      const typeText = (text: string) => {
        if (!onChunk || !text) return;
        typingQueue += text;
        processTypingQueue();
      };

      // Track displayed content to build full output
      let displayedContent = '';

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        lineBuffer += chunk;

        // Process complete lines (NDJSON format)
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);

            // Debug: log event type and full structure for debugging
            console.log('[OpenCode] Event:', event.type, JSON.stringify(event).substring(0, 400));

            // Log tool-related events specially - check for many possible formats
            if (event.type === 'tool_use' || event.type === 'tool_result' || event.type === 'tool_call' ||
                event.type === 'TodoWrite' || event.type === 'todowrite' ||
                (event.part && (event.part.tool || event.part.name))) {
              console.log('[OpenCode] TOOL EVENT type:', event.type, 'has part:', !!event.part,
                'part.tool:', event.part?.tool, 'part.name:', event.part?.name,
                'full event keys:', Object.keys(event),
                'part keys:', event.part ? Object.keys(event.part) : 'none');
            }

            // Also check for todos in any event type
            if (event.todos || event.part?.todos || event.part?.state?.input?.todos ||
                event.input?.todos || event.message?.content?.[0]?.input?.todos) {
              console.log('[OpenCode] FOUND TODOS in event!', event.type,
                'direct:', !!event.todos,
                'part.todos:', !!event.part?.todos,
                'state.input.todos:', !!event.part?.state?.input?.todos);
            }

            // Handle different event types from OpenCode CLI
            // OpenCode uses similar event format to Claude Code

            // Assistant message with content
            if (event.type === 'assistant' && event.message?.content) {
              const content = event.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  // Text content
                  if (block.type === 'text' && block.text) {
                    // Only add if we haven't seen this exact text
                    if (!displayedContent.endsWith(block.text)) {
                      const newText = block.text;
                      displayedContent += newText;
                      fullContent = displayedContent;
                      typeText(newText);
                    }
                  }
                  // Tool use - show what tool is being called
                  else if (block.type === 'tool_use') {
                    const toolName = block.name || 'unknown';
                    const toolNameLower = toolName.toLowerCase();
                    const toolInput = block.input || {};
                    let toolDesc = `\n🔧 ${toolName}`;

                    // Intercept TodoWrite to collect tasks (case-insensitive)
                    if (toolNameLower === 'todowrite' && toolInput.todos && Array.isArray(toolInput.todos)) {
                      console.log('[OpenCode] TODOWRITE INTERCEPTED (assistant block)! todos count:', toolInput.todos.length);
                      console.log('[OpenCode] Raw todos sample (assistant):', JSON.stringify(toolInput.todos[0]));
                      // Map to our format in case field names differ
                      const newTodos: OpenCodeTodo[] = toolInput.todos.map((t: Record<string, unknown>) => ({
                        id: t.id as string | undefined,
                        content: (t.content || t.title || t.text || String(t)) as string,
                        status: (t.status as 'pending' | 'in_progress' | 'completed') || 'pending',
                        priority: t.priority as 'low' | 'medium' | 'high' | undefined,
                      }));
                      this.collectedTodos = newTodos;
                      console.log('[OpenCode] Mapped todos (assistant):', JSON.stringify(newTodos.slice(0, 2)));

                      if (this.onTodoCallback) {
                        this.onTodoCallback(newTodos);
                      }

                      const pendingCount = newTodos.filter(t => t.status !== 'completed').length;
                      toolDesc = `\n📋 Task list updated (${pendingCount} pending)`;
                    }
                    // Add descriptive info based on tool type
                    else if (toolName === 'Read' && toolInput.file_path) {
                      toolDesc = `\n📖 Reading: \`${toolInput.file_path}\``;
                    } else if (toolName === 'Write' && toolInput.file_path) {
                      toolDesc = `\n✏️ Writing: \`${toolInput.file_path}\``;
                    } else if (toolName === 'Edit' && toolInput.file_path) {
                      toolDesc = `\n📝 Editing: \`${toolInput.file_path}\``;
                    } else if (toolName === 'Bash' && toolInput.command) {
                      const cmd = String(toolInput.command).substring(0, 100);
                      toolDesc = `\n💻 Running: \`${cmd}\``;
                    } else if (toolName === 'Glob' && toolInput.pattern) {
                      toolDesc = `\n🔍 Searching: \`${toolInput.pattern}\``;
                    } else if (toolName === 'Grep' && toolInput.pattern) {
                      toolDesc = `\n🔎 Grep: \`${toolInput.pattern}\``;
                    } else if (toolName === 'Task') {
                      toolDesc = `\n🤖 Spawning agent...`;
                    } else if (toolNameLower === 'todowrite') {
                      toolDesc = `\n📋 Updating task list...`;
                    }

                    displayedContent += toolDesc;
                    fullContent = displayedContent;
                    typeText(toolDesc);
                  }
                }
              }
            }
            // Content block delta (streaming text)
            else if (event.type === 'content_block_delta' && event.delta?.text) {
              const deltaText = event.delta.text;
              displayedContent += deltaText;
              fullContent = displayedContent;
              typeText(deltaText);
            }
            // Tool result - just add a subtle indicator that tool completed
            else if (event.type === 'tool_result') {
              // Don't show raw tool output - just indicate completion with checkmark
              const doneText = ' ✓';
              displayedContent += doneText;
              fullContent = displayedContent;
              typeText(doneText);
            }
            // Final result
            else if (event.type === 'result' && event.result) {
              // If result has new content not yet displayed
              if (event.result.length > displayedContent.length) {
                const newContent = event.result.substring(displayedContent.length);
                displayedContent = event.result;
                fullContent = displayedContent;
                typeText(newContent);
              }
            }
            // Handle text events (OpenCode format: event.part.text)
            else if (event.type === 'text') {
              // OpenCode puts text in event.part.text
              const textContent = event.part?.text || event.text || '';
              if (textContent) {
                displayedContent += textContent;
                fullContent = displayedContent;
                typeText(textContent);
              }
            }
            // Handle step events (OpenCode uses these for progress)
            else if (event.type === 'step_start' || event.type === 'step_finish') {
              // Log step info but don't add to content
              console.log('[OpenCode] Step:', event.type, event.step || event.name || '');
            }
            // Handle tool_use events (OpenCode format: event.part with tool info)
            else if (event.type === 'tool_use' && event.part) {
              const toolName = event.part.tool || event.part.name || 'unknown';
              const toolNameLower = toolName.toLowerCase();
              const toolInput = event.part.state?.input || event.part.input || {};
              let toolDesc = `\n🔧 ${toolName}`;

              console.log('[OpenCode] tool_use detected:', toolName, 'toolNameLower:', toolNameLower, 'has todos:', !!toolInput.todos);

              // Intercept todowrite events to collect tasks (case-insensitive)
              if (toolNameLower === 'todowrite' && toolInput.todos && Array.isArray(toolInput.todos)) {
                console.log('[OpenCode] TODOWRITE INTERCEPTED! todos count:', toolInput.todos.length);
                console.log('[OpenCode] Raw todos sample:', JSON.stringify(toolInput.todos[0]));
                // Collect todos for later processing - map to our format in case field names differ
                const newTodos: OpenCodeTodo[] = toolInput.todos.map((t: Record<string, unknown>) => ({
                  id: t.id as string | undefined,
                  content: (t.content || t.title || t.text || String(t)) as string,
                  status: (t.status as 'pending' | 'in_progress' | 'completed') || 'pending',
                  priority: t.priority as 'low' | 'medium' | 'high' | undefined,
                }));
                this.collectedTodos = newTodos;
                console.log('[OpenCode] Mapped todos:', JSON.stringify(newTodos.slice(0, 2)));
                console.log('[OpenCode] Collected todos:', newTodos.length);

                // Notify callback if registered
                if (this.onTodoCallback) {
                  this.onTodoCallback(newTodos);
                }

                // Show a nice indicator
                const pendingCount = newTodos.filter(t => t.status !== 'completed').length;
                toolDesc = `\n📋 Task list updated (${pendingCount} pending)`;
              }
              // Add descriptive info based on tool type (case-insensitive)
              else if (toolNameLower === 'read' && (toolInput.file_path || toolInput.filePath)) {
                toolDesc = `\n📖 Reading: \`${toolInput.file_path || toolInput.filePath}\``;
              } else if (toolNameLower === 'write' && (toolInput.file_path || toolInput.filePath)) {
                toolDesc = `\n✏️ Writing: \`${toolInput.file_path || toolInput.filePath}\``;
              } else if (toolNameLower === 'edit' && (toolInput.file_path || toolInput.filePath)) {
                toolDesc = `\n📝 Editing: \`${toolInput.file_path || toolInput.filePath}\``;
              } else if (toolNameLower === 'bash' && (toolInput.command || toolInput.description)) {
                const cmd = String(toolInput.description || toolInput.command).substring(0, 100);
                toolDesc = `\n💻 Running: \`${cmd}\``;
              } else if (toolNameLower === 'glob' && toolInput.pattern) {
                toolDesc = `\n🔍 Searching: \`${toolInput.pattern}\``;
              } else if (toolNameLower === 'grep' && toolInput.pattern) {
                toolDesc = `\n🔎 Grep: \`${toolInput.pattern}\``;
              } else if (toolNameLower === 'task') {
                toolDesc = `\n🤖 Spawning agent...`;
              }

              displayedContent += toolDesc;
              fullContent = displayedContent;
              typeText(toolDesc);
            }
            // Fallback: any event with part.text we haven't caught
            else if (event.part?.text) {
              const partText = event.part.text;
              if (!displayedContent.endsWith(partText)) {
                displayedContent += partText;
                fullContent = displayedContent;
                typeText(partText);
              }
            }
          } catch (parseError) {
            // Not valid JSON - might be plain text output
            // Just add it directly
            displayedContent += line + '\n';
            fullContent = displayedContent;
            typeText(line + '\n');
          }
        }
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.log('[OpenCode] stderr:', data.toString());
      });

      // Store timeout reference for cleanup on cancel
      this.currentTimeout = setTimeout(() => {
        console.log('[OpenCode] TIMEOUT');
        this.currentTimeout = null;
        proc.kill();
        reject(new Error('OpenCode timed out'));
      }, this.timeout);

      proc.on('close', (code) => {
        // Clear timeout
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout);
          this.currentTimeout = null;
        }
        this.currentProcess = null;

        // Check if cancelled
        if (this.cancelled) {
          console.log('[OpenCode] Process was cancelled');
          reject(new Error('Cancelled'));
          return;
        }

        // Process any remaining content in buffer
        if (lineBuffer.trim()) {
          try {
            const event = JSON.parse(lineBuffer);
            if (event.text) fullContent += event.text;
            else if (event.result) fullContent += event.result;
            else if (event.content) fullContent += event.content;
          } catch {
            fullContent += lineBuffer;
          }
        }

        console.log('[OpenCode] Closed with code:', code, 'content length:', fullContent.length);
        console.log('[OpenCode] Final content preview:', fullContent.substring(0, 200));

        if (code === 0 || fullContent.length > 0) {
          resolve(fullContent);
        } else {
          reject(new Error(stderr || `OpenCode exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        // Clear timeout
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout);
          this.currentTimeout = null;
        }
        this.currentProcess = null;
        console.log('[OpenCode] Error:', error);
        reject(error);
      });
    });
  }

  /**
   * Build a prompt from messages for OpenCode.
   * OpenCode has its own tools (Read, Write, Bash, etc.) so we don't add our own tool definitions.
   * We just pass the conversation with minimal context.
   */
  private buildPrompt(messages: AgentMessage[], _tools?: AgentToolDefinition[], mode: 'planner' | 'agent' | 'execution' = 'planner'): string {
    // Get the last user message - this is what we send to OpenCode
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

    // For OpenCode, we send a simple prompt
    // OpenCode handles its own system prompt and tools
    let prompt = '';

    // Add project context if available
    if (this.projectContext) {
      prompt += `Project: ${this.projectContext.name}\n`;
      if (this.projectContext.description) {
        prompt += `Description: ${this.projectContext.description}\n`;
      }
      prompt += '\n';
    }

    // Add mode hint - planner can READ but not WRITE
    if (mode === 'planner') {
      prompt += `[Mode: Planner]
You CAN use these tools to analyze: Read, Glob, Grep, Search, list files
You CANNOT use: Write, Edit, Bash, or any tool that modifies files/runs commands
Analyze thoroughly, then provide recommendations.\n\n`;
    } else {
      prompt += `[Mode: Agent]
You have full access to all tools: Read, Write, Edit, Bash, Glob, Grep, etc.
Execute the requested changes.\n\n`;
    }

    // Add conversation history for context (last few messages)
    const recentMessages = messages.slice(-6); // Last 3 exchanges
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n\n`;
      }
    }

    // If no history, just the last message
    if (recentMessages.length === 0 && lastUserMessage) {
      prompt += lastUserMessage;
    }

    return prompt.trim();
  }

  /**
   * Parse tool calls from OpenCode's response.
   */
  private parseToolCalls(content: string): AgentToolCall[] {
    const toolCalls: AgentToolCall[] = [];

    // Look for JSON blocks with tool calls
    const jsonBlockRegex = /```json\s*\n?([\s\S]*?)\n?```/g;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tool && parsed.arguments) {
          toolCalls.push({
            id: `call_${Date.now()}_${toolCalls.length}`,
            name: parsed.tool,
            arguments: parsed.arguments,
          });
        }
      } catch {
        // Not a valid tool call JSON, skip
      }
    }

    // Also try to find tool call JSON objects in the text
    // This handles inline tool calls with complex nested arguments
    const toolCallPattern = /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*/g;

    while ((match = toolCallPattern.exec(content)) !== null) {
      const toolName = match[1];
      const argsStart = match.index + match[0].length;

      // Find the matching closing brace for the arguments object
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      let argsEnd = argsStart;

      for (let i = argsStart; i < content.length; i++) {
        const char = content[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\' && inString) {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{' || char === '[') {
          braceCount++;
        } else if (char === '}' || char === ']') {
          braceCount--;
          if (braceCount === 0) {
            argsEnd = i + 1;
            break;
          }
        }
      }

      if (argsEnd > argsStart) {
        const argsJson = content.substring(argsStart, argsEnd);
        try {
          const args = JSON.parse(argsJson);
          // Avoid duplicates from code blocks
          const isDuplicate = toolCalls.some(
            tc => tc.name === toolName && JSON.stringify(tc.arguments) === JSON.stringify(args)
          );
          if (!isDuplicate) {
            toolCalls.push({
              id: `call_${Date.now()}_${toolCalls.length}`,
              name: toolName,
              arguments: args,
            });
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    return toolCalls;
  }

  /**
   * Remove tool call JSON blocks from content for cleaner output.
   */
  private cleanContent(content: string): string {
    // Remove JSON code blocks
    let cleaned = content.replace(/```json\s*\n?[\s\S]*?\n?```/g, '');
    // Remove inline tool call JSON
    cleaned = cleaned.replace(/\{"tool"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[^}]+\}\}/g, '');
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return cleaned;
  }

  async complete(
    messages: AgentMessage[],
    tools?: AgentToolDefinition[],
    onChunk?: (chunk: string) => void,
    mode: 'planner' | 'agent' | 'execution' = 'planner'
  ): Promise<AgentResponse> {
    if (!this.ready) {
      // Try to check again
      this.checkOpenCodeAvailable();
      if (!this.ready) {
        return {
          content: 'Error: OpenCode CLI is not available. Please ensure it is installed.',
          finishReason: 'error',
        };
      }
    }

    try {
      const prompt = this.buildPrompt(messages, tools, mode);

      // OpenCode CLI syntax: opencode run --format json [-f file1 -f file2 ...] < prompt
      // - run: Non-interactive mode
      // - --format json: Output as NDJSON events for streaming
      // - -f: Attach files to the message
      // - Working directory is set via spawn's cwd option
      // - Prompt is passed via stdin to avoid Windows command line length limits
      const args = [
        'run',
        '--format', 'json',
      ];

      // Add attached files using -f flag
      for (const filePath of this.attachedFiles) {
        args.push('-f', filePath);
      }

      console.log('[OpenCode] Working directory:', this.workingDirectory);
      console.log('[OpenCode] Args:', args);
      console.log('[OpenCode] Attached files:', this.attachedFiles);
      console.log('[OpenCode] Prompt preview:', prompt.substring(0, 300));

      const response = await this.executeStreamingCommand(args, onChunk, prompt);

      // Handle empty response
      if (!response || response.trim().length === 0) {
        console.warn('[OpenCode] Empty response received');
        return {
          content: 'OpenCode returned an empty response. The AI may still be processing or there might be an issue with the request.',
          finishReason: 'stop',
        };
      }

      // Parse tool calls from response
      const toolCalls = this.parseToolCalls(response);
      const cleanedContent = this.cleanContent(response);

      // Determine finish reason
      let finishReason: AgentResponse['finishReason'] = 'stop';
      if (toolCalls.length > 0) {
        finishReason = 'tool_calls';
      }

      // Ensure content is never null/undefined
      const finalContent = cleanedContent || response || '';

      return {
        content: finalContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('OpenCode error:', errorMessage);

      return {
        content: `Error calling OpenCode: ${errorMessage}`,
        finishReason: 'error',
      };
    }
  }

  /**
   * Set attached files for the next message.
   */
  setAttachedFiles(files: string[]): void {
    this.attachedFiles = files;
    console.log('[OpenCode] Attached files set:', files);
  }

  /**
   * Get attached files.
   */
  getAttachedFiles(): string[] {
    return this.attachedFiles;
  }

  /**
   * Set working directory for OpenCode commands.
   */
  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }

  /**
   * Set project context to include in prompts.
   */
  setProjectContext(context: ProjectContext | null): void {
    this.projectContext = context;
    console.log('[OpenCode] Project context set:', context?.name || 'null');
  }

  /**
   * Get current project context.
   */
  getProjectContext(): ProjectContext | null {
    return this.projectContext;
  }

  /**
   * Get collected todos from the last OpenCode run.
   * These are captured from todowrite tool events.
   */
  getCollectedTodos(): OpenCodeTodo[] {
    return this.collectedTodos;
  }

  /**
   * Clear collected todos.
   */
  clearCollectedTodos(): void {
    this.collectedTodos = [];
  }

  /**
   * Set callback for todo events.
   * Called whenever OpenCode's todowrite tool is invoked.
   */
  setOnTodoCallback(callback: ((todos: OpenCodeTodo[]) => void) | undefined): void {
    this.onTodoCallback = callback;
  }
}

/**
 * Create an OpenCode provider.
 */
export function createOpenCodeProvider(config?: OpenCodeProviderConfig): OpenCodeProvider {
  return new OpenCodeProvider(config);
}
