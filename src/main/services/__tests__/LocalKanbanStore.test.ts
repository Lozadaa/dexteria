/**
 * LocalKanbanStore Tests
 *
 * Tests for the data persistence layer including CRUD operations,
 * file integrity, and state management.
 *
 * SKIPPED: Zod v4 has ESM/CJS interop issues with vitest causing
 * `safeParse` to be undefined. The `zod/v3` alias doesn't resolve
 * the issue as vitest's module resolution doesn't apply to transitive
 * dependencies in the way needed.
 *
 * Options to fix:
 * 1. Downgrade to Zod v3 (breaking change for project)
 * 2. Wait for Zod v4 vitest compatibility fix
 * 3. Create integration tests that run the actual app
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalKanbanStore } from '../LocalKanbanStore';

// Create and cleanup temp directories for isolated tests
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dexteria-store-test-'));
}

function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe.skip('LocalKanbanStore', () => {
  let tempDir: string;
  let store: LocalKanbanStore;

  beforeEach(() => {
    tempDir = createTempDir();
    store = new LocalKanbanStore({
      projectRoot: tempDir,
      enableBackups: false,
      maxBackups: 3,
    });
    store.initialize('Test Project');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Initialization', () => {
    it('should create .local-kanban directory on initialize', () => {
      const kanbanDir = path.join(tempDir, '.local-kanban');
      expect(fs.existsSync(kanbanDir)).toBe(true);
    });

    it('should create default board.json', () => {
      const boardPath = path.join(tempDir, '.local-kanban', 'board.json');
      expect(fs.existsSync(boardPath)).toBe(true);

      const board = JSON.parse(fs.readFileSync(boardPath, 'utf-8'));
      expect(board.name).toBe('Test Project');
      expect(board.columns).toHaveLength(5);
      expect(board.columns.map((c: { id: string }) => c.id)).toEqual([
        'backlog', 'todo', 'doing', 'review', 'done'
      ]);
    });

    it('should create default tasks.json', () => {
      const tasksPath = path.join(tempDir, '.local-kanban', 'tasks.json');
      expect(fs.existsSync(tasksPath)).toBe(true);

      const tasksFile = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
      expect(tasksFile.tasks).toEqual([]);
    });

    it('should create default state.json', () => {
      const statePath = path.join(tempDir, '.local-kanban', 'state.json');
      expect(fs.existsSync(statePath)).toBe(true);

      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.mode).toBe('planner');
    });

    it('should report as initialized after initialization', () => {
      expect(store.isInitialized()).toBe(true);
    });

    it('should report as not initialized for new directory', () => {
      const newTempDir = createTempDir();
      const newStore = new LocalKanbanStore({
        projectRoot: newTempDir,
        enableBackups: false,
        maxBackups: 3,
      });
      expect(newStore.isInitialized()).toBe(false);
      cleanupTempDir(newTempDir);
    });
  });

  describe('Board Operations', () => {
    it('should get board', () => {
      const board = store.getBoard();
      expect(board.name).toBe('Test Project');
      expect(board.columns).toHaveLength(5);
    });

    it('should save board updates', () => {
      const board = store.getBoard();
      board.name = 'Updated Project';
      store.saveBoard(board);

      const updatedBoard = store.getBoard();
      expect(updatedBoard.name).toBe('Updated Project');
    });

    it('should reject invalid board data', () => {
      expect(() => {
        store.saveBoard({ invalid: true } as any);
      }).toThrow();
    });
  });

  describe('Task Operations', () => {
    it('should create a task with sequential ID', () => {
      const task = store.createTask('Test Task');
      expect(task.id).toMatch(/^TSK-\d+$/);
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('backlog');
    });

    it('should create tasks with incrementing IDs', () => {
      const task1 = store.createTask('Task 1');
      const task2 = store.createTask('Task 2');
      const task3 = store.createTask('Task 3');

      expect(task1.id).toBe('TSK-001');
      expect(task2.id).toBe('TSK-002');
      expect(task3.id).toBe('TSK-003');
    });

    it('should create task in specified column', () => {
      const task = store.createTask('Todo Task', 'todo');
      expect(task.status).toBe('todo');
    });

    it('should get all tasks', () => {
      store.createTask('Task 1');
      store.createTask('Task 2');
      store.createTask('Task 3');

      const tasks = store.getTasks();
      expect(tasks).toHaveLength(3);
    });

    it('should get task by ID', () => {
      const created = store.createTask('Find Me');
      const found = store.getTask(created.id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe('Find Me');
    });

    it('should return null for non-existent task', () => {
      const found = store.getTask('TSK-999');
      expect(found).toBeNull();
    });

    it('should update task', () => {
      const task = store.createTask('Original Title');
      const updated = store.updateTask(task.id, {
        title: 'Updated Title',
        description: 'New description',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('New description');
    });

    it('should update task runtime via patch', () => {
      const task = store.createTask('Test Task');
      expect(task.runtime.status).toBe('idle');

      const updated = store.updateTask(task.id, {
        runtime: { status: 'blocked' },
      });

      expect(updated.runtime.status).toBe('blocked');
      // Other runtime fields should be preserved
      expect(updated.runtime.runCount).toBe(0);
    });

    it('should merge agent config on update', () => {
      const task = store.createTask('Test Task');
      store.updateTask(task.id, {
        agent: { goal: 'New goal' },
      });

      const updated = store.getTask(task.id);
      expect(updated!.agent.goal).toBe('New goal');
      // Other agent fields should be preserved
      expect(updated!.agent.scope).toBeDefined();
    });

    it('should throw when updating non-existent task', () => {
      expect(() => {
        store.updateTask('TSK-999', { title: 'New Title' });
      }).toThrow('Task not found');
    });

    it('should delete task', () => {
      const task = store.createTask('Delete Me');
      expect(store.getTasks()).toHaveLength(1);

      store.deleteTask(task.id);
      expect(store.getTasks()).toHaveLength(0);
    });

    it('should remove task from board column on delete', () => {
      const task = store.createTask('Delete Me');
      const board = store.getBoard();
      const backlogColumn = board.columns.find(c => c.id === 'backlog');
      expect(backlogColumn!.taskIds).toContain(task.id);

      store.deleteTask(task.id);
      const updatedBoard = store.getBoard();
      const updatedBacklog = updatedBoard.columns.find(c => c.id === 'backlog');
      expect(updatedBacklog!.taskIds).not.toContain(task.id);
    });

    it('should throw when deleting non-existent task', () => {
      expect(() => {
        store.deleteTask('TSK-999');
      }).toThrow('Task not found');
    });
  });

  describe('Task Movement', () => {
    it('should move task between columns', () => {
      const task = store.createTask('Move Me');
      expect(task.status).toBe('backlog');

      store.moveTask(task.id, 'todo');
      const moved = store.getTask(task.id);
      expect(moved!.status).toBe('todo');
    });

    it('should update board column taskIds on move', () => {
      const task = store.createTask('Move Me');

      const boardBefore = store.getBoard();
      expect(boardBefore.columns.find(c => c.id === 'backlog')!.taskIds).toContain(task.id);
      expect(boardBefore.columns.find(c => c.id === 'todo')!.taskIds).not.toContain(task.id);

      store.moveTask(task.id, 'todo');

      const boardAfter = store.getBoard();
      expect(boardAfter.columns.find(c => c.id === 'backlog')!.taskIds).not.toContain(task.id);
      expect(boardAfter.columns.find(c => c.id === 'todo')!.taskIds).toContain(task.id);
    });

    it('should set completedAt when moved to done', () => {
      const task = store.createTask('Complete Me');
      expect(task.completedAt).toBeUndefined();

      store.moveTask(task.id, 'done');
      const completed = store.getTask(task.id);
      expect(completed!.completedAt).toBeDefined();
    });

    it('should throw when moving non-existent task', () => {
      expect(() => {
        store.moveTask('TSK-999', 'todo');
      }).toThrow('Task not found');
    });
  });

  describe('Task Comments', () => {
    it('should add comment to task', () => {
      const task = store.createTask('Comment Test');
      expect(task.comments).toHaveLength(0);

      const comment = store.addTypedComment(task.id, 'note', 'user', 'Test comment');
      expect(comment.type).toBe('note');
      expect(comment.author).toBe('user');
      expect(comment.content).toBe('Test comment');

      const updated = store.getTask(task.id);
      expect(updated!.comments).toHaveLength(1);
    });

    it('should add failure comments with runId', () => {
      const task = store.createTask('Failure Test');
      const comment = store.addTypedComment(task.id, 'failure', 'agent', 'Task failed', 'run-123');

      expect(comment.type).toBe('failure');
      expect(comment.runId).toBe('run-123');
    });

    it('should throw when adding comment to non-existent task', () => {
      expect(() => {
        store.addTypedComment('TSK-999', 'note', 'user', 'Test');
      }).toThrow('Task not found');
    });
  });

  describe('State Operations', () => {
    it('should get state', () => {
      const state = store.getState();
      expect(state.mode).toBe('planner');
    });

    it('should update state', () => {
      store.setState({ mode: 'agent' });
      const state = store.getState();
      expect(state.mode).toBe('agent');
    });

    it('should merge ralph mode on update', () => {
      store.setState({ ralphMode: { isRunning: true } });
      const state = store.getState();
      expect(state.ralphMode.isRunning).toBe(true);
    });
  });

  describe('Settings Operations', () => {
    it('should get default settings', () => {
      const settings = store.getSettings();
      expect(settings.version).toBeDefined();
      expect(settings.notifications).toBeDefined();
    });

    it('should update settings', () => {
      const updated = store.updateSettings({
        notifications: { soundOnTaskComplete: false, badgeOnTaskComplete: false, sound: 'chime' },
      });
      expect(updated.notifications.soundOnTaskComplete).toBe(false);
    });
  });

  describe('Task Runtime Updates', () => {
    it('should update task runtime state', () => {
      const task = store.createTask('Runtime Test');
      expect(task.runtime.status).toBe('idle');

      store.updateTaskRuntime(task.id, {
        status: 'running',
        currentRunId: 'run-123',
      });

      const updated = store.getTask(task.id);
      expect(updated!.runtime.status).toBe('running');
      expect(updated!.runtime.currentRunId).toBe('run-123');
    });

    it('should cleanup orphaned running tasks', () => {
      // Create a task and manually set it to running
      const task = store.createTask('Orphaned Task');
      store.updateTaskRuntime(task.id, { status: 'running', currentRunId: 'run-old' });

      // Create a new store instance (simulating restart)
      const newStore = new LocalKanbanStore({
        projectRoot: tempDir,
        enableBackups: false,
        maxBackups: 3,
      });
      const cleaned = newStore.cleanupOrphanedRuns();
      expect(cleaned).toBe(1);

      const cleanedTask = newStore.getTask(task.id);
      expect(cleanedTask!.runtime.status).toBe('idle');
      expect(cleanedTask!.runtime.currentRunId).toBeUndefined();
    });
  });

  describe('Pending Tasks', () => {
    it('should get pending tasks', () => {
      store.createTask('Task 1', 'backlog');
      store.createTask('Task 2', 'todo');
      store.createTask('Task 3', 'doing');

      const pending = store.getPendingTasks();
      expect(pending).toHaveLength(3);
    });

    it('should exclude done tasks from pending', () => {
      const task = store.createTask('Done Task');
      store.moveTask(task.id, 'done');

      const pending = store.getPendingTasks();
      expect(pending).toHaveLength(0);
    });

    it('should exclude blocked tasks from pending', () => {
      const task = store.createTask('Blocked Task');
      store.updateTaskRuntime(task.id, { status: 'blocked' });

      const pending = store.getPendingTasks();
      expect(pending).toHaveLength(0);
    });
  });

  describe('Backups', () => {
    it('should create backups when enabled', () => {
      const backupStore = new LocalKanbanStore({
        projectRoot: tempDir,
        enableBackups: true,
        maxBackups: 3,
      });

      // Make a change to trigger backup
      const board = backupStore.getBoard();
      board.name = 'Backup Test';
      backupStore.saveBoard(board);

      const backupDir = path.join(tempDir, '.local-kanban', 'backups');
      const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('board-'));
      expect(backups.length).toBeGreaterThan(0);
    });
  });

  describe('Epic and Sprint', () => {
    it('should set epic on task', () => {
      const task = store.createTask('Epic Task');
      store.updateTask(task.id, {
        epic: { name: 'Feature Epic', color: '#3b82f6' },
      });

      const updated = store.getTask(task.id);
      expect(updated!.epic).toEqual({ name: 'Feature Epic', color: '#3b82f6' });
    });

    it('should clear epic with null', () => {
      const task = store.createTask('Epic Task');
      store.updateTask(task.id, {
        epic: { name: 'Feature Epic', color: '#3b82f6' },
      });
      store.updateTask(task.id, { epic: null });

      const updated = store.getTask(task.id);
      expect(updated!.epic).toBeUndefined();
    });

    it('should set sprint on task', () => {
      const task = store.createTask('Sprint Task');
      store.updateTask(task.id, { sprint: 'Sprint 1' });

      const updated = store.getTask(task.id);
      expect(updated!.sprint).toBe('Sprint 1');
    });

    it('should clear sprint with null', () => {
      const task = store.createTask('Sprint Task');
      store.updateTask(task.id, { sprint: 'Sprint 1' });
      store.updateTask(task.id, { sprint: null });

      const updated = store.getTask(task.id);
      expect(updated!.sprint).toBeUndefined();
    });
  });
});
