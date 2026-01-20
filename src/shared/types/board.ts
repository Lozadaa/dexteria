/**
 * Board Domain Types
 *
 * Types related to the Kanban board structure and columns.
 */

// ============================================
// Column Types
// ============================================

/**
 * Kanban board column definition.
 */
export interface Column {
  /** Unique identifier matching TaskStatus values */
  id: string;
  /** Display title for the column */
  title: string;
  /** Ordered list of task IDs in this column */
  taskIds: string[];
  /** Optional work-in-progress limit */
  wipLimit?: number;
}

// ============================================
// Board Types
// ============================================

/**
 * Complete Kanban board definition.
 */
export interface Board {
  /** Unique board identifier */
  id: string;
  /** Board name */
  name: string;
  /** Ordered list of columns */
  columns: Column[];
  /** ISO timestamp when board was created */
  createdAt: string;
  /** ISO timestamp when board was last updated */
  updatedAt: string;
}
