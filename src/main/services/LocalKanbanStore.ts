/**
 * LocalKanbanStore
 *
 * File/JSON store for all .local-kanban data.
 * Provides atomic writes, validation, and activity logging.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  BoardSchema,
  TasksFileSchema,
  AgentStateSchema,
  PolicySchema,
  ProjectContextSchema,
  RepoIndexSchema,
  ChatIndexSchema,
  ChatSchema,
  ActivityEntrySchema,
  LOCAL_KANBAN_PATHS,
  createDefaultState,
  createDefaultPolicy,
  createComment,
  migrateTaskToV3,
  createActivityEntry,
} from '../../shared/schemas';
import type {
  Board,
  Task,
  TasksFile,
  AgentState,
  Policy,
  ProjectContext,
  RepoIndex,
  ChatIndex,
  Chat,
  TaskStatus,
  TaskComment,
  ActivityEntry,
  TaskPatch,
} from '../../shared/types';

export interface StoreConfig {
  projectRoot: string;
  enableBackups: boolean;
  maxBackups: number;
}

export class LocalKanbanStore {
  private projectRoot: string;
  private enableBackups: boolean;
  private maxBackups: number;
  private migrationExecuted: boolean = false;

  constructor(config: StoreConfig) {
    this.projectRoot = config.projectRoot;
    this.enableBackups = config.enableBackups;
    this.maxBackups = config.maxBackups;
  }

  // ============================================
  // Path Helpers
  // ============================================

  private getPath(relativePath: string): string {
    return path.join(this.projectRoot, relativePath);
  }

  private ensureDir(dirPath: string): void {
    const fullPath = this.getPath(dirPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  // ============================================
  // Atomic Write Helpers
  // ============================================

  private atomicWriteJSON<T>(relativePath: string, data: T): void {
    const fullPath = this.getPath(relativePath);
    const tempPath = fullPath + '.tmp';
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create backup if enabled and file exists
    if (this.enableBackups && fs.existsSync(fullPath)) {
      this.createBackup(relativePath);
    }

    // Write to temp file first
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');

    // Atomic rename
    fs.renameSync(tempPath, fullPath);
  }

  private createBackup(relativePath: string): void {
    const fullPath = this.getPath(relativePath);
    const backupDir = this.getPath(LOCAL_KANBAN_PATHS.backups);
    this.ensureDir(LOCAL_KANBAN_PATHS.backups);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(relativePath, '.json');
    const backupName = `${baseName}-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupName);

    fs.copyFileSync(fullPath, backupPath);

    // Cleanup old backups
    this.cleanupBackups(baseName);
  }

  private cleanupBackups(baseName: string): void {
    const backupDir = this.getPath(LOCAL_KANBAN_PATHS.backups);
    if (!fs.existsSync(backupDir)) return;

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith(baseName + '-') && f.endsWith('.json'))
      .sort()
      .reverse();

    // Remove excess backups
    for (let i = this.maxBackups; i < files.length; i++) {
      fs.unlinkSync(path.join(backupDir, files[i]));
    }
  }

  private readJSON<T>(relativePath: string): T | null {
    const fullPath = this.getPath(relativePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  // ============================================
  // Activity Logging
  // ============================================

  appendActivity(entry: ActivityEntry): void {
    const result = ActivityEntrySchema.safeParse(entry);
    if (!result.success) {
      console.error('Invalid activity entry:', result.error);
      return;
    }

    const fullPath = this.getPath(LOCAL_KANBAN_PATHS.activity);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(fullPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  logActivity(
    type: ActivityEntry['type'],
    data: Record<string, unknown>,
    ids?: { taskId?: string; chatId?: string; runId?: string }
  ): void {
    this.appendActivity(createActivityEntry(type, data, ids));
  }

  // ============================================
  // Board Operations
  // ============================================

  getBoard(): Board {
    const data = this.readJSON<Board>(LOCAL_KANBAN_PATHS.board);
    if (!data) {
      throw new Error('board.json not found');
    }

    const result = BoardSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Invalid board.json: ${result.error.message}`);
    }

    return result.data;
  }

  saveBoard(board: Board): void {
    const result = BoardSchema.safeParse(board);
    if (!result.success) {
      throw new Error(`Invalid board data: ${result.error.message}`);
    }

    board.updatedAt = new Date().toISOString();
    this.atomicWriteJSON(LOCAL_KANBAN_PATHS.board, board);
  }

  // ============================================
  // Tasks Operations
  // ============================================

  /**
   * Run task ID migration once on first access
   */
  private runTaskIdMigration(tasks: Task[]): void {
    if (this.migrationExecuted || tasks.length === 0) {
      return;
    }

    this.migrationExecuted = true;

    try {
      const { migrateTaskIds } = require('./TaskIdMigration');
      const board = this.getBoard();
      const state = this.getState();
      const chatIndex = this.getChatIndex();

      const result = migrateTaskIds(tasks, board, state, chatIndex);

      if (result.migratedCount > 0) {
        console.log(`[Store] Migrated ${result.migratedCount} task IDs to sequential format`);
        this.saveTasks(tasks);
        this.saveBoard(board);
        this.setState(state);
        this.saveChatIndex(chatIndex);
      }
    } catch (error) {
      console.error('[Store] Task ID migration failed:', error);
    }
  }

  getTasks(): Task[] {
    const data = this.readJSON<{ tasks: unknown[] }>(LOCAL_KANBAN_PATHS.tasks);
    if (!data) {
      return [];
    }

    // Try parsing with v3 schema, fall back to migration
    const result = TasksFileSchema.safeParse(data);
    let tasks: Task[];

    if (result.success) {
      tasks = result.data.tasks;
    } else {
      // Migrate v2 tasks to v3
      console.log('Migrating tasks to v3 format...');
      tasks = data.tasks.map((t) => migrateTaskToV3(t as Record<string, unknown>));
      this.saveTasks(tasks);
    }

    // Run ID migration
    this.runTaskIdMigration(tasks);

    return tasks;
  }

  saveTasks(tasks: Task[]): void {
    const tasksFile: TasksFile = { tasks };
    const result = TasksFileSchema.safeParse(tasksFile);
    if (!result.success) {
      throw new Error(`Invalid tasks data: ${result.error.message}`);
    }

    this.atomicWriteJSON(LOCAL_KANBAN_PATHS.tasks, tasksFile);
  }

  getTask(taskId: string): Task | null {
    const tasks = this.getTasks();
    return tasks.find(t => t.id === taskId) || null;
  }

  /**
   * Create a new task and add it to the board.
   */
  createTask(title: string, status: TaskStatus = 'backlog'): Task {
    const tasks = this.getTasks();
    const board = this.getBoard();
    const state = this.getState();

    // Initialize counter from existing tasks if needed
    let currentNumber = state.lastTaskNumber || 0;
    if (currentNumber === 0 && tasks.length > 0) {
      // Find max task number from existing TSK-XXX IDs
      const maxExisting = tasks.reduce((max, task) => {
        const match = task.id.match(/^TSK-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      currentNumber = maxExisting;
      this.setState({ lastTaskNumber: currentNumber });
    }

    // Generate sequential task ID
    const nextNumber = currentNumber + 1;
    const { createTaskId, createTask } = require('../../shared/schemas');
    const taskId = createTaskId(nextNumber);

    // Update state with new task number
    this.setState({ lastTaskNumber: nextNumber });

    // Find max order for the target column
    const columnTasks = tasks.filter(t => t.status === status);
    const maxOrder = columnTasks.length > 0
      ? Math.max(...columnTasks.map(t => t.order))
      : -1;

    // Create task with sequential ID
    const newTask: Task = createTask({
      id: taskId,
      title,
      status,
      order: maxOrder + 1,
    });

    // Add task to tasks list
    tasks.push(newTask);
    this.saveTasks(tasks);

    // Add task ID to board column
    const column = board.columns.find(c => c.id === status);
    if (column) {
      column.taskIds.push(newTask.id);
      this.saveBoard(board);
    }

    this.logActivity('task_updated', { taskId: newTask.id, action: 'created' }, { taskId: newTask.id });

    return newTask;
  }

  updateTask(taskId: string, patch: TaskPatch): Task {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = tasks[taskIndex];
    const updatedTask: Task = {
      ...task,
      ...patch,
      agent: patch.agent ? { ...task.agent, ...patch.agent } : task.agent,
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    this.saveTasks(tasks);

    this.logActivity('task_updated', { taskId, patch }, { taskId });

    return updatedTask;
  }

  /**
   * Delete a task permanently.
   */
  deleteTask(taskId: string): void {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = tasks[taskIndex];
    tasks.splice(taskIndex, 1);
    this.saveTasks(tasks);

    // Also remove from board columns
    const board = this.getBoard();
    board.columns.forEach(col => {
      col.taskIds = col.taskIds.filter(id => id !== taskId);
    });
    this.saveBoard(board);

    this.logActivity('task_deleted', { taskId, title: task.title }, { taskId });
  }

  /**
   * Move a task to a different column.
   * INVARIANT: Cannot move to 'done' unless acceptance criteria are verified.
   */
  moveTask(taskId: string, toColumnId: TaskStatus, newOrder?: number): void {
    const board = this.getBoard();
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const fromColumn = board.columns.find(c => c.id === task.status);
    const toColumn = board.columns.find(c => c.id === toColumnId);

    if (!fromColumn || !toColumn) {
      throw new Error(`Invalid column: ${toColumnId}`);
    }

    // Remove from old column
    fromColumn.taskIds = fromColumn.taskIds.filter(id => id !== taskId);

    // Add to new column at position
    if (newOrder !== undefined && newOrder >= 0) {
      toColumn.taskIds.splice(newOrder, 0, taskId);
    } else {
      toColumn.taskIds.push(taskId);
    }

    // Update task status
    task.status = toColumnId;
    task.updatedAt = new Date().toISOString();

    if (toColumnId === 'done') {
      task.completedAt = new Date().toISOString();
    }

    this.saveBoard(board);
    this.saveTasks(tasks);

    this.logActivity('task_moved', {
      taskId,
      from: fromColumn.id,
      to: toColumnId,
    }, { taskId });
  }

  /**
   * Add a comment to a task. Comments are APPEND-ONLY.
   */
  addComment(taskId: string, comment: TaskComment): void {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.comments.push(comment);
    task.updatedAt = new Date().toISOString();

    this.saveTasks(tasks);

    this.logActivity('comment_added', {
      taskId,
      commentId: comment.id,
      type: comment.type,
      author: comment.author,
    }, { taskId });
  }

  /**
   * Helper to add a typed comment
   */
  addTypedComment(
    taskId: string,
    type: TaskComment['type'],
    author: string,
    content: string,
    runId?: string
  ): TaskComment {
    const comment = createComment(type, author, content, runId);
    this.addComment(taskId, comment);
    return comment;
  }

  // ============================================
  // State Operations
  // ============================================

  getState(): AgentState {
    const data = this.readJSON<AgentState>(LOCAL_KANBAN_PATHS.state);
    if (!data) {
      const defaultState = createDefaultState();
      this.setState(defaultState);
      return defaultState;
    }

    const result = AgentStateSchema.safeParse(data);
    if (!result.success) {
      console.warn('Invalid state.json, using defaults:', result.error);
      const defaultState = createDefaultState();
      this.setState(defaultState);
      return defaultState;
    }

    return result.data;
  }

  setState(patch: Partial<AgentState>): AgentState {
    const current = this.readJSON<AgentState>(LOCAL_KANBAN_PATHS.state) || createDefaultState();
    const updated: AgentState = {
      ...current,
      ...patch,
      ralphMode: patch.ralphMode ? { ...current.ralphMode, ...patch.ralphMode } : current.ralphMode,
      lastUpdated: new Date().toISOString(),
    };

    const result = AgentStateSchema.safeParse(updated);
    if (!result.success) {
      throw new Error(`Invalid state data: ${result.error.message}`);
    }

    this.atomicWriteJSON(LOCAL_KANBAN_PATHS.state, updated);
    return updated;
  }

  // ============================================
  // Policy Operations
  // ============================================

  getPolicy(): Policy {
    const data = this.readJSON<Policy>(LOCAL_KANBAN_PATHS.policy);
    if (!data) {
      const defaultPolicy = createDefaultPolicy();
      this.atomicWriteJSON(LOCAL_KANBAN_PATHS.policy, defaultPolicy);
      return defaultPolicy;
    }

    const result = PolicySchema.safeParse(data);
    if (!result.success) {
      console.warn('Invalid policy.json, using defaults:', result.error);
      return createDefaultPolicy();
    }

    return result.data;
  }

  // ============================================
  // Project Context Operations
  // ============================================

  getProjectContext(): ProjectContext | null {
    const data = this.readJSON<ProjectContext>(LOCAL_KANBAN_PATHS.projectContext);
    if (!data) return null;

    const result = ProjectContextSchema.safeParse(data);
    if (!result.success) {
      console.warn('Invalid project_context.json:', result.error);
      return null;
    }

    // Cast to expected type (Zod schema validates structure)
    return result.data as unknown as ProjectContext;
  }

  saveProjectContext(context: ProjectContext): void {
    context.updatedAt = new Date().toISOString();
    this.atomicWriteJSON(LOCAL_KANBAN_PATHS.projectContext, context);
  }

  // ============================================
  // Repo Index Operations
  // ============================================

  getRepoIndex(): RepoIndex | null {
    const data = this.readJSON<RepoIndex>(LOCAL_KANBAN_PATHS.repoIndex);
    if (!data) return null;

    const result = RepoIndexSchema.safeParse(data);
    if (!result.success) {
      console.warn('Invalid repo_index.json:', result.error);
      return null;
    }

    // Cast to expected type (Zod schema validates structure)
    return result.data as unknown as RepoIndex;
  }

  saveRepoIndex(index: RepoIndex): void {
    index.updatedAt = new Date().toISOString();
    this.atomicWriteJSON(LOCAL_KANBAN_PATHS.repoIndex, index);
  }

  // ============================================
  // Chat Operations
  // ============================================

  getChatIndex(): ChatIndex {
    const data = this.readJSON<ChatIndex>(LOCAL_KANBAN_PATHS.chatsIndex);
    if (!data) {
      return { chats: [] };
    }

    const result = ChatIndexSchema.safeParse(data);
    if (!result.success) {
      console.warn('Invalid chats/index.json:', result.error);
      return { chats: [] };
    }

    return result.data;
  }

  saveChatIndex(index: ChatIndex): void {
    this.ensureDir(LOCAL_KANBAN_PATHS.chats);
    this.atomicWriteJSON(LOCAL_KANBAN_PATHS.chatsIndex, index);
  }

  getChat(chatId: string): Chat | null {
    const chatPath = `${LOCAL_KANBAN_PATHS.chats}/${chatId}.json`;
    const data = this.readJSON<Chat>(chatPath);
    if (!data) return null;

    const result = ChatSchema.safeParse(data);
    if (!result.success) {
      console.warn(`Invalid chat ${chatId}:`, result.error);
      return null;
    }

    return result.data;
  }

  saveChat(chat: Chat): void {
    this.ensureDir(LOCAL_KANBAN_PATHS.chats);
    const chatPath = `${LOCAL_KANBAN_PATHS.chats}/${chat.id}.json`;
    chat.updatedAt = new Date().toISOString();
    this.atomicWriteJSON(chatPath, chat);

    // Update index
    const index = this.getChatIndex();
    const existing = index.chats.findIndex(c => c.id === chat.id);
    const entry = {
      id: chat.id,
      title: chat.title,
      taskId: chat.taskId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
    };

    if (existing >= 0) {
      index.chats[existing] = entry;
    } else {
      index.chats.push(entry);
    }

    this.saveChatIndex(index);
  }

  // ============================================
  // Agent Run Operations
  // ============================================

  ensureRunDir(taskId: string): string {
    const runDir = `${LOCAL_KANBAN_PATHS.agentRuns}/${taskId}`;
    this.ensureDir(runDir);
    return runDir;
  }

  ensureCommandRunDir(taskId: string): string {
    const runDir = `${LOCAL_KANBAN_PATHS.runs}/${taskId}`;
    this.ensureDir(runDir);
    return runDir;
  }

  getAgentRunPath(taskId: string, runId: string): string {
    return path.join(this.projectRoot, LOCAL_KANBAN_PATHS.agentRuns, taskId, `${runId}.json`);
  }

  getCommandRunLogPath(taskId: string, runId: string): string {
    return path.join(this.projectRoot, LOCAL_KANBAN_PATHS.runs, taskId, `${runId}.log`);
  }

  getCommandRunMetadataPath(taskId: string, runId: string): string {
    return path.join(this.projectRoot, LOCAL_KANBAN_PATHS.runs, taskId, `${runId}.json`);
  }

  // ============================================
  // Task Runtime Updates
  // ============================================

  updateTaskRuntime(taskId: string, runtime: Partial<Task['runtime']>): void {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.runtime = { ...task.runtime, ...runtime };
    task.updatedAt = new Date().toISOString();

    this.saveTasks(tasks);
  }

  // ============================================
  // Get Pending Tasks for Ralph Mode
  // ============================================

  getPendingTasks(strategy: 'fifo' | 'priority' | 'dependency' = 'dependency'): Task[] {
    const tasks = this.getTasks();
    const board = this.getBoard();

    // Get all non-done task IDs from board
    const pendingColumns = board.columns.filter(c => c.id !== 'done');
    const pendingTaskIds = new Set(pendingColumns.flatMap(c => c.taskIds));

    let pendingTasks = tasks.filter(t =>
      pendingTaskIds.has(t.id) &&
      t.runtime.status !== 'done' &&
      t.runtime.status !== 'blocked'
    );

    // Sort based on strategy
    switch (strategy) {
      case 'priority': {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        pendingTasks.sort((a, b) =>
          priorityOrder[a.priority] - priorityOrder[b.priority] || a.order - b.order
        );
        break;
      }
      case 'dependency': {
        // Topological sort with dependency awareness
        pendingTasks = this.sortByDependencies(pendingTasks, tasks);
        break;
      }
      case 'fifo':
      default:
        pendingTasks.sort((a, b) => a.order - b.order);
        break;
    }

    return pendingTasks;
  }

  private sortByDependencies(pendingTasks: Task[], _allTasks: Task[]): Task[] {
    const result: Task[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (task: Task): void => {
      if (visited.has(task.id)) return;
      if (visiting.has(task.id)) {
        // Circular dependency, just add it
        return;
      }

      visiting.add(task.id);

      // Visit dependencies first
      const deps = task.agent.dependencies || [];
      for (const depId of deps) {
        const depTask = pendingTasks.find(t => t.id === depId);
        if (depTask && !visited.has(depId)) {
          visit(depTask);
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      result.push(task);
    };

    // Prefer todo/doing over backlog (done tasks shouldn't be in pending list)
    const columnOrder: Record<TaskStatus, number> = {
      doing: 0,
      todo: 1,
      review: 2,
      backlog: 3,
      done: 4,
    };
    const sorted = [...pendingTasks].sort((a, b) =>
      columnOrder[a.status] - columnOrder[b.status] || a.order - b.order
    );

    for (const task of sorted) {
      visit(task);
    }

    return result;
  }
}

// Singleton instance
let storeInstance: LocalKanbanStore | null = null;

export function getStore(projectRoot?: string): LocalKanbanStore {
  if (!storeInstance && projectRoot) {
    storeInstance = new LocalKanbanStore({
      projectRoot,
      enableBackups: true,
      maxBackups: 10,
    });
  }
  if (!storeInstance) {
    throw new Error('Store not initialized. Call getStore(projectRoot) first.');
  }
  return storeInstance;
}

export function initStore(projectRoot: string): LocalKanbanStore {
  storeInstance = new LocalKanbanStore({
    projectRoot,
    enableBackups: true,
    maxBackups: 10,
  });
  return storeInstance;
}
