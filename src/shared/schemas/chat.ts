/**
 * Chat Schemas
 *
 * Zod schemas for validating chat data.
 */

import { z } from 'zod';

// ============================================
// Primitive Schemas
// ============================================

/**
 * Message role schema.
 */
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

// ============================================
// Chat Schemas
// ============================================

/**
 * Schema for chat message.
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.number(),
});

/**
 * Schema for complete chat session.
 */
export const ChatSchema = z.object({
  id: z.string(),
  title: z.string(),
  taskId: z.string().optional(),
  messages: z.array(ChatMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Schema for chat index entry.
 */
export const ChatIndexEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  taskId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int().min(0),
});

/**
 * Schema for chat index file.
 */
export const ChatIndexSchema = z.object({
  chats: z.array(ChatIndexEntrySchema),
});

// ============================================
// Type exports
// ============================================

export type ChatMessageSchemaType = z.infer<typeof ChatMessageSchema>;
export type ChatSchemaType = z.infer<typeof ChatSchema>;
export type ChatIndexSchemaType = z.infer<typeof ChatIndexSchema>;
