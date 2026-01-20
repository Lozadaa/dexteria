# Dexteria - AI-Powered Project Executor

## Overview

**Dexteria** is a local-first desktop application that combines a Kanban board with an autonomous AI agent called "Dexter". It enables project planning and execution with full privacy - all data stays on your machine.

---

## Business Level

### What is Dexteria?

Dexteria is an AI project manager that can:
- **Plan** your work with a Kanban board
- **Execute** tasks autonomously using Claude AI
- **Learn** from failures and retry with context
- **Track** all changes with full observability
- **Customize** themes and extend via plugins

### Core Concepts

#### Two Modes of Operation

| Mode | Purpose | Capabilities |
|------|---------|--------------|
| **Planner** | Safe project planning | Read code, analyze, create tasks, chat |
| **Agent** | Full execution | Everything + write files, run commands |

#### Task Lifecycle

```
Backlog → To Do → In Progress → Review → Done
   │         │          │          │
   └─────────┴──────────┴──────────┘
         (AI executes these)
```

#### Jira Alignment

Tasks support **Epic** and **Sprint** fields for Jira integration:
- **Epic**: Categorizes tasks with a name and color label
- **Sprint**: Identifies the delivery sprint (e.g., "Sprint 1")

#### Ralph Mode (Autopilot)

"Ralph" is the autonomous execution mode that:
1. Takes all tasks from **backlog**
2. Respects **dependencies** between tasks
3. Executes them **one by one**
4. Learns from **failures** and retries
5. Moves successful tasks to **review**

### Key Features

1. **AI Task Execution**
   - Natural language task descriptions
   - Acceptance criteria verification
   - Automatic code generation and testing

2. **VSCode-Style Docking System**
   - Flexible panel layout with drag-and-drop tabs
   - Split panels horizontally/vertically
   - Layout persistence in localStorage
   - Window menu for panel management

3. **Theme System**
   - Customizable color themes
   - Theme editor with live preview
   - Import/export themes
   - Per-project themes

4. **Plugin System**
   - Hook-based architecture (14 hooks)
   - UI extensions (tabs, context menus)
   - Storage API for plugins
   - Jira integration plugin available

5. **Safety First**
   - Git branch per execution (rollback capability)
   - Policy-based access control
   - Max attempts limit per task
   - Detailed failure logging

6. **Local-First**
   - All data in `.local-kanban/` folder
   - Human-readable JSON files
   - Works offline
   - Full privacy

7. **Observability**
   - Every action logged
   - Run artifacts saved
   - Failure context preserved
   - Activity timeline

---

## Technical Level

### Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 28 |
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| AI | Anthropic Claude API |
| Drag & Drop | dnd-kit |
| Panels | react-resizable-panels |
| Validation | Zod |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │   Main Process  │   IPC   │    Renderer Process     │   │
│  │   (Node.js)     │◄───────►│    (React + Vite)       │   │
│  └────────┬────────┘         └─────────────────────────┘   │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │  Agent System   │                                        │
│  │  ┌───────────┐  │                                        │
│  │  │ Runtime   │  │                                        │
│  │  │ Ralph     │  │                                        │
│  │  │ Providers │  │                                        │
│  │  │ Tools     │  │                                        │
│  │  └───────────┘  │                                        │
│  └────────┬────────┘                                        │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │ LocalKanbanStore│──────► .local-kanban/                  │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── main/                    # Electron main process
│   ├── main.ts             # App entry, window creation
│   ├── preload.ts          # IPC bridge (security)
│   ├── agent/              # AI agent system
│   │   ├── AgentRuntime.ts # Task execution engine
│   │   ├── RalphEngine.ts  # Autonomous batch executor
│   │   ├── AgentProvider.ts# LLM abstraction + prompts
│   │   ├── providers/      # Claude, Mock providers
│   │   └── tools/          # File ops, commands, search
│   ├── ipc/handlers/       # IPC handlers by domain
│   └── services/           # Business logic
│       ├── LocalKanbanStore.ts  # Data persistence
│       ├── PolicyGuard.ts       # Security enforcement
│       ├── CommentService.ts    # Task comments
│       ├── ThemeService.ts      # Theme management
│       └── PluginManager.ts     # Plugin system
├── renderer/               # React frontend
│   ├── App.tsx            # Root component
│   ├── components/        # UI components
│   │   ├── KanbanBoard.tsx
│   │   ├── TaskCard.tsx    # Shows Epic label with color
│   │   ├── TaskDetail.tsx  # Epic/Sprint editing
│   │   ├── ChatPanel.tsx
│   │   ├── TopBar.tsx      # Window menu for panels
│   │   ├── ThemeEditor.tsx
│   │   └── SettingsPanel.tsx
│   ├── docking/           # VSCode-style docking system
│   │   ├── types.ts       # Layout types (SplitNode, PanelNode)
│   │   ├── DockingContext.tsx
│   │   ├── DockingLayout.tsx
│   │   ├── DockablePanel.tsx
│   │   ├── ComponentRegistry.tsx
│   │   ├── treeOperations.ts
│   │   ├── persistence.ts
│   │   └── defaultLayout.ts
│   ├── contexts/          # React context
│   │   ├── ModeContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ConfirmContext.tsx
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities
└── shared/                # Shared code
    ├── types.ts           # TypeScript interfaces (Task, Epic, Sprint, Theme, Plugin)
    └── schemas.ts         # Zod validators
