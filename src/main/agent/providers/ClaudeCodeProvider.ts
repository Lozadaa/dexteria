/**
 * ClaudeCodeProvider
 *
 * Uses Claude Code CLI as the LLM backend instead of direct API calls.
 * This allows leveraging the user's existing Claude Code authentication.
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
import { PromptBuilder } from '../prompts';

export interface ClaudeCodeProviderConfig extends AgentProviderConfig {
  claudePath?: string; // Path to claude executable, defaults to 'claude'
  workingDirectory?: string;
  timeout?: number; // Timeout in ms
}

/**
 * Provider that uses Claude Code CLI for LLM interactions.
 */
export class ClaudeCodeProvider extends AgentProvider {
  private claudePath: string;
  private workingDirectory: string;
  private timeout: number;
  private ready: boolean = false;
  private currentProcess: ReturnType<typeof spawn> | null = null;
  private cancelled: boolean = false;
  private projectContext: ProjectContext | null = null;

  constructor(config: ClaudeCodeProviderConfig = {}) {
    super(config);
    this.claudePath = config.claudePath || 'claude';
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.timeout = config.timeout || 1800000; // 30 minutes default (no rush)

    // Check if claude is available
    this.checkClaudeAvailable();
  }

  getName(): string {
    return 'Claude Code';
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if Claude Code CLI is available (synchronous).
   */
  private checkClaudeAvailable(): void {
    try {
      const result = spawnSync(this.claudePath, ['--version'], {
        cwd: this.workingDirectory,
        shell: true,
        timeout: 10000,
        encoding: 'utf-8',
      });

      if (result.status === 0 && result.stdout) {
        this.ready = result.stdout.includes('claude') || result.stdout.length > 0;
      } else {
        this.ready = false;
      }
      console.log('Claude Code available:', this.ready);
    } catch (error) {
      console.warn('Claude Code not available:', error);
      this.ready = false;
    }
  }

  /**
   * Cancel the current execution.
   */
  cancel(): void {
    this.cancelled = true;
    if (this.currentProcess) {
      console.log('[ClaudeCode] Cancelling current process');
      try {
        // Kill the process tree on Windows
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.currentProcess.pid), '/f', '/t'], { shell: true });
        } else {
          this.currentProcess.kill('SIGTERM');
        }
      } catch (e) {
        console.error('[ClaudeCode] Error killing process:', e);
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
   * Execute a claude command with streaming JSON output.
   * Parses NDJSON events and streams text in real-time.
   */
  private executeStreamingCommand(args: string[], prompt: string, onChunk?: (chunk: string) => void): Promise<string> {
    this.cancelled = false;

    return new Promise((resolve, reject) => {
      console.log('[ClaudeCode] Spawning claude with streaming args:', args);

      const proc = spawn(this.claudePath, args, {
        cwd: this.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true,
      });

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

      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        lineBuffer += chunk;

        // Process complete lines (NDJSON format)
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);

            // Debug: log event type
            console.log('[ClaudeCode] Event:', event.type);

            // Handle different event types from Claude Code CLI

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
                    const toolInput = block.input || {};
                    let toolDesc = `\n🔧 ${toolName}`;

                    // Add descriptive info based on tool type
                    if (toolName === 'Read' && toolInput.file_path) {
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
                    } else if (toolName === 'TodoWrite') {
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
          } catch (parseError) {
            // Not valid JSON - skip
          }
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[ClaudeCode] stderr:', data.toString());
      });

      const timeoutId = setTimeout(() => {
        console.log('[ClaudeCode] TIMEOUT');
        proc.kill();
        reject(new Error('Claude Code timed out'));
      }, this.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        this.currentProcess = null;

        // Check if cancelled
        if (this.cancelled) {
          console.log('[ClaudeCode] Process was cancelled');
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

        console.log('[ClaudeCode] Closed with code:', code, 'content length:', fullContent.length);

        if (code === 0 || fullContent.length > 0) {
          resolve(fullContent);
        } else {
          reject(new Error(stderr || `Claude exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        this.currentProcess = null;
        console.log('[ClaudeCode] Error:', error);
        reject(error);
      });

      // Write prompt to stdin
      proc.stdin.write(prompt, 'utf-8', (err) => {
        if (err) {
          console.log('[ClaudeCode] stdin write error:', err);
        }
        proc.stdin.end();
        console.log('[ClaudeCode] stdin closed, waiting for streaming response...');
      });
    });
  }

  /**
   * Get system prompt based on mode.
   * Uses the centralized PromptBuilder for consistent prompts.
   */
  private getSystemPrompt(mode: 'planner' | 'agent'): string {
    // Map mode to PromptMode type
    const promptMode = mode === 'planner' ? 'planner' : 'agent';

    // Build system prompt using centralized PromptBuilder
    return PromptBuilder.buildSystemPrompt({
      mode: promptMode,
      projectContext: this.projectContext ? {
        name: this.projectContext.name,
        description: this.projectContext.description,
        purpose: this.projectContext.purpose,
        architecture: this.projectContext.architecture,
        devWorkflow: this.projectContext.devWorkflow,
        constraints: this.projectContext.constraints,
      } : undefined,
    });
  }

  /**
   * Build a prompt from messages for Claude Code.
   * Note: Project context is now included via PromptBuilder.buildSystemPrompt()
   */
  private buildPrompt(messages: AgentMessage[], tools?: AgentToolDefinition[], mode: 'planner' | 'agent' = 'planner'): string {
    let prompt = '';

    // Add default system prompt based on mode (includes project context)
    prompt += this.getSystemPrompt(mode);
    prompt += '\n\n---\n\n';

    // Add any additional system messages
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length > 0) {
      prompt += systemMessages.map(m => m.content).join('\n\n');
      prompt += '\n\n---\n\n';
    }

    // Add tool definitions if available
    if (tools && tools.length > 0) {
      prompt += '## Available Tools\n\n';
      prompt += 'You can use the following tools by responding with a JSON block:\n\n';
      for (const tool of tools) {
        prompt += `### ${tool.name}\n`;
        prompt += `${tool.description}\n`;
        prompt += `Parameters: ${JSON.stringify(tool.parameters, null, 2)}\n\n`;
      }
      prompt += 'To use a tool, respond with:\n';
      prompt += '```json\n{"tool": "tool_name", "arguments": {...}}\n```\n\n';
      prompt += '---\n\n';
    }

    // Add conversation history
    const conversationMessages = messages.filter(m => m.role !== 'system');
    for (const msg of conversationMessages) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n\n`;
      }
    }

    return prompt;
  }

  /**
   * Parse tool calls from Claude's response.
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
    mode: 'planner' | 'agent' = 'planner'
  ): Promise<AgentResponse> {
    if (!this.ready) {
      // Try to check again
      this.checkClaudeAvailable();
      if (!this.ready) {
        return {
          content: 'Error: Claude Code CLI is not available. Please ensure it is installed and in your PATH.',
          finishReason: 'error',
        };
      }
    }

    try {
      const prompt = this.buildPrompt(messages, tools, mode);

      // Use claude with streaming JSON output for real-time feedback
      // See: https://docs.anthropic.com/claude-code/streaming
      const args = [
        '-p',                              // Print mode (non-interactive)
        '--dangerously-skip-permissions',  // Skip permission prompts
        '--output-format', 'stream-json',  // Enable streaming JSON (NDJSON)
        '--verbose',                       // Required for stream-json with -p
      ];

      const response = await this.executeStreamingCommand(args, prompt, onChunk);

      // Parse tool calls from response
      const toolCalls = this.parseToolCalls(response);
      const cleanedContent = this.cleanContent(response);

      // Determine finish reason
      let finishReason: AgentResponse['finishReason'] = 'stop';
      if (toolCalls.length > 0) {
        finishReason = 'tool_calls';
      }

      return {
        content: cleanedContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Claude Code error:', errorMessage);

      return {
        content: `Error calling Claude Code: ${errorMessage}`,
        finishReason: 'error',
      };
    }
  }

  /**
   * Set working directory for Claude Code commands.
   */
  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }

  /**
   * Set project context to include in prompts.
   */
  setProjectContext(context: ProjectContext | null): void {
    this.projectContext = context;
    console.log('[ClaudeCode] Project context set:', context?.name || 'null');
  }

  /**
   * Get current project context.
   */
  getProjectContext(): ProjectContext | null {
    return this.projectContext;
  }
}

/**
 * Create a Claude Code provider.
 */
export function createClaudeCodeProvider(config?: ClaudeCodeProviderConfig): ClaudeCodeProvider {
  return new ClaudeCodeProvider(config);
}
