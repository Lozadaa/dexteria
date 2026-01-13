/**
 * Task ID Migration
 *
 * Migrates old task IDs (task-xxx) to new sequential format (TSK-001, TSK-002, etc.)
 * Updates all references across the system.
 */

import type { Task, Board, AgentState, ChatIndex } from '../../shared/types';
import { createTaskId } from '../../shared/schemas';

interface MigrationResult {
  migratedCount: number;
  idMap: Map<string, string>;
}

/**
 * Check if a task has old-style ID format
 */
function hasOldIdFormat(taskId: string): boolean {
  // Old format: task-{timestamp}-{random}
  return taskId.startsWith('task-') && !taskId.startsWith('TSK-');
}

/**
 * Migrate all task IDs to sequential format
 */
export function migrateTaskIds(
  tasks: Task[],
  board: Board,
  state: AgentState,
  chatIndex: ChatIndex
): MigrationResult {
  // Check if migration is needed
  const needsMigration = tasks.some(t => hasOldIdFormat(t.id));

  if (!needsMigration) {
    console.log('[Migration] No old task IDs found, skipping migration');
    return { migratedCount: 0, idMap: new Map() };
  }

  console.log('[Migration] Starting task ID migration...');

  // Sort tasks by creation date to preserve order
  const sortedTasks = [...tasks].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return aTime - bTime;
  });

  // Create ID mapping (oldId -> newId)
  const idMap = new Map<string, string>();
  let counter = 1;

  // Assign new sequential IDs
  for (const task of sortedTasks) {
    if (hasOldIdFormat(task.id)) {
      const newId = createTaskId(counter);
      idMap.set(task.id, newId);
      console.log(`[Migration] ${task.id} -> ${newId}`);
      counter++;
    } else {
      // Task already has new format, preserve it
      const match = task.id.match(/^TSK-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        counter = Math.max(counter, num + 1);
      }
    }
  }

  // Update tasks
  for (const task of tasks) {
    const newId = idMap.get(task.id);
    if (newId) {
      task.id = newId;

      // Update dependencies
      if (task.dependsOn && task.dependsOn.length > 0) {
        task.dependsOn = task.dependsOn.map(depId => idMap.get(depId) || depId);
      }

      if (task.agent?.dependencies && task.agent.dependencies.length > 0) {
        task.agent.dependencies = task.agent.dependencies.map(depId => idMap.get(depId) || depId);
      }

      // Update comments
      if (task.comments && task.comments.length > 0) {
        for (const comment of task.comments) {
          if (idMap.has(comment.taskId)) {
            comment.taskId = idMap.get(comment.taskId)!;
          }
        }
      }
    }
  }

  // Update board columns
  for (const column of board.columns) {
    column.taskIds = column.taskIds.map(taskId => idMap.get(taskId) || taskId);
  }

  // Update agent state
  if (state.activeTaskId && idMap.has(state.activeTaskId)) {
    state.activeTaskId = idMap.get(state.activeTaskId)!;
  }

  if (state.ralphMode?.currentTaskId && idMap.has(state.ralphMode.currentTaskId)) {
    state.ralphMode.currentTaskId = idMap.get(state.ralphMode.currentTaskId)!;
  }

  // Update last task number
  state.lastTaskNumber = counter - 1;

  // Update chat index
  for (const chat of chatIndex.chats) {
    if (chat.taskId && idMap.has(chat.taskId)) {
      chat.taskId = idMap.get(chat.taskId)!;
    }
  }

  console.log(`[Migration] Migrated ${idMap.size} tasks to sequential IDs`);
  console.log(`[Migration] Next task will be TSK-${counter.toString().padStart(3, '0')}`);

  // Note: Individual chat files will be updated lazily when accessed
  // Agent run files are not updated (they're historical records)

  return {
    migratedCount: idMap.size,
    idMap,
  };
}

/**
 * Get the ID mapping for use when updating individual chat files
 */
export function getTaskIdMapping(tasks: Task[]): Map<string, string> | null {
  const needsMigration = tasks.some(t => hasOldIdFormat(t.id));
  if (!needsMigration) {
    return null;
  }

  const idMap = new Map<string, string>();
  const sortedTasks = [...tasks].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return aTime - bTime;
  });

  let counter = 1;
  for (const task of sortedTasks) {
    if (hasOldIdFormat(task.id)) {
      const newId = createTaskId(counter);
      idMap.set(task.id, newId);
      counter++;
    }
  }

  return idMap;
}
