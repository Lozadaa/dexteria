/**
 * Parse streaming content from the agent into structured operations.
 *
 * The ClaudeCodeProvider outputs tool calls in the format:
 * - 📖 Reading: `path` ✓
 * - ✏️ Writing: `path` ✓
 * - 📝 Editing: `path` ✓
 * - 💻 Running: `command` ✓
 * - 🔍 Searching: `pattern` ✓
 * - 🔎 Grep: `pattern` ✓
 * - 🤖 Spawning agent... ✓
 * - 📋 Updating task list... ✓
 * - 🔧 tool_name ✓
 */

import type { AgentOperation, AgentOperationType } from 'adnia-ui';

// Map emojis to operation types
const emojiToType: Record<string, AgentOperationType> = {
  '📖': 'read',
  '✏️': 'write',
  '📝': 'write',
  '💻': 'run',
  '🔍': 'search',
  '🔎': 'grep',
  '🤖': 'spawn',
  '📋': 'tool',
  '🔧': 'tool',
};

// Map labels to operation types
const labelToType: Record<string, AgentOperationType> = {
  'Reading': 'read',
  'Writing': 'write',
  'Editing': 'write',
  'Running': 'run',
  'Searching': 'search',
  'Glob': 'search',
  'Grep': 'grep',
  'Spawning': 'spawn',
  'Updating': 'tool',
};

interface ParsedOperation {
  type: AgentOperationType;
  title: string;
  content?: string;
  completed: boolean;
}

/**
 * Parse a single line for an operation marker.
 */
function parseOperationLine(line: string): ParsedOperation | null {
  // Match pattern: emoji label: `content` [checkmark]
  // Examples:
  //   📖 Reading: `src/file.ts` ✓
  //   💻 Running: `npm test`
  //   🤖 Spawning agent... ✓

  const trimmed = line.trim();
  if (!trimmed) return null;

  // Check for emoji prefix
  for (const [emoji, opType] of Object.entries(emojiToType)) {
    if (trimmed.startsWith(emoji)) {
      const rest = trimmed.substring(emoji.length).trim();
      const completed = rest.endsWith('✓');
      const content = completed ? rest.slice(0, -1).trim() : rest;

      // Extract the title/content
      let title = content;
      let opContent: string | undefined;

      // Check for labeled format "Label: `content`"
      const labelMatch = content.match(/^(\w+):\s*`([^`]+)`/);
      if (labelMatch) {
        const label = labelMatch[1];
        const labelOpType = labelToType[label] || opType;
        title = `${label}: ${labelMatch[2]}`;
        opContent = labelMatch[2];

        return {
          type: labelOpType,
          title,
          content: opContent,
          completed,
        };
      }

      // Check for backtick content without label
      const backtickMatch = content.match(/`([^`]+)`/);
      if (backtickMatch) {
        opContent = backtickMatch[1];
        title = opContent;
      }

      // Handle special cases
      if (emoji === '🤖') {
        title = 'Spawning agent';
        if (content.includes('agent:')) {
          const agentName = content.match(/agent:\s*(\S+)/);
          if (agentName) {
            title = `Spawning: ${agentName[1]}`;
            opContent = agentName[1];
          }
        }
      } else if (emoji === '📋') {
        title = 'Updating task list';
      }

      return {
        type: opType,
        title,
        content: opContent,
        completed,
      };
    }
  }

  return null;
}

/**
 * Parse streaming content into a list of agent operations.
 *
 * @param content - The streaming content from the agent
 * @param isRunning - Whether the agent is still running
 * @returns List of agent operations
 */
export function parseAgentOperations(content: string, isRunning: boolean = false): AgentOperation[] {
  const operations: AgentOperation[] = [];
  const lines = content.split('\n');
  let operationId = 0;

  for (const line of lines) {
    const parsed = parseOperationLine(line);
    if (parsed) {
      operationId++;
      operations.push({
        id: `op-${operationId}`,
        type: parsed.type,
        status: parsed.completed ? 'completed' : (isRunning ? 'running' : 'pending'),
        title: parsed.title,
        content: parsed.content,
      });
    }
  }

  // If running and no operations in progress, mark the last one as running
  if (isRunning && operations.length > 0) {
    const lastOp = operations[operations.length - 1];
    if (lastOp.status !== 'completed') {
      lastOp.status = 'running';
    }
  }

  return operations;
}

/**
 * Extract operations and clean content separately.
 * Returns both the parsed operations and the content with operation markers removed.
 *
 * @param content - The streaming content from the agent
 * @param isRunning - Whether the agent is still running
 */
export function extractOperationsAndContent(content: string, isRunning: boolean = false): {
  operations: AgentOperation[];
  cleanContent: string;
} {
  const operations = parseAgentOperations(content, isRunning);

  // Remove operation markers from content to get clean text
  let cleanContent = content;

  // Remove lines that are just operations
  const lines = content.split('\n');
  const cleanLines: string[] = [];

  for (const line of lines) {
    const parsed = parseOperationLine(line);
    if (!parsed) {
      cleanLines.push(line);
    }
  }

  cleanContent = cleanLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return { operations, cleanContent };
}

export type { AgentOperation, AgentOperationType };
