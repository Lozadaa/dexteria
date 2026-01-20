/**
 * Board Schemas
 *
 * Zod schemas for validating Kanban board data.
 */

import { z } from 'zod';

// ============================================
// Board Schemas
// ============================================

/**
 * Schema for Kanban column.
 */
export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  taskIds: z.array(z.string()),
  wipLimit: z.number().optional(),
});

/**
 * Schema for Kanban board.
 */
export const BoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(ColumnSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// Type exports
// ============================================

export type ColumnSchemaType = z.infer<typeof ColumnSchema>;
export type BoardSchemaType = z.infer<typeof BoardSchema>;