```

### Data Model

#### .local-kanban/ Structure

```
.local-kanban/
├── board.json              # Kanban columns and order
├── tasks.json              # All tasks with metadata (Epic, Sprint)
├── state.json              # Current agent mode/state
├── policy.json             # Security rules
├── settings.json           # Project settings
├── activity.jsonl          # Activity log (append-only)
├── context/
│   ├── project_context.json
│   └── repo_index.json
├── chats/
│   ├── index.json
│   └── chat-*.json
├── themes/                 # Theme files
│   ├── index.json          # Theme registry
│   └── *.json              # Individual themes
├── plugins/                # Installed plugins
│   ├── index.json          # Plugin registry
│   └── com.example.plugin/ # Plugin directories
├── agent-runs/             # Execution artifacts
│   └── <taskId>/
│       └── <runId>.json
└── backups/                # Automatic backups
```

#### Key Types

```typescript
// Epic for Jira alignment
interface TaskEpic {
  name: string;
  color: string; // Hex color like "#3b82f6"
}

// Task with all metadata
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'doing' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  acceptanceCriteria: string[];
  dependsOn: string[];
  epic?: TaskEpic;           // Epic with name and color
  sprint?: string;           // Sprint identifier
  comments: TaskComment[];
  runtime: TaskRuntimeState;
  agent: TaskAgentConfig;
}

// Docking system layout
interface SplitNode {
  id: string;
  type: 'split';
  direction: 'horizontal' | 'vertical';
  children: [LayoutNode, LayoutNode];
  sizes: [number, number];
}

interface PanelNode {
  id: string;
  type: 'panel';
  tabs: string[];
  activeTabId: string | null;
}

// Comment types for task communication
interface TaskComment {
  id: string;
  type: 'note' | 'instruction' | 'failure' | 'agent' | 'system';
  author: string;
  content: string;
  createdAt: string;
  runId?: string;
}

// Agent execution record
interface AgentRun {
  id: string;
  taskId: string;
  status: 'running' | 'completed' | 'failed' | 'blocked';
  steps: number;
  toolCalls: ToolCall[];
  filesModified: string[];
  summary?: string;
  error?: string;
}
```

### Agent System

#### Execution Flow

```
1. Task Selected
       │
       ▼
2. Load Task + Acceptance Criteria + Epic/Sprint
       │
       ▼
3. Build Prompt (with Epic, Sprint, failure context)
       │
       ▼
4. Call ClaudeCodeProvider
       │
       ▼
5. Stream Response + Tool Calls
       │
       ├── Read files
       ├── Write files
       ├── Run commands
       ├── Create/Update tasks (with Epic/Sprint)
       └── Search code
       │
       ▼
6. Verify Acceptance Criteria
       │
       ├── Pass → Move to Review
       └── Fail → Add Failure Comment, Retry or Block
       │
       ▼
