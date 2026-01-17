# Dexteria Plugin System Architecture Plan

## Overview

This document outlines the design for a plugin system that allows users and developers to extend Dexteria's functionality. The plugin system will be built on an event-driven architecture with well-defined extension points throughout the application.

---

## Core Architecture

### Plugin Runtime Environment

Plugins will run in an isolated context with controlled access to Dexteria's APIs. We recommend using **JavaScript/TypeScript** as the plugin language for consistency with the main codebase.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Plugin Manager                          │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │    │
│  │  │  Loader     │ │ Sandbox     │ │ Lifecycle   │        │    │
│  │  │  Registry   │ │ Context     │ │ Manager     │        │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                      │
│                            ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Plugin APIs                            │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │ Kanban  │ │  Chat   │ │ Agent   │ │ UI      │        │    │
│  │  │ API     │ │  API    │ │  API    │ │ API     │        │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Renderer Process                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               Plugin UI Components                         │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │    │
│  │  │ Custom Tabs │ │ Sidebars    │ │ Modals      │        │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Package Structure

```
my-plugin/
├── package.json          # Plugin metadata and dependencies
├── manifest.json         # Plugin capabilities and permissions
├── main.js               # Main process entry (if needed)
├── renderer.js           # Renderer process entry (if needed)
├── components/           # React components for UI extensions
│   └── MyPanel.tsx
└── assets/               # Static assets
    └── icon.png
```

### manifest.json Schema

```typescript
interface PluginManifest {
  id: string;                    // Unique identifier (e.g., "com.example.myplugin")
  name: string;                  // Display name
  version: string;               // SemVer version
  author: string;
  description: string;
  main?: string;                 // Main process entry point
  renderer?: string;             // Renderer process entry point

  // Permissions the plugin requests
  permissions: {
    tasks?: 'read' | 'write' | 'full';
    chat?: 'read' | 'write' | 'full';
    agent?: 'read' | 'execute';
    files?: 'read' | 'write' | 'full';
    terminal?: 'read' | 'execute';
    settings?: 'read' | 'write';
    ui?: {
      tabs?: boolean;
      sidebars?: boolean;
      modals?: boolean;
      contextMenus?: boolean;
    };
  };

  // Extension points the plugin uses
  contributes: {
    commands?: CommandContribution[];
    tabs?: TabContribution[];
    contextMenus?: ContextMenuContribution[];
    hooks?: HookContribution[];
    themes?: ThemeContribution[];
    settings?: SettingContribution[];
  };
}
```

---

## Extension Points

### 1. Chat Hooks

Plugins can intercept and modify chat messages at various points in the lifecycle.

```typescript
interface ChatHooks {
  // Before sending a message to the AI
  'chat:beforeSend': (context: {
    message: string;
    chatId: string;
    mode: 'agent' | 'planner';
  }) => Promise<{
    message: string;    // Modified message
    cancel?: boolean;   // Cancel sending
    metadata?: object;  // Data passed to afterResponse
  }>;

  // After receiving AI response (before display)
  'chat:afterResponse': (context: {
    response: string;
    chatId: string;
    metadata?: object;  // From beforeSend
  }) => Promise<{
    response: string;   // Modified response
  }>;

  // Before saving message to history
  'chat:beforeSave': (context: {
    message: ChatMessage;
    chatId: string;
  }) => Promise<{
    message: ChatMessage;
    cancel?: boolean;
  }>;
}
```

**Example Use Cases:**
- Add custom context to all messages
- Filter or transform AI responses
- Translate messages
- Add syntax highlighting
- Log conversations to external systems

### 2. Kanban/Task Hooks

```typescript
interface KanbanHooks {
  // Task lifecycle
  'task:beforeCreate': (task: TaskCreateInput) => Promise<{
    task: TaskCreateInput;
    cancel?: boolean;
  }>;

  'task:afterCreate': (task: Task) => void;

  'task:beforeUpdate': (taskId: string, patch: TaskPatch) => Promise<{
    patch: TaskPatch;
    cancel?: boolean;
  }>;

  'task:afterUpdate': (task: Task, previousTask: Task) => void;

  'task:beforeMove': (taskId: string, fromColumn: string, toColumn: string) => Promise<{
    toColumn: string;  // Allow redirect
    cancel?: boolean;
  }>;

  'task:afterMove': (task: Task, fromColumn: string) => void;

  'task:beforeDelete': (taskId: string) => Promise<{
    cancel?: boolean;
  }>;

  // Board events
  'board:refresh': (board: Board, tasks: Task[]) => void;
}
```

