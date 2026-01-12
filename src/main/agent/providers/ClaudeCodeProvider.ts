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
} from '../../../shared/types';

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

  constructor(config: ClaudeCodeProviderConfig = {}) {
    super(config);
    this.claudePath = config.claudePath || 'claude';
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.timeout = config.timeout || 300000; // 5 minutes default

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
   * Execute a claude command and return the output with real-time streaming.
   */
  private executeCommand(args: string[], prompt: string, onChunk?: (chunk: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('[ClaudeCode] Spawning claude with args:', args);

      // Use spawn without shell for direct stdin access
      const proc = spawn(this.claudePath, args, {
        cwd: this.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,  // Direct execution, no shell
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        console.log('[ClaudeCode] stdout chunk received, length:', chunk.length);
        stdout += chunk;
        if (onChunk) {
          onChunk(chunk);
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
        console.log('[ClaudeCode] Closed with code:', code);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Claude exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        console.log('[ClaudeCode] Error:', error);
        reject(error);
      });

      // Write prompt to stdin immediately
      proc.stdin.write(prompt, 'utf-8', (err) => {
        if (err) {
          console.log('[ClaudeCode] stdin write error:', err);
        }
        proc.stdin.end();
        console.log('[ClaudeCode] stdin closed, waiting for response...');
      });
    });
  }

  /**
   * Get system prompt based on mode.
   */
  private getSystemPrompt(mode: 'planner' | 'agent'): string {
    const basePrompt = `You are Dexter, an AI assistant integrated into a Kanban-style task management app called Dexteria.

## Your Core Workflow (ALWAYS FOLLOW)

When the user asks you to do ANY task:

1. **ALWAYS create a task first** using the \`create_task\` tool with:
   - Clear, descriptive title
   - Detailed description of what needs to be done
   - Specific acceptance criteria (checklist items that define "done")
   - Set initial status to "backlog"

2. **Present the task/plan to the user** explaining what you will do

3. **Then proceed based on the mode you're in**

## Response Style

- Be concise but thorough
- Show your thinking process
- For code changes, explain what you're changing and why
- Always confirm destructive operations before executing
`;

    if (mode === 'planner') {
      return basePrompt + `
## PLANNER MODE (Current Mode)

You are in **PLANNER MODE**. In this mode:

- You CAN create tasks, update tasks, list tasks
- You CAN analyze code, read files, search
- You CANNOT execute code changes or run commands
- You CANNOT write files or modify code

Your job is to help the user PLAN and organize work. Create detailed task breakdowns with clear acceptance criteria.

When the user asks you to do something that requires execution:
1. Create a task with all the details
2. Explain what would need to be done
3. Tell the user to switch to Agent Mode or run the task manually from the Kanban board

DO NOT attempt to execute any file writes, code changes, or commands. Only plan and document.
`;
    } else {
      return basePrompt + `
## AGENT MODE (Current Mode)

You are in **AGENT MODE**. In this mode:

- You CAN do everything: create tasks, read/write files, run commands, execute changes
- You SHOULD create a task first, then execute it

Your workflow:
1. Create a task with clear acceptance criteria
2. Move the task to "doing" status
3. Execute each step, checking off acceptance criteria as you go
4. When complete, mark the task as "done"

You have full permissions to read, write, and execute. Use them responsibly.
`;
    }
  }

  /**
   * Build a prompt from messages for Claude Code.
   */
  private buildPrompt(messages: AgentMessage[], tools?: AgentToolDefinition[], mode: 'planner' | 'agent' = 'planner'): string {
    let prompt = '';

    // Add default system prompt based on mode
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

    // Also try to parse inline JSON for tool calls
    const inlineJsonRegex = /\{"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\}/g;
    while ((match = inlineJsonRegex.exec(content)) !== null) {
      try {
        const args = JSON.parse(match[2]);
        toolCalls.push({
          id: `call_${Date.now()}_${toolCalls.length}`,
          name: match[1],
          arguments: args,
        });
      } catch {
        // Not valid, skip
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

      // Use claude with -p (print) flag for non-interactive output
      // Prompt is passed via stdin to avoid shell escaping issues
      const args = [
        '-p',                              // Print mode (non-interactive)
        '--dangerously-skip-permissions',  // Skip permission prompts
      ];

      const response = await this.executeCommand(args, prompt, onChunk);

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
}

/**
 * Create a Claude Code provider.
 */
export function createClaudeCodeProvider(config?: ClaudeCodeProviderConfig): ClaudeCodeProvider {
  return new ClaudeCodeProvider(config);
}
