# Dexteria Agent Runtime

This document describes the agent runtime architecture in Dexteria, including Ralph Mode (autonomous task execution).

## Overview

The Dexteria agent runtime consists of several components:

1. **LocalKanbanStore** - JSON-based persistence for all project data
2. **PolicyGuard** - Security enforcement based on policy.json
3. **RepoTools** - File system operations (read, write, search, patch)
4. **Runner** - Command execution with logging
5. **AgentRunRecorder** - Records agent execution runs
6. **AgentRuntime** - Single task execution engine
7. **RalphEngine** - Autonomous task processing (Ralph Mode)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Renderer (React UI)                     │
├─────────────────────────────────────────────────────────────┤
│                    IPC Bridge (preload.ts)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   AgentRuntime  │  │   RalphEngine   │  │   Runner    │  │
│  │  (single task)  │  │  (autonomous)   │  │ (commands)  │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
│           │                    │                   │         │
│  ┌────────▼────────────────────▼───────────────────▼──────┐ │
│  │                     RepoTools                           │ │
│  │           (listFiles, readFile, search, writeFile)      │ │
│  └────────────────────────────┬────────────────────────────┘ │
│                               │                              │
│  ┌────────────────────────────▼────────────────────────────┐ │
│  │                     PolicyGuard                          │ │
│  │         (validatePath, validateCommand, enforceLimits)   │ │
│  └────────────────────────────┬────────────────────────────┘ │
│                               │                              │
│  ┌────────────────────────────▼────────────────────────────┐ │
│  │                   LocalKanbanStore                       │ │
│  │    (getBoard, getTasks, updateTask, moveTask, ...)       │ │
│  └────────────────────────────┬────────────────────────────┘ │
│                               │                              │
└───────────────────────────────┼──────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   .local-kanban/      │
                    │   ├── board.json      │
                    │   ├── tasks.json      │
                    │   ├── state.json      │
                    │   ├── policy.json     │
                    │   ├── settings.json   │
                    │   ├── activity.jsonl  │
                    │   ├── context/        │
                    │   ├── chats/          │
                    │   ├── themes/         │
                    │   ├── plugins/        │
                    │   ├── runs/           │
                    │   └── agent-runs/     │
                    └───────────────────────┘
```

## Key Invariants

1. **Local-first**: Source of truth is JSON files under `.local-kanban/`
2. **Acceptance Criteria Required**: Every task MUST have non-empty `acceptanceCriteria`
3. **Done Verification**: A task can NEVER be moved to Done unless acceptance criteria are verified with evidence
4. **Append-only Comments**: Comments are append-only (never deleted or modified)
5. **Failure Comments**: If a run fails, the agent MUST append a failure comment with `runId`, `logPath`, and summary
6. **Human Override**: Instruction comments OVERRIDE the agent plan
7. **Context Inclusion**: Agent MUST always include project context when executing a task
8. **Tools-only Execution**: Agent can only interact via the tool layer
9. **Policy Enforcement**: `policy.json` is a HARD LIMIT - always enforced

## Ralph Mode (Dexter Mode)

Ralph Mode is the autonomous task execution mode: **"Attempt to autonomously finish all pending tasks."**

Named after "Ralph" - the reliable worker who just gets things done.

### How Ralph Mode Works

1. **Determine Pending Tasks**: Gets all tasks not in 'done' column with `runtime.status !== 'done' && runtime.status !== 'blocked'`

2. **Order Tasks** by:
   - Dependencies (tasks with unmet deps run after their deps)
   - Column preference: `doing > todo > review > backlog`
   - Priority: `critical > high > medium > low`
   - Order field (stable sorting within column)

3. **For Each Task**:
   - Set `state.activeTaskId`
   - Set `state.ralphMode.currentTaskId`
   - Run `AgentRuntime.runTask(taskId, mode="dexter")`
   - On success: mark task done, move to done column, continue
   - On failure/blocked: mark appropriately, continue to next (unless `stopOnBlocking`)

4. **Continues Until**:
   - All tasks completed
   - Manually stopped via `stopRalphMode()`
   - `maxTasks` limit reached
   - Critical blocking (if `stopOnBlocking` enabled)

### Example Scenario

**Initial Backlog:**
```
TSK-0001: "Setup project"
  - Dependencies: none
  - Acceptance: package.json exists

TSK-0002: "Add tests"
  - Dependencies: [TSK-0001]
  - Acceptance: tests pass

TSK-0003: "Add linting"
  - Dependencies: [TSK-0001]
  - Acceptance: lint passes
```

**Ralph Mode Execution:**

```
Step 1: Order tasks by dependencies
  → TSK-0001 first (no deps)
  → TSK-0002, TSK-0003 after (both depend on 0001)

Step 2: Run TSK-0001
  → Agent reads project, verifies package.json exists
  → Success → moves to 'done' column

Step 3: Run TSK-0002
  → Agent runs tests
  → Tests fail → marked 'failed'
  → Failure comment added with runId and log path
  → Ralph continues to next task

Step 4: Run TSK-0003
  → Agent runs linter
  → Success → moves to 'done' column

Final State:
  - TSK-0001: done
  - TSK-0002: failed (needs human review)
  - TSK-0003: done
```

**If TSK-0002 Needed Human Decision (Blocked):**

```
Step 3: Run TSK-0002
  → Agent tries to run tests
  → Missing test config - needs human decision
  → Agent calls task_blocked with question
  → Task marked 'blocked', comment added:
    "Task Blocked
     Reason: Missing test configuration
     Question: Should tests use Jest or Vitest?"
  → Ralph continues to TSK-0003
