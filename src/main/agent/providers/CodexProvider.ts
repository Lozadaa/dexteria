/**
 * CodexProvider
 *
 * Uses OpenAI's Codex CLI as the LLM backend.
 * Codex CLI is OpenAI's official coding agent.
 * @see https://developers.openai.com/codex/cli/
 *
 * Uses `codex exec --json` for non-interactive mode with structured output.
 */

import { spawn } from 'child_process';
import { AgentProvider, AgentProviderConfig } from '../AgentProvider';
import type {
  AgentMessage,
  AgentToolDefinition,
  AgentResponse,
  AgentToolCall,
  ProjectContext,
} from '../../../shared/types';
import { CodexInstaller } from '../../services/CodexInstaller';
import { PromptBuilder } from '../prompts';

export interface CodexProviderConfig extends AgentProviderConfig {
  binaryPath?: string; // Path to codex executable, defaults to 'codex'
  workingDirectory?: string;
  timeout?: number; // Timeout in ms
}

/**
 * Provider that uses Codex CLI for LLM interactions.
 */
export class CodexProvider extends AgentProvider {
  private binaryPath: string;
  private workingDirectory: string;
  private timeout: number;
  private ready: boolean = false;
  private currentProcess: ReturnType<typeof spawn> | null = null;
  private currentTimeout: NodeJS.Timeout | null = null;
  private cancelled: boolean = false;
  private projectContext: ProjectContext | null = null;

  constructor(config: CodexProviderConfig = {}) {
    super(config);
    this.binaryPath = config.binaryPath || 'codex';
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.timeout = config.timeout || 1800000; // 30 minutes default

    // Check if codex is available
    this.checkCodexAvailable();
  }

  getName(): string {
    return 'Codex';
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if Codex CLI is available (synchronous).
   */
  private checkCodexAvailable(): void {
    // Use the installer to check if Codex is installed
    this.ready = CodexInstaller.isInstalled();

    if (this.ready) {
      const version = CodexInstaller.getInstalledVersion();
      console.log('[Codex] Available:', version || 'yes');
    } else {
      console.log('[Codex] Not available');
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
      console.log('[Codex] Cancelling current process');
      try {
        // Kill the process tree on Windows
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.currentProcess.pid), '/f', '/t'], { shell: true });
        } else {
          this.currentProcess.kill('SIGTERM');
        }
      } catch (e) {
        console.error('[Codex] Error killing process:', e);
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
   * Execute a codex command and capture output.
   * Uses: codex exec --json --cd <dir> --full-auto "prompt"
   * @see https://developers.openai.com/codex/cli/reference
   */
  private executeCommand(prompt: string, onChunk?: (chunk: string) => void): Promise<string> {
    this.cancelled = false;

    return new Promise((resolve, reject) => {
      console.log('[Codex] Spawning codex exec with prompt length:', prompt.length);

      // Build command args for non-interactive mode
      // codex exec --json --cd <workdir> --full-auto "prompt"
      const args = [
        'exec',
        '--json', // Output newline-delimited JSON events
        '--cd', this.workingDirectory, // Set workspace root
        '--full-auto', // Low-friction mode with workspace-write sandbox
        prompt,
      ];

      const proc = spawn(this.binaryPath, args, {
        cwd: this.workingDirectory,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        windowsHide: true,
        env: { ...process.env },
      });

      // Track the current process for cancellation
      this.currentProcess = proc;

      let fullContent = '';
      let stderr = '';
      const jsonEvents: Array<Record<string, unknown>> = [];

      // Process JSON events from Codex
      const processJsonLine = (line: string) => {
        if (!line.trim()) return;

        try {
          const event = JSON.parse(line);
          jsonEvents.push(event);

          // Extract content from different event types
          // Codex outputs various event types - we want text content
          if (event.type === 'message' && event.content) {
            const text = typeof event.content === 'string'
              ? event.content
              : JSON.stringify(event.content);
            fullContent += text;
            onChunk?.(text);
          } else if (event.type === 'text' && event.text) {
            fullContent += event.text;
            onChunk?.(event.text);
          } else if (event.type === 'assistant' && event.message?.content) {
            const text = event.message.content;
            fullContent += text;
            onChunk?.(text);
          } else if (event.content && typeof event.content === 'string') {
            // Generic content field
            fullContent += event.content;
            onChunk?.(event.content);
          }
        } catch {
          // Not JSON, treat as plain text
          fullContent += line + '\n';
          onChunk?.(line + '\n');
        }
      };

      let buffer = '';

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        buffer += chunk;

        // Process complete lines (NDJSON format)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          processJsonLine(line);
        }
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.log('[Codex] stderr:', data.toString());
      });

      // Store timeout reference for cleanup on cancel
      this.currentTimeout = setTimeout(() => {
        console.log('[Codex] TIMEOUT');
        this.currentTimeout = null;
        proc.kill();
        reject(new Error('Codex timed out'));
      }, this.timeout);

      proc.on('close', (code) => {
        // Clear timeout
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout);
          this.currentTimeout = null;
        }
        this.currentProcess = null;

        // Process any remaining buffer content
        if (buffer.trim()) {
          processJsonLine(buffer);
        }

        // Check if cancelled
        if (this.cancelled) {
          console.log('[Codex] Process was cancelled');
          reject(new Error('Cancelled'));
          return;
        }

        console.log('[Codex] Closed with code:', code, 'content length:', fullContent.length, 'events:', jsonEvents.length);

        if (code === 0 || fullContent.length > 0) {
          resolve(fullContent);
        } else {
          reject(new Error(stderr || `Codex exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        // Clear timeout
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout);
          this.currentTimeout = null;
        }
        this.currentProcess = null;
        console.log('[Codex] Error:', error);
        reject(error);
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
   * Build a prompt from messages for Codex.
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
   * Parse tool calls from Codex's response.
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
      this.checkCodexAvailable();
      if (!this.ready) {
        return {
          content: 'Error: Codex CLI is not available. Please ensure it is installed and in your PATH.',
          finishReason: 'error',
        };
      }
    }

    try {
      const prompt = this.buildPrompt(messages, tools, mode);

      // Execute codex with the prompt
      const response = await this.executeCommand(prompt, onChunk);

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
      console.error('Codex error:', errorMessage);

      return {
        content: `Error calling Codex: ${errorMessage}`,
        finishReason: 'error',
      };
    }
  }

  /**
   * Set working directory for Codex commands.
   */
  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }

  /**
   * Set project context to include in prompts.
   */
  setProjectContext(context: ProjectContext | null): void {
    this.projectContext = context;
    console.log('[Codex] Project context set:', context?.name || 'null');
  }

  /**
   * Get current project context.
   */
  getProjectContext(): ProjectContext | null {
    return this.projectContext;
  }
}

/**
 * Create a Codex provider.
 */
export function createCodexProvider(config?: CodexProviderConfig): CodexProvider {
  return new CodexProvider(config);
}