7. Save Run Artifact
```

#### Agent Tools

The agent has access to these tools:

| Tool | Description |
|------|-------------|
| `list_files` | List files matching a glob pattern |
| `read_file` | Read file contents |
| `search` | Search for patterns in files |
| `write_file` | Write content to a file |
| `apply_patch` | Apply a unified diff patch |
| `run_command` | Run a shell command |
| `create_task` | Create task with Epic/Sprint support |
| `update_task` | Update task including Epic/Sprint |
| `list_tasks` | List all tasks |
| `task_complete` | Mark task complete with verification |
| `task_blocked` | Mark task blocked |
| `task_failed` | Mark task failed |
| `save_progress` | Save progress checkpoint |

#### Ralph Mode (Autonomous)

```typescript
async runAllPending(options: RalphModeOptions) {
  // 1. Build queue with dependency resolution (topological sort)
  const taskQueue = this.buildTaskQueue();

  // 2. For each task
  for (const task of taskQueue) {
    // Check dependencies are done
    if (this.hasUnmetDependencies(task)) continue;

    // Check max attempts
    if (this.getAttemptCount(task) > maxAttempts) {
      this.markBlocked(task);
      continue;
    }

    // Execute with context (includes Epic/Sprint)
    const result = await this.runTaskWithProvider(task, runId, attempt);

    if (result.success) {
      this.moveToReview(task);
    } else {
      this.addFailureComment(task, result.error);
      // Will retry on next Ralph run
    }
  }
}
```

#### Failure Feedback Loop

When a task fails:
1. **Failure comment added** with:
   - Run ID
   - Error message
   - What was attempted
   - Suggested next steps

2. **On retry**, prompt includes:
   - All previous failure comments
   - User instruction comments
   - "Learn from these failures" directive

3. **After max attempts**:
   - Task marked as `blocked`
   - Requires human intervention

### Docking System

The docking system provides a VSCode-like panel layout:

```
┌────────────────────────────────────────────────┐
│                    TopBar                       │
├─────────────────────────┬──────────────────────┤
│                         │                       │
│       Board (60%)       │      Chat (40%)       │
│                         │                       │
├─────────────────────────┴──────────────────────┤
│   Task Runner | Settings | Theme Editor (25%)   │
└────────────────────────────────────────────────┘
```

Features:
- Drag tabs between panels
- Drop on edges to split panels
- Resize panels with drag handles
- Layout persists to localStorage
- Window menu to open/focus panels

### IPC Communication

#### Preload Bridge

```typescript
// Secure API exposed to renderer
window.dexteria = {
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    create: (title, status) => ipcRenderer.invoke('tasks:create', title, status),
    update: (id, patch) => ipcRenderer.invoke('tasks:update', id, patch),
    move: (id, column) => ipcRenderer.invoke('tasks:move', id, column),
  },
  agent: {
    runTask: (id, options) => ipcRenderer.invoke('agent:runTask', id, options),
    cancel: () => ipcRenderer.invoke('agent:cancel'),
    onStreamUpdate: (callback) => { /* ... */ },
  },
  ralph: {
    start: (options) => ipcRenderer.invoke('ralph:start', options),
    stop: () => ipcRenderer.invoke('ralph:stop'),
    getProgress: () => ipcRenderer.invoke('ralph:getProgress'),
  },
  theme: {
    getAll: () => ipcRenderer.invoke('theme:getAll'),
    getActive: () => ipcRenderer.invoke('theme:getActive'),
    setActive: (id) => ipcRenderer.invoke('theme:setActive', id),
    create: (theme) => ipcRenderer.invoke('theme:create', theme),
    update: (id, theme) => ipcRenderer.invoke('theme:update', id, theme),
    delete: (id) => ipcRenderer.invoke('theme:delete', id),
    import: (json) => ipcRenderer.invoke('theme:import', json),
    export: (id) => ipcRenderer.invoke('theme:export', id),
  },
  plugin: {
    getAll: () => ipcRenderer.invoke('plugin:getAll'),
    enable: (id) => ipcRenderer.invoke('plugin:enable', id),
    disable: (id) => ipcRenderer.invoke('plugin:disable', id),
    callApi: (id, method, ...args) => ipcRenderer.invoke('plugin:callApi', id, method, ...args),
  },
  // ... more APIs
};
```

### Security

#### Policy Enforcement

```typescript
// policy.json
{
  "limits": {
    "maxStepsPerRun": 50,
    "maxFilesModified": 20,
    "maxRuntimeMinutes": 30
  },
  "allowed_paths": ["src/**", "tests/**"],
  "protected_paths": [".env", "*.pem", "credentials.*"],
  "allowed_commands": ["npm", "git", "node"]
}
```

#### Safety Mechanisms

1. **Path Traversal Prevention**
   - All paths validated against project root
   - No access outside project directory

2. **Command Whitelisting**
   - Only allowed commands can execute
   - Arguments validated

3. **Git Branch per Run**
   - Each Ralph run creates `ralph/<runId>` branch
   - Easy rollback if needed

4. **Runtime Limits**
   - Max steps per task
   - Max files modified
   - Max runtime minutes

### Frontend Components

#### Key Components

| Component | Purpose |
|-----------|---------|
| `KanbanBoard` | Drag-drop task board |
| `TaskCard` | Task display with Epic label |
| `TaskDetail` | Full task editor with Epic/Sprint |
| `TaskComments` | Comments & activity feed |
| `ChatPanel` | AI chat interface |
| `TaskRunner` | Execution output panel |
| `TopBar` | Mode selector, Window menu |
| `ThemeEditor` | Theme customization |
| `SettingsPanel` | Project settings |
| `DockingLayout` | VSCode-style panel system |

#### State Management

```typescript
// ModeContext - Global mode state
const { mode, setMode, triggerPlannerBlock } = useMode();

// ThemeContext - Theme state
const { activeTheme, setActiveTheme } = useTheme();

// DockingContext - Panel layout state
const { state, openTab, closeTab, focusTab, splitPanel } = useDocking();

// useBoard - Kanban data with polling
const { board, tasks, moveTask, createTask, refresh } = useBoard();