**Example Use Cases:**
- Auto-assign tags based on task content
- Enforce workflow rules (e.g., require review before done)
- Sync tasks with external systems (Jira, GitHub Issues)
- Auto-generate acceptance criteria
- Track time spent in each column

### 3. Agent Execution Hooks

```typescript
interface AgentHooks {
  // Before agent runs a task
  'agent:beforeRun': (context: {
    taskId: string;
    task: Task;
    mode: 'manual' | 'ralph';
  }) => Promise<{
    cancel?: boolean;
    additionalContext?: string;  // Added to prompt
  }>;

  // After agent completes a task
  'agent:afterRun': (context: {
    taskId: string;
    task: Task;
    run: AgentRun;
    success: boolean;
  }) => void;

  // Before agent executes a tool
  'agent:beforeTool': (context: {
    toolName: string;
    toolInput: object;
    taskId: string;
  }) => Promise<{
    cancel?: boolean;
    modifiedInput?: object;
  }>;

  // After tool execution
  'agent:afterTool': (context: {
    toolName: string;
    toolInput: object;
    toolOutput: object;
    taskId: string;
  }) => void;

  // Ralph mode events
  'ralph:started': () => void;
  'ralph:stopped': (stats: RalphStats) => void;
  'ralph:taskCompleted': (task: Task, run: AgentRun) => void;
  'ralph:taskFailed': (task: Task, error: string) => void;
}
```

**Example Use Cases:**
- Custom tool implementations
- Block certain operations based on rules
- Log all tool calls for debugging
- Custom notification on completion
- Integration with CI/CD pipelines

### 4. Terminal/Process Hooks

```typescript
interface TerminalHooks {
  // Before command execution
  'terminal:beforeCommand': (context: {
    command: string;
    cwd: string;
    taskId?: string;
  }) => Promise<{
    command: string;
    cancel?: boolean;
  }>;

  // Command output stream
  'terminal:output': (context: {
    runId: string;
    data: string;
    type: 'stdout' | 'stderr';
  }) => void;

  // After command completes
  'terminal:afterCommand': (context: {
    command: string;
    exitCode: number;
    runId: string;
  }) => void;
}
```

### 5. UI Extension Points

```typescript
interface UIContributions {
  // Custom tabs in the right panel (alongside Chat and Task tabs)
  tabs: {
    id: string;
    title: string;
    icon: string;          // Lucide icon name
    component: string;     // Path to React component
    position?: 'before' | 'after';
    showBadge?: () => number | null;  // Badge count
  }[];

  // Context menu items
  contextMenus: {
    location: 'task-card' | 'chat-message' | 'board-column' | 'file';
    items: {
      id: string;
      label: string;
      icon?: string;
      shortcut?: string;
      action: string;      // Handler function name
      when?: string;       // Condition expression
    }[];
  }[];

  // Settings sections
  settings: {
    id: string;
    title: string;
    icon: string;
    component: string;
  }[];

  // Status bar items
  statusBar: {
    id: string;
    position: 'left' | 'right';
    component: string;
  }[];

  // Sidebar panels
  sidebars: {
    id: string;
    title: string;
    icon: string;
    component: string;
    location: 'left' | 'right' | 'bottom';
  }[];
}
```

---

## Plugin API Reference

### Dexteria Plugin API

Plugins receive a `dexteria` object with scoped APIs based on their permissions.

```typescript
interface DexteriaPluginAPI {
  // Plugin info
  plugin: {
    id: string;
    version: string;
    dataPath: string;        // Path for plugin data storage
  };

  // Logging
  log: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };

  // Storage (scoped to plugin)
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };

  // Tasks API (if permitted)
  tasks?: {
    getAll: () => Promise<Task[]>;
    get: (id: string) => Promise<Task>;
    create: (input: TaskCreateInput) => Promise<Task>;
    update: (id: string, patch: TaskPatch) => Promise<Task>;
    delete: (id: string) => Promise<void>;
    move: (id: string, column: string) => Promise<void>;
    addComment: (taskId: string, comment: CommentInput) => Promise<void>;
  };

  // Chat API (if permitted)
  chat?: {
    getChats: () => Promise<Chat[]>;
    getChat: (id: string) => Promise<Chat>;
    createChat: (title: string) => Promise<Chat>;
    sendMessage: (chatId: string, content: string) => Promise<void>;
    deleteChat: (id: string) => Promise<void>;
  };

  // Agent API (if permitted)
  agent?: {
    runTask: (taskId: string, options?: RunOptions) => Promise<AgentRun>;
    cancel: () => Promise<void>;
    isRunning: () => Promise<boolean>;
    getStatus: () => Promise<AgentState>;
  };

  // UI API
  ui: {
    showNotification: (options: NotificationOptions) => void;
    showModal: (component: string, props?: object) => Promise<any>;
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
    showInput: (options: InputOptions) => Promise<string | null>;
    registerCommand: (command: Command) => Disposable;
    getActiveTask: () => Task | null;
    getActiveChat: () => Chat | null;
  };

  // Files API (if permitted)
  files?: {
    read: (path: string) => Promise<string>;
    write: (path: string, content: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    list: (path: string) => Promise<string[]>;
    watch: (path: string, callback: (event: FileEvent) => void) => Disposable;
  };

  // Hooks registration
  hooks: {
    on: (hook: string, handler: Function) => Disposable;
    off: (hook: string, handler: Function) => void;
  };

  // Events
  events: {
    emit: (event: string, data: any) => void;
    on: (event: string, handler: Function) => Disposable;
    off: (event: string, handler: Function) => void;
  };
}
```

