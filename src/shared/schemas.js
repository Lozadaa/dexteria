"use strict";
/**
 * Dexteria Shared Schemas
 *
 * JSON schema validators and factory functions for core data structures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_KANBAN_PATHS = exports.DEFAULT_COLUMNS = void 0;
exports.createTaskId = createTaskId;
exports.createChatId = createChatId;
exports.createTask = createTask;
exports.createBoard = createBoard;
exports.createChat = createChat;
exports.createDefaultState = createDefaultState;
exports.createDefaultPolicy = createDefaultPolicy;
exports.createProjectContext = createProjectContext;
exports.createRepoIndex = createRepoIndex;
exports.createChatIndex = createChatIndex;
exports.isValidTaskStatus = isValidTaskStatus;
exports.isValidTask = isValidTask;
// ============================================
// Default Values & Factories
// ============================================
exports.DEFAULT_COLUMNS = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'todo', title: 'To Do' },
    { id: 'doing', title: 'In Progress' },
    { id: 'review', title: 'Review' },
    { id: 'done', title: 'Done' },
];
function createTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function createChatId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function createTask(partial) {
    const now = new Date().toISOString();
    return {
        id: partial.id || createTaskId(),
        title: partial.title || 'Untitled Task',
        description: partial.description || '',
        status: partial.status || 'backlog',
        priority: partial.priority || 'medium',
        acceptanceCriteria: partial.acceptanceCriteria || [],
        agent: partial.agent || {
            goal: '',
            scope: [],
            definitionOfDone: [],
        },
        tags: partial.tags || [],
        createdAt: partial.createdAt || now,
        updatedAt: partial.updatedAt || now,
        ...partial,
    };
}
function createBoard(name) {
    const now = new Date().toISOString();
    return {
        id: `board-${Date.now()}`,
        name,
        columns: exports.DEFAULT_COLUMNS.map((col) => ({
            ...col,
            taskIds: [],
        })),
        createdAt: now,
        updatedAt: now,
    };
}
function createChat(title, taskId) {
    const now = new Date().toISOString();
    return {
        id: createChatId(),
        title,
        taskId,
        messages: [],
        createdAt: now,
        updatedAt: now,
    };
}
function createDefaultState() {
    return {
        activeTaskId: null,
        activeChatId: null,
        mode: 'manual',
        queue: [],
        isRunning: false,
    };
}
function createDefaultPolicy() {
    return {
        version: '1.0.0',
        allowedPaths: ['src/**', 'package.json', 'README.md', 'tsconfig*.json', 'vite.config.ts'],
        blockedPaths: ['.env', '.env.*', 'node_modules/**', '.git/**'],
        blockedPatterns: ['*.pem', '*.key', '*secret*', '*password*', '*credential*'],
        allowedOperations: ['read', 'write', 'create', 'delete'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        autoCommit: false,
        requireConfirmation: ['delete', 'overwrite'],
    };
}
function createProjectContext(partial) {
    return {
        name: partial.name || 'Unknown Project',
        description: partial.description || '',
        purpose: partial.purpose || '',
        architecture: partial.architecture || {},
        devWorkflow: partial.devWorkflow || {},
        constraints: partial.constraints || [],
        unknowns: partial.unknowns || [],
        updatedAt: new Date().toISOString(),
        ...partial,
    };
}
function createRepoIndex(rootPath) {
    return {
        rootPath,
        entries: [],
        keyFiles: [],
        importantPaths: [],
        signals: {},
        updatedAt: new Date().toISOString(),
    };
}
function createChatIndex() {
    return {
        chats: [],
    };
}
// ============================================
// Validators
// ============================================
function isValidTaskStatus(status) {
    return ['backlog', 'todo', 'doing', 'review', 'done'].includes(status);
}
function isValidTask(task) {
    if (!task || typeof task !== 'object')
        return false;
    const t = task;
    return (typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.status === 'string' &&
        isValidTaskStatus(t.status));
}
// ============================================
// File Paths
// ============================================
exports.LOCAL_KANBAN_PATHS = {
    root: '.local-kanban',
    board: '.local-kanban/board.json',
    tasks: '.local-kanban/tasks.json',
    state: '.local-kanban/state.json',
    policy: '.local-kanban/policy.json',
    activity: '.local-kanban/activity.jsonl',
    context: '.local-kanban/context',
    projectContext: '.local-kanban/context/project_context.json',
    repoIndex: '.local-kanban/context/repo_index.json',
    chats: '.local-kanban/chats',
    chatsIndex: '.local-kanban/chats/index.json',
    runs: '.local-kanban/runs',
    agentRuns: '.local-kanban/agent-runs',
    backups: '.local-kanban/backups',
};
