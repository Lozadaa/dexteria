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
   * Execute a claude command with streaming JSON output.
   * Parses NDJSON events and streams text in real-time.
   */
  private executeStreamingCommand(args: string[], prompt: string, onChunk?: (chunk: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('[ClaudeCode] Spawning claude with streaming args:', args);

      const proc = spawn(this.claudePath, args, {
        cwd: this.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true,
      });

      let fullContent = '';
      let stderr = '';
      let lineBuffer = '';

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
            console.log('[ClaudeCode] Event:', event.type, JSON.stringify(event).substring(0, 200));

            // Handle Claude Code streaming event types
            // See: https://docs.anthropic.com/claude-code/streaming
            let textContent = '';

            // Primary event types from Claude Code stream-json
            if (event.type === 'content_block_delta' && event.delta?.text) {
              // Streaming text delta - this is the main streaming event
              textContent = event.delta.text;
            } else if (event.type === 'text' && event.text) {
              // Simple text event
              textContent = event.text;
            } else if (event.type === 'assistant' && event.message) {
              // Full assistant message event
              // Extract content from message.content array
              const content = event.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    // Only use if we haven't already collected this content via streaming
                    if (fullContent.length === 0) {
                      textContent = block.text;
                    }
                  }
                }
              } else if (typeof content === 'string' && fullContent.length === 0) {
                textContent = content;
              }
              console.log('[ClaudeCode] Assistant message, extracted:', textContent.length, 'chars');
            } else if (event.type === 'result') {
              // Final result event - contains the text result
              if (event.result && fullContent.length === 0) {
                textContent = event.result;
                console.log('[ClaudeCode] Result event, content:', textContent.length, 'chars');
              }
            } else if (event.type === 'message_start' || event.type === 'message_stop' ||
                       event.type === 'content_block_start' || event.type === 'content_block_stop') {
              // Control events - skip
              continue;
            } else {
              // Log unknown event types for debugging
              console.log('[ClaudeCode] Unknown event type:', event.type);
            }

            if (textContent) {
              fullContent += textContent;
              if (onChunk) {
                onChunk(textContent);
              }
            }
          } catch (parseError) {
            // Not valid JSON - skip verbose logs
            console.log('[ClaudeCode] Non-JSON line (skipping):', line.substring(0, 50));
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
   */
  private getSystemPrompt(mode: 'planner' | 'agent'): string {
    const basePrompt = `You are Dexter, an AI assistant integrated into a Kanban-style task management app called Dexteria.

## CRITICAL RULE: NO CODE CHANGES WITHOUT A TASK

**THIS IS MANDATORY AND NON-NEGOTIABLE:**
- You CANNOT modify ANY code, write ANY file, or run ANY command that changes the codebase WITHOUT having a task in "doing" status FIRST
- Before ANY code modification, you MUST:
  1. Create a task (if one doesn't exist for this work)
  2. Move the task to "doing" status using \`update_task\` with \`status: "doing"\`
  3. ONLY THEN can you make code changes
- This rule has NO exceptions. Even "small fixes" or "quick changes" require a task

## Task ID Format

Task IDs are auto-generated UUIDs like "task-1705123456789-a1b2c3d4e".
- You CANNOT invent or guess task IDs
- To get a task ID, either:
  1. Use \`create_task\` - it returns the new taskId
  2. Use \`list_tasks\` - it returns all existing tasks with their IDs

## Your MANDATORY Workflow

When the user asks you to do ANY work:

### Step 1: Create the Task (REQUIRED)
Use \`create_task\` with:
- Clear, descriptive title
- Detailed description of what needs to be done
- Specific acceptance criteria (checklist items that define "done")
- Set initial status to "backlog"

### Step 2: Move Task to "doing" (REQUIRED before any code changes)
Use \`update_task\` with the taskId and \`status: "doing"\`

### Step 3: Execute the Work
Only after the task is in "doing" can you:
- Write or modify files
- Run commands
- Make any changes to the codebase

### Step 4: Complete the Task
When done, use \`update_task\` with \`status: "done"\`

## Response Style

- **ALWAYS respond in the same language the user writes in** (Spanish, English, etc.)
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
- You CAN analyze code, read files, search the codebase
- You CANNOT execute code changes, run commands, or write files
- You CANNOT modify code in any way

Your job is to help the user PLAN and organize work:
1. Create detailed tasks with clear acceptance criteria
2. Break down complex work into smaller tasks
3. Analyze the codebase to inform planning
4. Document what needs to be done

When the user asks you to execute something:
1. Create a task with all the details
2. Explain what would need to be done
3. Tell the user to switch to **Agent Mode** to execute the task

DO NOT attempt any file writes, code changes, or commands. Only plan and document.
`;
    } else {
      return basePrompt + `
## AGENT MODE (Current Mode)

You are in **AGENT MODE**. You have full execution permissions, BUT:

**REMEMBER: You CANNOT write any code until you have a task in "doing" status!**

Your REQUIRED workflow for EVERY request:

1. **Create a task** with \`create_task\`:
   - Title describing the work
   - Description with full context
   - Acceptance criteria (what defines "done")

2. **Move to "doing"** with \`update_task\`:
   \`\`\`
   update_task({ taskId: "...", status: "doing" })
   \`\`\`

3. **NOW you can execute**:
   - Read and write files
   - Run commands
   - Make code changes
   - Execute each step of the work

4. **Mark complete** with \`update_task\`:
   \`\`\`
   update_task({ taskId: "...", status: "done" })
   \`\`\`

If the user says "just do it" or "skip the task", STILL create the task. It's mandatory for tracking and organization.
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
}

/**
 * Create a Claude Code provider.
 */
export function createClaudeCodeProvider(config?: ClaudeCodeProviderConfig): ClaudeCodeProvider {
  return new ClaudeCodeProvider(config);
}
