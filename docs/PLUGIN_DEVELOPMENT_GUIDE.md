# Dexteria Plugin Development Guide

This guide provides comprehensive documentation for developing plugins for Dexteria. Plugins extend Dexteria's functionality through hooks, UI extensions, and custom APIs.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Structure](#plugin-structure)
3. [Plugin Manifest](#plugin-manifest)
4. [Plugin Context API](#plugin-context-api)
5. [Hook System](#hook-system)
6. [UI Extensions](#ui-extensions)
7. [Storage API](#storage-api)
8. [Exposing Plugin APIs](#exposing-plugin-apis)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Getting Started

### Prerequisites

- Basic knowledge of JavaScript/TypeScript
- Understanding of Dexteria's architecture (Electron + React)
- Node.js installed for development

### Quick Start

1. Create a new folder in `.local-kanban/plugins/` with your plugin ID
2. Create a `manifest.json` file with plugin metadata
3. Create a `main.js` file with your plugin code
4. Restart Dexteria or reload the project

```bash
# Example: Create a simple plugin
mkdir -p .local-kanban/plugins/com.example.hello
cd .local-kanban/plugins/com.example.hello
```

---

## Plugin Structure

Each plugin is a directory inside `.local-kanban/plugins/` containing at minimum:

```
.local-kanban/plugins/
└── com.example.myplugin/
    ├── manifest.json      # Required: Plugin metadata
    ├── main.js           # Required: Main process entry point
    ├── renderer.js       # Optional: Renderer process entry
    ├── components/       # Optional: React components
    └── assets/           # Optional: Static assets
```

### File Descriptions

| File | Required | Description |
|------|----------|-------------|
| `manifest.json` | Yes | Plugin metadata, permissions, and contributions |
| `main.js` | Yes | Main process code with `activate()` function |
| `renderer.js` | No | Renderer process code (for UI components) |
| `storage.json` | Auto | Auto-generated plugin data storage |

---

## Plugin Manifest

The `manifest.json` file describes your plugin's metadata and capabilities.

### Schema

```typescript
interface PluginManifest {
  // Required fields
  id: string;           // Unique identifier (reverse-domain format recommended)
  name: string;         // Display name shown to users
  version: string;      // SemVer version (e.g., "1.0.0")

  // Optional metadata
  author?: string;      // Author name or organization
  description?: string; // Brief description of functionality

  // Entry points
  main?: string;        // Main process entry (default: "main.js")
  renderer?: string;    // Renderer process entry (optional)

  // Permissions the plugin requests
  permissions: PluginPermissions;

  // Extension points the plugin uses
  contributes?: PluginContributions;
}
```

### Permissions

```typescript
interface PluginPermissions {
  tasks?: 'read' | 'write' | 'full';     // Task board access
  chat?: 'read' | 'write' | 'full';      // Chat functionality
  agent?: 'read' | 'execute';            // AI agent control
  files?: 'read' | 'write' | 'full';     // File system access
  terminal?: 'read' | 'execute';         // Command execution
  settings?: 'read' | 'write';           // Settings access
  ui?: {                                  // UI extension permissions
    tabs?: boolean;
    sidebars?: boolean;
    modals?: boolean;
    contextMenus?: boolean;
  };
}
```

### Contributions

```typescript
interface PluginContributions {
  // UI Extension Points
  settingsTab?: {
    id: string;
    title: string;
    icon: string;          // Lucide icon name
    order?: number;        // Sort order (default: 100)
  };

  dockingPanels?: Array<{
    id: string;
    title: string;
    icon: string;
    singleton?: boolean;   // Only one instance (default: false)
    defaultPosition?: 'left' | 'right' | 'bottom';
  }>;

  slots?: Array<{
    slotId: ExtensionSlotId;  // See Extension Points table
    order?: number;
  }>;

  // Other contributions
  commands?: CommandContribution[];
  tabs?: TabContribution[];
  contextMenus?: ContextMenuContribution[];
  hooks?: HookContribution[];
  settings?: SettingContribution[];
}

// Available slot IDs
type ExtensionSlotId =
  | 'settings:tab'
  | 'docking:panel'
  | 'topbar:left'
  | 'topbar:right'
  | 'task-detail:sidebar'
  | 'task-detail:footer'
  | 'task-card:badge'
  | 'bottom-panel:tab';
```

### Renderer Entry (for UI contributions)

```typescript
interface PluginRenderer {
  entry: string;      // Path to renderer entry file (e.g., "renderer/index.js")
  styles?: string;    // Optional CSS file
}
```

### Example manifest.json

```json
{
  "id": "com.example.jira-sync",
  "name": "Jira Integration",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Sync tasks with Jira Cloud",
  "main": "main.js",
  "permissions": {
    "tasks": "full",
    "settings": "write",
    "ui": {
      "tabs": true,
      "contextMenus": true
    }
  },
  "contributes": {
    "commands": [
      {
        "id": "jira.sync",
        "title": "Sync with Jira"
      }
    ],
    "contextMenus": [
      {
        "location": "task",
        "items": [
          {
            "id": "jira.link",
            "label": "Link to Jira Issue"
          }
        ]
      }
    ]
  }
}
```

---

## Plugin Context API

When your plugin is activated, it receives a `PluginContext` object with access to Dexteria's APIs.

### Context Structure

```typescript
interface PluginContext {
  pluginId: string;      // Your plugin's ID
  pluginPath: string;    // Path to your plugin directory
  dataPath: string;      // Path for plugin data storage

  log: PluginLogger;     // Logging utilities
  storage: PluginStorage; // Persistent storage
  hooks: PluginHooks;    // Hook registration
  ui: PluginUI;          // UI extensions
}
```

### Logging API

All log messages are prefixed with `[Plugin:yourPluginId]` for easy filtering.

```typescript
interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

// Usage
context.log.info('Plugin initialized');
context.log.error('Failed to connect: ' + error.message);
```

### main.js Entry Point

Your plugin must export an `activate` function:

```javascript
// main.js

/**
 * Called when the plugin is activated
 * @param {PluginContext} context - Plugin context with APIs
 */
export async function activate(context) {
  const { log, hooks, storage, ui } = context;

  log.info('My plugin is starting...');

  // Register hooks
  hooks.on('task:afterCreate', async (task) => {
    log.info(`New task created: ${task.title}`);
  });

  // Initialize storage
  const config = await storage.get('config') || { enabled: true };

  log.info('My plugin activated successfully');
}

/**
 * Called when the plugin is deactivated (optional)
 */
export async function deactivate() {
  console.log('My plugin deactivated');
}

/**
 * Optional: Expose API methods to other plugins/renderer
 */
export const api = {
  async getStatus() {
    return { status: 'running' };
  },

  async doSomething(param1, param2) {
    // Implementation
    return { success: true };
  }
};
```

---

## Hook System

Hooks allow your plugin to intercept and modify Dexteria's behavior at key points.

### Available Hooks (14 Total)

#### Chat Hooks

| Hook | Description | Can Cancel | Can Modify |
|------|-------------|------------|------------|
| `chat:beforeSend` | Before message sent to AI | Yes | message, metadata |
| `chat:afterResponse` | After AI response received | No | response |

#### Task Hooks

| Hook | Description | Can Cancel | Can Modify |
|------|-------------|------------|------------|
| `task:beforeCreate` | Before task creation | Yes | task input |
| `task:afterCreate` | After task created | No | - |
| `task:beforeUpdate` | Before task update | Yes | patch |
| `task:afterUpdate` | After task updated | No | - |
| `task:beforeMove` | Before column change | Yes | toColumn |
| `task:afterMove` | After task moved | No | - |
| `task:beforeDelete` | Before task deletion | Yes | - |

#### Board Hooks

| Hook | Description | Can Cancel | Can Modify |
|------|-------------|------------|------------|
| `board:refresh` | Board state changed | No | - |

#### Agent Hooks

| Hook | Description | Can Cancel | Can Modify |
|------|-------------|------------|------------|
| `agent:beforeRun` | Before agent executes | Yes | task |
| `agent:afterRun` | After agent completes | No | - |
| `agent:onToolCall` | During tool execution | Yes | toolInput |
| `agent:onStep` | Each agent step | No | - |

### Hook Registration

```typescript
// Register a hook
hooks.on('task:beforeCreate', async (context) => {
  // Return object with modifications
  return {
    task: { ...context.task, priority: 'high' },
    cancel: false
  };
});

// Unregister a hook
hooks.off('task:beforeCreate', myHandler);
```

### Hook Context Objects

#### chat:beforeSend

```typescript
interface ChatBeforeSendContext {
  message: string;
  chatId: string;
  mode: 'agent' | 'planner';
}

// Return type
interface ChatBeforeSendResult {
  message: string;      // Modified message
  cancel?: boolean;     // Cancel sending
  metadata?: object;    // Pass data to afterResponse
}
```

#### task:beforeCreate

```typescript
interface TaskBeforeCreateContext {
  title: string;
  status: string;
  description?: string;
  priority?: string;
  epic?: {
    name: string;
    color: string;  // Hex color like "#3b82f6"
  };
  sprint?: string;
}

// Return type
interface TaskBeforeCreateResult {
  task: TaskBeforeCreateContext;
  cancel?: boolean;
}
```

#### task:beforeMove

```typescript
interface TaskBeforeMoveContext {
  taskId: string;
  task: Task;
  fromColumn: string;
  toColumn: string;
}

// Return type
interface TaskBeforeMoveResult {
  toColumn: string;     // Can redirect to different column
  cancel?: boolean;
}
```

#### agent:beforeRun

```typescript
interface AgentBeforeRunContext {
  taskId: string;
  task: Task;
  runId: string;
  mode: 'manual' | 'ralph';
}

// Return type
interface AgentBeforeRunResult {
  cancel?: boolean;
  task?: Task;          // Modified task
}
```

#### agent:onToolCall

```typescript
interface AgentOnToolCallContext {
  taskId: string;
  runId: string;
  toolName: string;
  toolInput: object;
  stepNumber: number;
}

// Return type
interface AgentOnToolCallResult {
  cancel?: boolean;
  toolInput?: object;   // Modified input
}
```

### Hook Execution Order

1. Hooks execute in registration order
2. If any hook returns `cancel: true`, subsequent hooks are skipped
3. Modifications from each hook are merged into the context
4. Hook errors are caught and logged (won't crash the app)

---

## UI Extensions

Plugins can extend Dexteria's UI through multiple Extension Points (slots), custom tabs, docking panels, and context menu items.

### Extension Points System

Dexteria provides 8 extension points (slots) where plugins can inject custom UI:

| Extension Point | Location | Use Case |
|-----------------|----------|----------|
| `settings:tab` | SettingsPanel | Add configuration tabs for your plugin |
| `docking:panel` | Docking system | Full panels that open as tabs |
| `topbar:left` | TopBar (left side) | Action buttons, indicators |
| `topbar:right` | TopBar (right side) | Status indicators, quick actions |
| `task-detail:sidebar` | TaskDetail scroll area | Additional task information |
| `task-detail:footer` | TaskDetail (above comments) | Task-related actions |
| `task-card:badge` | TaskCard | Status badges, indicators |
| `bottom-panel:tab` | BottomPanel | Tabs next to Task Runner |

### Declaring UI Contributions (manifest.json)

Use the `contributes` field in your manifest to declare UI extensions:

```json
{
  "id": "com.example.analytics",
  "name": "Analytics Dashboard",
  "version": "1.0.0",
  "permissions": {
    "tasks": "read",
    "ui": { "tabs": true }
  },
  "contributes": {
    "settingsTab": {
      "id": "analytics-settings",
      "title": "Analytics",
      "icon": "BarChart3",
      "order": 50
    },
    "dockingPanels": [
      {
        "id": "dashboard",
        "title": "Analytics Dashboard",
        "icon": "PieChart",
        "singleton": true,
        "defaultPosition": "right"
      }
    ],
    "slots": [
      {
        "slotId": "task-card:badge",
        "order": 10
      },
      {
        "slotId": "task-detail:sidebar",
        "order": 20
      }
    ]
  },
  "renderer": {
    "entry": "renderer/index.js",
    "styles": "renderer/styles.css"
  }
}
```

### Settings Tab Contribution

Add a tab to the Settings panel:

```typescript
interface PluginSettingsTabContribution {
  id: string;           // Unique tab identifier
  title: string;        // Display title
  icon: string;         // Lucide icon name (e.g., "Settings", "BarChart3")
  order?: number;       // Sort order (lower = first, default: 100)
}
```

Your plugin's renderer will be loaded when the user clicks the tab.

### Docking Panel Contribution

Add panels to the docking system (appears in Window menu):

```typescript
interface PluginDockingPanelContribution {
  id: string;           // Unique panel identifier
  title: string;        // Display title
  icon: string;         // Lucide icon name
  singleton?: boolean;  // Only one instance allowed (default: false)
  defaultPosition?: 'left' | 'right' | 'bottom';  // Suggested position
}
```

Panels appear in the **Window** menu under the "Plugins" section and can be opened as tabs.

### Slot Contributions

Inject UI into specific locations:

```typescript
interface PluginSlotContribution {
  slotId: ExtensionSlotId;  // One of the 8 extension points
  order?: number;           // Sort order within the slot
  when?: string;            // Condition expression (future)
}
```

### Renderer Entry Point

Create a `renderer/index.js` file that exports React components for each contribution:

```javascript
// renderer/index.js
import React from 'react';

// Settings Tab Component
export function SettingsTab({ pluginId, context }) {
  return (
    <div className="p-4">
      <h2>Analytics Settings</h2>
      {/* Your settings UI */}
    </div>
  );
}

// Docking Panel Component
export function DockingPanel({ pluginId, context }) {
  return (
    <div className="h-full p-4">
      <h2>Analytics Dashboard</h2>
      {/* Your dashboard UI */}
    </div>
  );
}

// Slot Components receive context about where they're rendered
export function TaskCardBadge({ pluginId, context }) {
  const { taskId, task } = context;
  return (
    <span className="badge">
      {/* Badge content */}
    </span>
  );
}

export function TaskDetailSidebar({ pluginId, context }) {
  const { taskId, task } = context;
  return (
    <div className="p-2 border rounded">
      {/* Additional task info */}
    </div>
  );
}
```

### Plugin Bridge API

Inside renderer components, use the Plugin Bridge to access Dexteria's APIs:

```javascript
// Access via window.dexteria
const { tasks, plugin, settings } = window.dexteria;

// Get all tasks
const allTasks = await tasks.getAll();

// Call your plugin's main process API
const result = await plugin.callApi('com.example.analytics', 'getStats');

// Store plugin settings
await plugin.setSettings('com.example.analytics', { enabled: true });
```

### Custom Tabs (Legacy API)

For programmatic tab registration (alternative to manifest):

```typescript
interface TabRegistrationOptions {
  id: string;                          // Tab identifier
  label: string;                       // Display text
  icon?: string;                       // Lucide icon name
  position: 'left' | 'right' | 'bottom';
  order?: number;                      // Sort order
  component: string;                   // Path to component file
  componentType: 'html' | 'url' | 'iframe';
}

// Example
ui.registerTab({
  id: 'my-panel',
  label: 'My Panel',
  icon: 'settings',
  position: 'right',
  component: './components/MyPanel.html',
  componentType: 'html'
});

// Unregister
ui.unregisterTab('my-panel');
```

### Context Menu Items

```typescript
interface ContextMenuItemOptions {
  id: string;
  label: string;
  icon?: string;                       // Lucide icon name
  location: 'task' | 'board' | 'column';
  order?: number;
}

// Example
ui.registerContextMenuItem({
  id: 'sync-to-jira',
  label: 'Sync to Jira',
  icon: 'cloud-upload',
  location: 'task',
  order: 100
}, async (context) => {
  const { taskId, task } = context;
  // Handle menu click
  await syncTaskToJira(task);
});

// Unregister
ui.unregisterContextMenuItem('sync-to-jira');
```

---

## Storage API

Plugins have access to a persistent key-value storage scoped to their plugin.

```typescript
interface PluginStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Usage Examples

```javascript
// Store configuration
await storage.set('config', {
  apiKey: 'xxx',
  enabled: true,
  lastSync: Date.now()
});

// Retrieve configuration
const config = await storage.get('config');
if (config?.enabled) {
  // Do something
}

// Store arrays/objects
await storage.set('syncedTasks', ['task-1', 'task-2']);

// Delete specific key
await storage.delete('tempData');

// Clear all plugin data
await storage.clear();
```

### Storage Location

Data is persisted to: `.local-kanban/plugins/data/<pluginId>/storage.json`

---

## Exposing Plugin APIs

Plugins can expose methods that can be called from other plugins or the renderer process.

### Defining an API

```javascript
// main.js
export const api = {
  /**
   * Get the sync status
   */
  async getStatus() {
    return {
      connected: true,
      lastSync: await storage.get('lastSync')
    };
  },

  /**
   * Manually trigger a sync
   */
  async syncNow(options = {}) {
    const { force = false } = options;
    // Implementation
    return { success: true, synced: 5 };
  },

  /**
   * Get synced task mapping
   */
  async getTaskMapping(taskId) {
    const mappings = await storage.get('mappings') || {};
    return mappings[taskId] || null;
  }
};
```

### Calling Plugin APIs

From the renderer process:

```javascript
// Call another plugin's API
const result = await window.dexteria.plugin.callApi(
  'com.example.jira-sync',
  'syncNow',
  { force: true }
);

console.log(result); // { success: true, synced: 5 }
```

---

## Best Practices

### 1. Handle Errors Gracefully

```javascript
export async function activate(context) {
  try {
    await initializePlugin(context);
  } catch (error) {
    context.log.error(`Failed to initialize: ${error.message}`);
    // Don't throw - this will put plugin in error state
  }
}
```

### 2. Clean Up in Deactivate

```javascript
let intervalId = null;

export async function activate(context) {
  intervalId = setInterval(syncData, 60000);
}

export async function deactivate() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
```

### 3. Use Meaningful IDs

```javascript
// Good - unique, namespaced
{
  "id": "com.mycompany.jira-integration"
}

// Bad - generic, could conflict
{
  "id": "jira"
}
```

### 4. Respect Cancellation

```javascript
hooks.on('task:beforeCreate', async (context) => {
  // Check if task should be created
  if (await isDuplicate(context.task.title)) {
    return { cancel: true };  // Prevent creation
  }
  return { cancel: false };   // Allow creation
});
```

### 5. Log Appropriately

```javascript
// Use appropriate log levels
log.debug('Checking task status...');    // Development info
log.info('Sync completed: 5 tasks');     // Normal operations
log.warn('API rate limit approaching');   // Potential issues
log.error('Failed to connect to API');    // Errors
```

### 6. Store Sensitive Data Securely

```javascript
// Consider encrypting sensitive data
const config = {
  apiKey: encrypt(userApiKey),  // Don't store plaintext
  baseUrl: 'https://example.atlassian.net'
};
await storage.set('config', config);
```

---

## Examples

### Example 1: Task Counter Plugin

A simple plugin that counts tasks per column.

```json
// manifest.json
{
  "id": "com.example.task-counter",
  "name": "Task Counter",
  "version": "1.0.0",
  "description": "Displays task counts per column",
  "permissions": {
    "tasks": "read"
  }
}
```

```javascript
// main.js
let counts = {};

export async function activate(context) {
  const { log, hooks } = context;

  hooks.on('board:refresh', (ctx) => {
    counts = {};
    ctx.tasks.forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    log.info(`Task counts: ${JSON.stringify(counts)}`);
  });

  log.info('Task Counter plugin activated');
}

export const api = {
  getCounts() {
    return counts;
  }
};
```

### Example 2: Auto-Priority Plugin

Automatically set priority based on keywords.

```json
// manifest.json
{
  "id": "com.example.auto-priority",
  "name": "Auto Priority",
  "version": "1.0.0",
  "description": "Set priority based on keywords",
  "permissions": {
    "tasks": "write"
  }
}
```

```javascript
// main.js
const PRIORITY_KEYWORDS = {
  critical: ['urgent', 'critical', 'blocker', 'asap'],
  high: ['important', 'high', 'bug'],
  low: ['nice-to-have', 'minor', 'cosmetic']
};

export async function activate(context) {
  const { log, hooks } = context;

  hooks.on('task:beforeCreate', async (ctx) => {
    const title = ctx.title.toLowerCase();
    const description = (ctx.description || '').toLowerCase();
    const text = title + ' ' + description;

    let priority = 'medium';  // default

    for (const [level, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        priority = level;
        break;
      }
    }

    log.info(`Auto-set priority to ${priority} for: ${ctx.title}`);

    return {
      task: { ...ctx, priority },
      cancel: false
    };
  });
}
```

### Example 2b: Auto-Epic Plugin

Automatically assign Epic based on keywords (for Jira alignment).

```javascript
// main.js
const EPIC_MAPPINGS = {
  authentication: { name: 'Authentication', color: '#3b82f6' },
  api: { name: 'API', color: '#10b981' },
  ui: { name: 'UI/UX', color: '#f59e0b' },
  testing: { name: 'Testing', color: '#8b5cf6' },
  infrastructure: { name: 'Infrastructure', color: '#ef4444' }
};

export async function activate(context) {
  const { log, hooks } = context;

  hooks.on('task:beforeCreate', async (ctx) => {
    // Skip if epic already set
    if (ctx.epic) {
      return { task: ctx, cancel: false };
    }

    const text = (ctx.title + ' ' + (ctx.description || '')).toLowerCase();

    // Find matching epic
    for (const [keyword, epic] of Object.entries(EPIC_MAPPINGS)) {
      if (text.includes(keyword)) {
        log.info(`Auto-assigned epic "${epic.name}" to: ${ctx.title}`);
        return {
          task: { ...ctx, epic },
          cancel: false
        };
      }
    }

    return { task: ctx, cancel: false };
  });
}
```

### Example 3: Workflow Enforcer Plugin

Enforce that tasks must go through review before done.

```javascript
// main.js
export async function activate(context) {
  const { log, hooks } = context;

  hooks.on('task:beforeMove', async (ctx) => {
    const { task, fromColumn, toColumn } = ctx;

    // Prevent skipping review
    if (toColumn === 'done' && fromColumn !== 'review') {
      log.warn(`Blocked: Task "${task.title}" must go through review`);
      return {
        toColumn: 'review',  // Redirect to review instead
        cancel: false
      };
    }

    return { cancel: false };
  });
}
```

### Example 4: Notification Plugin

Send notifications on task completion.

```javascript
// main.js
export async function activate(context) {
  const { log, hooks } = context;

  hooks.on('agent:afterRun', async (ctx) => {
    const { task, success, error } = ctx;

    if (success) {
      // Use Electron notification API
      new Notification('Task Completed', {
        body: `"${task.title}" has been completed successfully`,
        icon: './assets/success.png'
      });
    } else {
      new Notification('Task Failed', {
        body: `"${task.title}" failed: ${error}`,
        icon: './assets/error.png'
      });
    }
  });
}
```

### Example 5: Full UI Extension Plugin

A complete plugin demonstrating all UI extension points.

**Directory Structure:**
```
.local-kanban/plugins/com.example.task-metrics/
├── manifest.json
├── main.js
└── renderer/
    ├── index.js
    └── styles.css
```

**manifest.json:**
```json
{
  "id": "com.example.task-metrics",
  "name": "Task Metrics",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Track and visualize task completion metrics",
  "main": "main.js",
  "permissions": {
    "tasks": "read",
    "settings": "write",
    "ui": {
      "tabs": true,
      "sidebars": true
    }
  },
  "contributes": {
    "settingsTab": {
      "id": "metrics-settings",
      "title": "Metrics",
      "icon": "BarChart2",
      "order": 60
    },
    "dockingPanels": [
      {
        "id": "metrics-dashboard",
        "title": "Metrics Dashboard",
        "icon": "Activity",
        "singleton": true,
        "defaultPosition": "right"
      }
    ],
    "slots": [
      {
        "slotId": "task-card:badge",
        "order": 10
      },
      {
        "slotId": "task-detail:sidebar",
        "order": 20
      },
      {
        "slotId": "topbar:right",
        "order": 50
      }
    ],
    "contextMenus": [
      {
        "location": "task",
        "items": [
          {
            "id": "metrics.track",
            "label": "Track Time"
          }
        ]
      }
    ]
  },
  "renderer": {
    "entry": "renderer/index.js",
    "styles": "renderer/styles.css"
  }
}
```

**main.js:**
```javascript
let metrics = {};

export async function activate(context) {
  const { log, hooks, storage, ui } = context;

  // Load persisted metrics
  metrics = await storage.get('metrics') || {};

  // Track task completions
  hooks.on('task:afterMove', async (ctx) => {
    const { task, toColumn } = ctx;

    if (toColumn === 'done') {
      metrics[task.id] = {
        completedAt: Date.now(),
        duration: calculateDuration(task)
      };
      await storage.set('metrics', metrics);
      log.info(`Tracked completion for: ${task.title}`);
    }
  });

  // Register context menu handler
  ui.registerContextMenuItem({
    id: 'metrics.track',
    label: 'Track Time',
    icon: 'Clock',
    location: 'task'
  }, async (ctx) => {
    const { taskId, task } = ctx;
    metrics[taskId] = {
      ...metrics[taskId],
      trackingStarted: Date.now()
    };
    await storage.set('metrics', metrics);
    log.info(`Started tracking: ${task.title}`);
  });

  log.info('Task Metrics plugin activated');
}

function calculateDuration(task) {
  const started = metrics[task.id]?.trackingStarted;
  return started ? Date.now() - started : null;
}

export const api = {
  getMetrics() {
    return metrics;
  },

  getTaskMetric(taskId) {
    return metrics[taskId] || null;
  },

  async clearMetrics() {
    metrics = {};
    await storage.set('metrics', {});
  }
};
```

**renderer/index.js:**
```javascript
import React, { useState, useEffect } from 'react';

// Settings Tab Component
export function SettingsTab({ pluginId }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // Load settings
    window.dexteria.plugin.getSettings(pluginId)
      .then(settings => setEnabled(settings?.enabled ?? true));
  }, [pluginId]);

  const handleToggle = async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    await window.dexteria.plugin.setSettings(pluginId, { enabled: newValue });
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Metrics Settings</h2>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          className="rounded"
        />
        <span>Enable metrics tracking</span>
      </label>

      <button
        onClick={() => window.dexteria.plugin.callApi(pluginId, 'clearMetrics')}
        className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
      >
        Clear All Metrics
      </button>
    </div>
  );
}

// Docking Panel Component (Dashboard)
export function DockingPanel({ pluginId }) {
  const [metrics, setMetrics] = useState({});
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const [metricsData, tasksData] = await Promise.all([
        window.dexteria.plugin.callApi(pluginId, 'getMetrics'),
        window.dexteria.tasks.getAll()
      ]);
      setMetrics(metricsData);
      setTasks(tasksData);
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [pluginId]);

  const completedCount = Object.values(metrics).filter(m => m.completedAt).length;
  const trackingCount = Object.values(metrics).filter(m => m.trackingStarted && !m.completedAt).length;

  return (
    <div className="h-full p-4 space-y-4 overflow-auto">
      <h2 className="text-lg font-semibold">Metrics Dashboard</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">{completedCount}</div>
          <div className="text-sm text-muted-foreground">Tasks Completed</div>
        </div>

        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-400">{trackingCount}</div>
          <div className="text-sm text-muted-foreground">Currently Tracking</div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Recent Completions</h3>
        {Object.entries(metrics)
          .filter(([_, m]) => m.completedAt)
          .sort((a, b) => b[1].completedAt - a[1].completedAt)
          .slice(0, 5)
          .map(([taskId, metric]) => {
            const task = tasks.find(t => t.id === taskId);
            return (
              <div key={taskId} className="p-2 bg-muted/20 rounded text-sm">
                <div className="truncate">{task?.title || taskId}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(metric.completedAt).toLocaleString()}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// Task Card Badge Component
export function TaskCardBadge({ pluginId, context }) {
  const { taskId } = context;
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    window.dexteria.plugin.callApi(pluginId, 'getTaskMetric', taskId)
      .then(metric => setTracking(!!metric?.trackingStarted && !metric?.completedAt));
  }, [pluginId, taskId]);

  if (!tracking) return null;

  return (
    <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded-full">
      ⏱️ Tracking
    </span>
  );
}

// Task Detail Sidebar Component
export function TaskDetailSidebar({ pluginId, context }) {
  const { taskId, task } = context;
  const [metric, setMetric] = useState(null);

  useEffect(() => {
    window.dexteria.plugin.callApi(pluginId, 'getTaskMetric', taskId)
      .then(setMetric);
  }, [pluginId, taskId]);

  if (!metric) return null;

  return (
    <div className="p-3 bg-muted/10 rounded-lg border border-border">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Task Metrics
      </h4>

      {metric.trackingStarted && (
        <div className="text-sm">
          <span className="text-muted-foreground">Started: </span>
          {new Date(metric.trackingStarted).toLocaleString()}
        </div>
      )}

      {metric.completedAt && (
        <>
          <div className="text-sm">
            <span className="text-muted-foreground">Completed: </span>
            {new Date(metric.completedAt).toLocaleString()}
          </div>
          {metric.duration && (
            <div className="text-sm">
              <span className="text-muted-foreground">Duration: </span>
              {formatDuration(metric.duration)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// TopBar Component
export function TopBarRight({ pluginId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      const metrics = await window.dexteria.plugin.callApi(pluginId, 'getMetrics');
      const tracking = Object.values(metrics).filter(m => m.trackingStarted && !m.completedAt);
      setCount(tracking.length);
    };

    loadCount();
    const interval = setInterval(loadCount, 5000);
    return () => clearInterval(interval);
  }, [pluginId]);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded text-xs text-blue-400">
      <span>⏱️</span>
      <span>{count} tracking</span>
    </div>
  );
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
```

**renderer/styles.css:**
```css
/* Optional custom styles for the plugin */
.metrics-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}

.metrics-value {
  font-size: 24px;
  font-weight: bold;
}
```

---

## Troubleshooting

### Plugin Not Loading

1. Check `manifest.json` has required fields: `id`, `name`, `version`
2. Verify `main.js` exports an `activate` function
3. Check console for error messages
4. Ensure plugin folder is in `.local-kanban/plugins/`

### Hooks Not Firing

1. Verify hook name is spelled correctly
2. Check that `hooks.on()` is called inside `activate()`
3. Look for errors in the console log

### Storage Not Persisting

1. Use `await` with all storage operations
2. Check file permissions on `.local-kanban/plugins/data/`
3. Verify plugin ID matches storage path

### Plugin State Shows "error"

1. Check console for activation errors
2. Ensure all async operations have try/catch
3. Verify all dependencies are available

---

## API Reference Summary

### Plugin IPC API (Renderer Access)

```typescript
window.dexteria.plugin = {
  getAll(): Promise<PluginInfo[]>;
  get(pluginId: string): Promise<PluginInfo | null>;
  enable(pluginId: string): Promise<boolean>;
  disable(pluginId: string): Promise<boolean>;
  getSettings(pluginId: string): Promise<Record<string, unknown>>;
  setSettings(pluginId: string, settings: Record<string, unknown>): Promise<void>;

  // UI Extensions
  getTabs(): Promise<PluginTab[]>;
  getTabsByPosition(position: string): Promise<PluginTab[]>;
  getContextMenuItems(): Promise<PluginContextMenuItem[]>;
  getContextMenuItemsByLocation(location: string): Promise<PluginContextMenuItem[]>;
  executeContextMenuItem(itemId: string, context: unknown): Promise<void>;

  // Plugin API
  callApi(pluginId: string, methodName: string, ...args: unknown[]): Promise<unknown>;
};
```

---

## Plugin Types

Dexteria supports two types of plugins:

### Bundled Plugins

First-party plugins that ship with Dexteria:

- Located in `src/main/plugins/bundled/`
- Enabled by default
- Their UI components are built-in React components
- Example: `com.dexteria.jira`

### User Plugins

Third-party plugins installed by users:

- Located in `.local-kanban/plugins/`
- Need to be enabled manually
- Their UI components are rendered in iframes for security
- Can be developed by anyone following this guide

## Jira Plugin (Reference Implementation)

The bundled Jira plugin serves as a reference implementation demonstrating:

### Plugin Structure
```
src/main/plugins/bundled/com.dexteria.jira/
├── manifest.json              # Plugin manifest with UI contributions
├── main.js                    # Main process entry point
└── lib/
    ├── constants.js           # API URLs and configuration
    ├── AuthManager.js         # OAuth 2.0 authentication
    ├── JiraClient.js          # Jira API client
    ├── ImportEngine.js        # Issue import logic
    └── SyncEngine.js          # Bidirectional sync
```

### Built-in UI Components
```
src/renderer/components/
├── JiraPanel.tsx              # Settings and configuration UI
├── JiraTaskCardBadge.tsx      # Task card badge showing linked status
└── JiraTaskDetailSidebar.tsx  # Task detail Jira info panel
```

### UI Contributions
```json
{
  "contributes": {
    "settingsTab": {
      "id": "jira-settings",
      "title": "Jira",
      "icon": "Link2",
      "order": 70
    },
    "dockingPanels": [{
      "id": "jira-panel",
      "title": "Jira",
      "icon": "ExternalLink",
      "singleton": true
    }],
    "slots": [
      { "slotId": "task-card:badge", "order": 10 },
      { "slotId": "task-detail:sidebar", "order": 10 }
    ]
  }
}
```

---

## Next Steps

- Review the Jira plugin source code in `src/main/plugins/bundled/com.dexteria.jira/`
- Study the built-in UI components in `src/renderer/components/Jira*.tsx`
- Check out `src/renderer/plugins/BuiltInPluginComponents.tsx` for first-party component mapping
- Join the Dexteria community for support and discussions