---

## Plugin Lifecycle

### 1. Discovery & Loading

```typescript
interface PluginLifecycle {
  // Called when plugin is first loaded
  activate: (context: PluginContext) => Promise<void>;

  // Called when plugin is being unloaded
  deactivate: () => Promise<void>;

  // Called when plugin settings change
  onConfigChange?: (config: object) => void;

  // Called when project opens/closes
  onProjectOpen?: (projectPath: string) => void;
  onProjectClose?: () => void;
}
```

### 2. Plugin States

```
  Installed → Disabled ←→ Enabled → Active
       ↓         ↓           ↓
    Uninstalled  (can be toggled)  (per project)
```

### 3. Loading Order

1. **System plugins** (bundled with Dexteria)
2. **User plugins** (installed globally)
3. **Project plugins** (in `.local-kanban/plugins/`)

---

## Security & Sandboxing

### Permission Model

```typescript
interface PluginPermissions {
  // Resource access levels
  'tasks': 'none' | 'read' | 'write' | 'full';
  'chat': 'none' | 'read' | 'write' | 'full';
  'agent': 'none' | 'read' | 'execute';
  'files': 'none' | 'read' | 'write' | 'full';
  'terminal': 'none' | 'read' | 'execute';
  'settings': 'none' | 'read' | 'write';

  // UI permissions
  'ui.tabs': boolean;
  'ui.modals': boolean;
  'ui.contextMenus': boolean;
  'ui.notifications': boolean;

  // Network access (dangerous)
  'network': 'none' | 'local' | 'restricted' | 'full';

  // System access (very dangerous)
  'system': 'none' | 'limited' | 'full';
}
```

### Sandbox Restrictions

1. **No direct Node.js access** - Plugins use provided APIs only
2. **No arbitrary code execution** - No eval, Function constructor
3. **File access scoped** - Only to project dir and plugin data dir
4. **Network requests logged** - All HTTP requests are logged
5. **Memory limits** - Plugins have memory allocation limits
6. **Timeout enforcement** - Long-running operations are killed

### Trust Levels

| Level | Source | Permissions |
|-------|--------|-------------|
| Trusted | Bundled/Signed | Full access |
| Verified | From registry | Medium access |
| User | Manually installed | Requires approval |
| Untrusted | Unknown source | Minimal/sandboxed |

---

## Implementation Phases

### Phase 1: Foundation (MVP)

- [ ] Plugin manager service in main process
- [ ] Plugin manifest schema and validation
- [ ] Basic lifecycle management (activate/deactivate)
- [ ] Plugin storage API
- [ ] Hook system for chat messages
- [ ] Plugin settings UI in Settings modal

### Phase 2: Core Extensions

- [ ] Kanban/Task hooks
- [ ] Agent execution hooks
- [ ] Custom tabs support
- [ ] Context menu extensions
- [ ] Terminal hooks

### Phase 3: Advanced Features

- [ ] UI component injection
- [ ] Custom sidebars
- [ ] Plugin marketplace/registry
- [ ] Plugin dependencies
- [ ] Hot reloading during development

### Phase 4: Ecosystem

- [ ] Plugin development CLI
- [ ] Documentation site
- [ ] Official plugin templates
- [ ] Automated testing framework
- [ ] Plugin signing and verification

---

## Example Plugins

### 1. GitHub Integration Plugin

