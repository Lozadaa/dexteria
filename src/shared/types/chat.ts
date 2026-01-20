/**
 * Chat Domain Types
 *
 * Types related to chat sessions and messages.
 */

// ============================================
// Message Types
// ============================================

/**
 * Single chat message.
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Unix timestamp when message was sent */
  timestamp: number;
}

// ============================================
// Chat Session Types
// ============================================

/**
 * Complete chat session with messages.
 */
export interface Chat {
  /** Unique chat session identifier */
  id: string;
  /** Chat session title */
  title: string;
  /** Associated task ID if this is a task-specific chat */
  taskId?: string;
  /** All messages in the chat */
  messages: ChatMessage[];
  /** ISO timestamp when chat was created */
  createdAt: string;
  /** ISO timestamp when chat was last updated */
  updatedAt: string;
}

/**
 * Chat index entry for listing chats without full message history.
 */
export interface ChatIndexEntry {
  id: string;
  title: string;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

/**
 * Chat index file format.
 */
export interface ChatIndex {
  chats: ChatIndexEntry[];
}
