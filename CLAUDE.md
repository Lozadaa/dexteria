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

2. **Safety First**
   - Git branch per execution (rollback capability)
   - Policy-based access control
   - Max attempts limit per task
   - Detailed failure logging

3. **Local-First**
   - All data in `.local-kanban/` folder
   - Human-readable JSON files
   - Works offline
   - Full privacy

4. **Observability**
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
│   │   ├── AgentProvider.ts# LLM abstraction
│   │   ├── providers/      # Claude, Mock providers
│   │   └── tools/          # File ops, commands, search
│   ├── ipc/handlers/       # IPC handlers by domain
│   └── services/           # Business logic
│       ├── LocalKanbanStore.ts  # Data persistence
│       ├── PolicyGuard.ts       # Security enforcement
│       └── CommentService.ts    # Task comments
├── renderer/               # React frontend
│   ├── App.tsx            # Root component
│   ├── components/        # UI components
│   │   ├── KanbanBoard.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskDetail.tsx
│   │   ├── ChatPanel.tsx
│   │   └── TopBar.tsx
│   ├── contexts/          # React context
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities
└── shared/                # Shared code
    ├── types.ts           # TypeScript interfaces
    └── schemas.ts         # Zod validators
```

### Data Model

#### .local-kanban/ Structure

```
.local-kanban/
├── board.json              # Kanban columns and order
├── tasks.json              # All tasks with metadata
├── state.json              # Current agent mode/state
├── policy.json             # Security rules
├── activity.jsonl          # Activity log (append-only)
├── context/
│   ├── project_context.json
│   └── repo_index.json
├── chats/
│   ├── index.json
│   └── chat-*.json
├── agent-runs/             # Execution artifacts
│   └── <taskId>/
│       └── <runId>.json
└── backups/                # Automatic backups
```

#### Key Types

```typescript
// Task with all metadata
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'doing' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  acceptanceCriteria: string[];
  dependencies: string[];
  comments: TaskComment[];
  runtime: TaskRuntimeState;
  agentConfig: TaskAgentConfig;
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
2. Load Task + Acceptance Criteria
       │
       ▼
3. Build Prompt (with failure context if retry)
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

    // Execute with context
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
| `TaskCard` | Individual task display with context menu |
| `TaskDetail` | Full task editor panel |
| `TaskComments` | Comments & activity feed |
| `ChatPanel` | AI chat interface |
| `TaskRunner` | Execution output panel |
| `TopBar` | Mode selector, Ralph toggle |

#### State Management

```typescript
// ModeContext - Global mode state
const { mode, setMode, triggerPlannerBlock } = useMode();

// useBoard - Kanban data with polling
const { board, tasks, moveTask, createTask, refresh } = useBoard();

// useRunner - Agent execution state
const {
  isRunning,
  streamingContent,
  currentTask,
  handleStop
} = useRunner();
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

---

## Future Improvements

1. **Acceptance Criteria Verification** - Automated testing of criteria
2. **Policy Editor UI** - Visual policy configuration
3. **Run History Browser** - View past executions
4. **Multi-provider Support** - OpenAI, local LLMs
5. **Collaborative Features** - Team task assignment
6. **Webhooks/Integrations** - GitHub, Jira, etc.

---

## License

MIT License - See LICENSE file for details.
