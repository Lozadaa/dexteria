/**
 * AnthropicProvider
 *
 * Real LLM provider using Anthropic's Claude API.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentProvider,
  AgentProviderConfig,
} from '../AgentProvider';
import type {
  AgentMessage,
  AgentToolDefinition,
  AgentResponse,
  AgentToolCall,
} from '../../../shared/types';

export interface AnthropicProviderConfig extends AgentProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Anthropic Claude provider for real LLM calls.
 */
export class AnthropicProvider extends AgentProvider {
  private client: Anthropic | null = null;
  private model: string;
  private maxTokens: number;

  constructor(config: AnthropicProviderConfig = {}) {
    super(config);
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;

    // Initialize client if API key is available
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  getName(): string {
    return `Anthropic (${this.model})`;
  }

  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Set API key after construction.
   */
  setApiKey(apiKey: string): void {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Convert our tool definitions to Anthropic format.
   */
  private convertTools(tools: AgentToolDefinition[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }));
  }

  /**
   * Convert our messages to Anthropic format.
   */
  private convertMessages(messages: AgentMessage[]): {
    system: string;
    messages: Anthropic.MessageParam[];
  } {
    let system = '';
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system += (system ? '\n\n' : '') + msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { system, messages: anthropicMessages };
  }

  /**
   * Extract tool calls from Anthropic response.
   */
  private extractToolCalls(content: Anthropic.ContentBlock[]): AgentToolCall[] {
    const toolCalls: AgentToolCall[] = [];

    for (const block of content) {
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return toolCalls;
  }

  /**
   * Extract text content from Anthropic response.
   */
  private extractTextContent(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');
  }

  /**
   * Map Anthropic stop reason to our finish reason.
   */
  private mapStopReason(stopReason: string | null): AgentResponse['finishReason'] {
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }

  async complete(
    messages: AgentMessage[],
    tools?: AgentToolDefinition[],
    _onChunk?: (chunk: string) => void
  ): Promise<AgentResponse> {
    if (!this.client) {
      return {
        content: 'Error: Anthropic API key not configured',
        finishReason: 'error',
      };
    }

    try {
      const { system, messages: anthropicMessages } = this.convertMessages(messages);

      const requestParams: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: anthropicMessages,
      };

      if (system) {
        requestParams.system = system;
      }

      if (tools && tools.length > 0) {
        requestParams.tools = this.convertTools(tools);
      }

      const response = await this.client.messages.create(requestParams);

      const textContent = this.extractTextContent(response.content);
      const toolCalls = this.extractToolCalls(response.content);
      const finishReason = this.mapStopReason(response.stop_reason);

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Anthropic API error:', errorMessage);

      return {
        content: `Error calling Anthropic API: ${errorMessage}`,
        finishReason: 'error',
      };
    }
  }
}

/**
 * Create an Anthropic provider with optional config.
 */
export function createAnthropicProvider(config?: AnthropicProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config);
}