```typescript
// manifest.json
{
  "id": "com.dexteria.github",
  "name": "GitHub Integration",
  "version": "1.0.0",
  "permissions": {
    "tasks": "full",
    "network": "restricted"
  },
  "contributes": {
    "commands": [
      { "id": "github.syncIssues", "title": "Sync GitHub Issues" }
    ],
    "contextMenus": [
      {
        "location": "task-card",
        "items": [
          { "id": "github.createPR", "label": "Create Pull Request" }
        ]
      }
    ]
  }
}

// main.ts
export function activate(context: PluginContext) {
  const { dexteria } = context;

  // Sync tasks with GitHub Issues
  dexteria.hooks.on('task:afterCreate', async (task) => {
    if (task.tags?.includes('github')) {
      await createGitHubIssue(task);
    }
  });

  // Create PR command
  dexteria.ui.registerCommand({
    id: 'github.createPR',
    handler: async (taskId: string) => {
      const task = await dexteria.tasks.get(taskId);
      // Create PR logic...
    }
  });
}
```

### 2. Time Tracking Plugin

```typescript
// Tracks time spent on tasks in each column
export function activate(context: PluginContext) {
  const { dexteria } = context;

  dexteria.hooks.on('task:afterMove', async (task, fromColumn) => {
    const now = Date.now();
    const history = await dexteria.storage.get(`time:${task.id}`) || [];

    history.push({
      from: fromColumn,
      to: task.status,
      timestamp: now
    });

    await dexteria.storage.set(`time:${task.id}`, history);
  });

  // Show time stats in task detail
  dexteria.ui.registerSidebar({
    id: 'time-tracking',
    component: 'TimeTrackingSidebar'
  });
}
```

### 3. AI Prompt Templates Plugin

```typescript
// Provides prompt templates for common tasks
export function activate(context: PluginContext) {
  const { dexteria } = context;

  const templates = {
    'bug-fix': 'Fix the following bug: {{description}}\n\nSteps to reproduce:\n{{steps}}',
    'feature': 'Implement the following feature: {{description}}\n\nAcceptance criteria:\n{{criteria}}',
    'refactor': 'Refactor the following code: {{path}}\n\nGoals:\n{{goals}}'
  };

  dexteria.hooks.on('chat:beforeSend', async (ctx) => {
    let message = ctx.message;

    // Replace template markers
    for (const [name, template] of Object.entries(templates)) {
      if (message.startsWith(`/${name}`)) {
        message = template + '\n\n' + message.slice(name.length + 1);
        break;
      }
    }

    return { message };
  });
}
```

---

## Developer Experience

### Plugin Development Setup

```bash
# Create new plugin
npx create-dexteria-plugin my-plugin

# Development mode (hot reload)
cd my-plugin
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

### Testing Framework

```typescript
import { createTestContext } from '@dexteria/plugin-testing';

describe('MyPlugin', () => {
  let context: TestContext;

  beforeEach(() => {
    context = createTestContext();
  });

  it('should modify chat messages', async () => {
    await context.loadPlugin('./my-plugin');

    const result = await context.triggerHook('chat:beforeSend', {
      message: 'Hello',
      chatId: 'test-chat'
    });

    expect(result.message).toBe('Modified: Hello');
  });
});
```

---

## Configuration

### Global Plugin Settings

```typescript
// Stored in userData/plugins.json
interface PluginGlobalConfig {
  enabled: string[];           // Enabled plugin IDs
  disabled: string[];          // Disabled plugin IDs
  permissions: Record<string, PluginPermissions>;
  settings: Record<string, object>;  // Per-plugin settings
}
```

### Project Plugin Settings

```typescript
// Stored in .local-kanban/plugins.json
interface PluginProjectConfig {
  enabled: string[];           // Project-specific enabled
  disabled: string[];          // Project-specific disabled
  settings: Record<string, object>;  // Project-specific settings
}
```

---

## Migration Path

### From Current Architecture

1. Extract existing features into internal "plugins":
   - Theme system → Theme plugin (internal)
   - GitHub/Jira sync → Integration plugins

2. Refactor hook points:
   - Add event emitters at key lifecycle points
   - Ensure backward compatibility

3. Create plugin API:
   - Start with read-only APIs
   - Add write APIs after security review

---

## Open Questions

1. **Plugin Distribution**: Build our own registry vs. npm packages vs. both?
2. **UI Framework**: Should plugins use React or provide an abstraction?
3. **Versioning**: How to handle plugin/Dexteria version compatibility?
4. **Monetization**: Support for paid plugins?
5. **Sandboxing**: Node.js VM vs. Worker threads vs. separate process?

---

## Next Steps

1. Review and approve this plan
2. Create detailed technical specs for Phase 1
3. Set up plugin development environment
4. Implement PluginManager service
5. Create first internal plugin (refactor themes)
6. Document plugin API
7. Build example plugins
8. Community feedback and iteration