// useRunner - Agent execution state
const { isRunning, streamingContent, currentTask, handleStop } = useRunner();
```

### Streaming Updates

#### Agent Output Streaming

```typescript
// Main process sends chunks
win.webContents.send('agent:stream-update', {
  taskId: task.id,
  taskTitle: task.title,
  content: accumulated,
  done: false,
  cancelled: false,
});

// Renderer listens
window.dexteria.agent.onStreamUpdate((data) => {
  setStreamingContent(data.content);
  if (data.done) {
    // Handle completion
  }
});
```

#### Tool Action Display

```
📖 Reading: `src/components/App.tsx` ✓
📝 Editing: `src/utils/helpers.ts` ✓
💻 Running: `npm test` ✓
🔍 Searching: `function handleSubmit` ✓
📋 Updating task list... ✓
```

---

## Development

### Setup

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Package application
npm run package
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start Vite + Electron in dev mode |
| `build` | Build for production |
| `build:vite` | Build renderer only |
| `build:electron` | Build main process only |
| `package` | Create distributable |
| `typecheck` | TypeScript validation |
| `lint` | ESLint validation |

### Environment

- **Claude Code CLI** required for AI features
- Falls back to Mock provider if not available
- Optional: `ANTHROPIC_API_KEY` for direct API access

---

## Best Practices Implemented

### From Ralph Mode Guidelines

1. **Verification Gates** - Tasks move to review only after execution
2. **Git Branch per Run** - Rollback capability via `ralph/<runId>` branches
3. **Failure Feedback Loop** - Detailed failure comments with context
4. **Retry with Context** - Previous failures included in retry prompts
5. **Dependency Resolution** - Topological sort for task ordering
6. **Limits** - maxAttempts, maxRuntime per task
7. **Observability** - Full logging to `.local-kanban/agent-runs/`

### Code Organization

- **Separation of concerns** - Main/Renderer/Shared
- **Type safety** - Full TypeScript with Zod validation
- **Security** - Context isolation, policy enforcement
- **Modularity** - Domain-specific handlers and services
- **Extensibility** - Plugin system with 14 hooks

---

## Plugin System

Dexteria supports plugins for extending functionality with 14 hooks and 8 UI extension points.

### Plugin Types

| Type | Location | Description |
|------|----------|-------------|
| Bundled | `src/main/plugins/bundled/` | First-party plugins shipped with Dexteria |
| User | `.local-kanban/plugins/` | Third-party plugins installed by users |

### Available Hooks (14 Total)

| Hook | Description |
|------|-------------|
| `chat:beforeSend` | Before message sent to AI |
| `chat:afterResponse` | After AI response received |
| `task:beforeCreate` | Before task creation |
| `task:afterCreate` | After task created |
| `task:beforeUpdate` | Before task update |
| `task:afterUpdate` | After task updated |
| `task:beforeMove` | Before column change |
| `task:afterMove` | After task moved |
| `task:beforeDelete` | Before task deletion |
| `board:refresh` | Board state changed |
| `agent:beforeRun` | Before agent executes |
| `agent:afterRun` | After agent completes |
| `agent:onToolCall` | During tool execution |
| `agent:onStep` | Each agent step |

### UI Extension Points (8 Slots)

| Slot ID | Location | Use Case |
|---------|----------|----------|
| `settings:tab` | SettingsPanel | Plugin configuration tabs |
| `docking:panel` | Docking system | Full panels as tabs |
| `topbar:left` | TopBar (left) | Action buttons |
| `topbar:right` | TopBar (right) | Status indicators |
| `task-detail:sidebar` | TaskDetail | Additional task info |
| `task-detail:footer` | TaskDetail | Task-related actions |
| `task-card:badge` | TaskCard | Status badges |
| `bottom-panel:tab` | BottomPanel | Tabs next to Runner |

### Plugin Structure

**Bundled plugins (first-party):**
```
src/main/plugins/bundled/com.dexteria.jira/
├── manifest.json    # Plugin manifest
├── main.js          # Main process entry
└── lib/             # Plugin libraries
```

**User plugins (third-party):**
```
.local-kanban/plugins/com.example.plugin/
├── manifest.json    # Plugin manifest
├── main.js          # Main process entry
├── renderer/        # UI components
└── storage.json     # Plugin data (auto-generated)
```

See `docs/PLUGIN_DEVELOPMENT_GUIDE.md` for full documentation.

---

## Future Improvements

1. **Acceptance Criteria Verification** - Automated testing of criteria
2. **Policy Editor UI** - Visual policy configuration
3. **Run History Browser** - View past executions
4. **Multi-provider Support** - OpenAI, local LLMs
5. **Collaborative Features** - Team task assignment
6. **Webhooks/Integrations** - GitHub, Jira (via plugin)

---

## License

MIT License - See LICENSE file for details.