```

### Ralph Mode API

```typescript
// Start Ralph Mode
const result = await ralph.startRalphMode({
  stopOnBlocking: false,  // Continue on blocked tasks
  maxTasks: Infinity,     // Process all tasks
  strategy: 'dependency', // Order by dependencies
});

// Stop Ralph Mode
ralph.stopRalphMode();

// Pause/Resume
ralph.pause();
ralph.resume();

// Get Progress
const progress = ralph.getProgress();
// { total, completed, failed, blocked, currentTaskId, status }

// Event Listeners
ralph.on((event) => {
  // event.type: 'start' | 'task_start' | 'task_complete' | 'task_failed' | 'task_blocked' | 'stop' | 'complete'
  // event.taskId: string (if applicable)
  // event.data: additional data
});
```

## Tool Layer

The agent interacts with the codebase through these tools:

### File Tools

| Tool | Description |
|------|-------------|
| `list_files` | List files matching a glob pattern |
| `read_file` | Read file contents |
| `search` | Search for patterns in files |
| `write_file` | Write content to a file (creates backup) |
| `apply_patch` | Apply a unified diff patch |

### Command Tools

| Tool | Description |
|------|-------------|
| `run_command` | Run a shell command with timeout |

### Task Management Tools

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task with optional Epic/Sprint |
| `update_task` | Update task fields including Epic/Sprint |
| `list_tasks` | List all tasks with their metadata |
| `save_progress` | Save progress checkpoint |

### Task Control Tools

| Tool | Description |
|------|-------------|
| `task_complete` | Mark task complete with acceptance verification |
| `task_blocked` | Mark task blocked, request human input |
| `task_failed` | Mark task failed with reason |

### Epic and Sprint Support

Tasks can include Epic and Sprint metadata for Jira alignment:

```typescript
// Creating a task with Epic/Sprint
create_task({
  title: "Implement user authentication",
  description: "Add login/logout functionality",
  epic: {
    name: "Authentication",
    color: "#3b82f6"  // Blue
  },
  sprint: "Sprint 3"
});

// Updating Epic/Sprint
update_task({
  taskId: "task-001",
  epic: { name: "Security", color: "#ef4444" },
  sprint: "Sprint 4"
});
```

The agent's prompt includes Epic and Sprint context when executing tasks, ensuring consistency with project organization.

## Policy Enforcement

`policy.json` defines security constraints:

```json
{
  "version": "1.0.0",
  "allowedPaths": ["src/**", "package.json", "README.md"],
  "blockedPaths": [".env", "node_modules/**", ".git/**"],
  "blockedPatterns": ["*.pem", "*.key", "*secret*", "*password*"],
  "limits": {
    "maxFilesPerRun": 50,
    "maxDiffLinesPerRun": 5000,
    "maxRuntimeMinutes": 30,
    "maxStepsPerRun": 100
  },
  "shellCommands": {
    "allowed": ["npm", "npx", "node", "git", "tsc"],
    "blocked": ["rm -rf /", "sudo", "curl | bash"]
  }
}
```

**PolicyGuard enforces:**
- Path validation (no escaping project root)
- Protected file patterns (secrets, keys, credentials)
- Command allowlist/blocklist
- Runtime limits (files, lines, time, steps)

## Agent Provider Interface

The runtime uses a provider interface for AI completion:

```typescript
abstract class AgentProvider {
  abstract complete(
    messages: AgentMessage[],
    tools?: AgentToolDefinition[]
  ): Promise<AgentResponse>;

  abstract isReady(): boolean;
  abstract getName(): string;
}
```

**Available Providers:**
- `MockAgentProvider` - For testing without network calls
- (Future) `ClaudeProvider` - Claude API integration
- (Future) `OpenAIProvider` - OpenAI API integration

## IPC API

The renderer communicates with the runtime via IPC:

```typescript
window.dexteria.agent.runTask(taskId, options)
window.dexteria.ralph.start(options)
window.dexteria.ralph.stop()
window.dexteria.ralph.getProgress()
window.dexteria.tasks.getAll()
window.dexteria.tasks.update(taskId, patch)
window.dexteria.tasks.move(taskId, toColumnId)
window.dexteria.tasks.addComment(taskId, comment)
// ... and more
```

## Testing

Run a task from the command line:

```bash
# Run a specific task
npx ts-node scripts/dev-run-task.ts task-001

# Run first pending task
npx ts-node scripts/dev-run-task.ts

# Run in Ralph Mode
npx ts-node scripts/dev-run-task.ts --ralph
```

## Activity Logging

All significant events are logged to `.local-kanban/activity.jsonl`:

```jsonl
{"timestamp":"...","type":"agent_started","taskId":"task-001","runId":"run-...","data":{}}
{"timestamp":"...","type":"file_modified","taskId":"task-001","data":{"path":"src/foo.ts"}}
{"timestamp":"...","type":"command_executed","taskId":"task-001","data":{"cmd":"npm test"}}
{"timestamp":"...","type":"agent_completed","taskId":"task-001","runId":"run-...","data":{}}
```

## Run Artifacts

Each task execution creates artifacts:

```
.local-kanban/
├── agent-runs/
│   └── task-001/
│       ├── run-1234567890.json  # Run metadata
│       └── run-1234567891.json
└── runs/
    └── task-001/
        ├── run-cmd-1.log   # Command output logs
        ├── run-cmd-1.json  # Command metadata
        └── run-cmd-2.log
```
