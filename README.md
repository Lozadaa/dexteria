# Dexteria

**AI Project Executor** — A local-first desktop application for AI-driven project planning and execution.

## What is Dexteria?

Dexteria is an Electron-based desktop application that combines a Kanban board with an AI agent named **Dexter**. Dexter helps you plan, manage, and execute project tasks autonomously while keeping all your data local and private.

### Key Features

- **Local-First Kanban Board**: Manage tasks with drag-and-drop across Backlog, To Do, In Progress, Review, and Done columns
- **AI Agent (Dexter)**: An intelligent assistant that can understand your project context, write code, and execute tasks
- **Project Brain (`.local-kanban/`)**: All project data stored locally in JSON files — no external database required
- **Chat Interface**: Interact with Dexter through natural language conversations
- **Ralph Mode**: Full autonomous execution where Dexter works through your task queue without intervention
- **Policy-Based Safety**: Configurable restrictions on what files and operations the agent can access

## What is Dexter?

Dexter is your AI project executor. Unlike traditional assistants, Dexter:

1. **Understands Project Context**: Reads and maintains a "project brain" with knowledge about your codebase
2. **Executes Tasks Autonomously**: Can write code, modify files, run commands, and complete work items
3. **Works from Acceptance Criteria**: Each task has clear criteria that Dexter uses to know when work is complete
4. **Learns from Failures**: When something goes wrong, Dexter can discuss the issue and retry with new context

## What is `.local-kanban/`?

The `.local-kanban/` directory is your project's brain — a structured collection of JSON files that store:

```
.local-kanban/
├── board.json              # Kanban board state (columns, task positions)
├── tasks.json              # All task definitions with acceptance criteria
├── state.json              # Current agent state (active task, mode, queue)
├── policy.json             # Safety rules for agent operations
├── activity.jsonl          # Activity log (append-only)
├── context/
│   ├── project_context.json    # Project description, architecture, goals
│   └── repo_index.json         # Index of important files and paths
├── chats/
│   ├── index.json          # Chat index
│   └── chat-*.json         # Individual chat histories
├── runs/                   # Task execution run logs
├── agent-runs/             # Agent execution sessions
└── backups/                # Automatic backups
```

This structure allows Dexteria to be:
- **Offline-capable**: No internet required for project management
- **Version-controllable**: Commit your project brain alongside your code
- **Portable**: Move projects between machines by copying the directory
- **Transparent**: All data is human-readable JSON

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Dexteria

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode (Vite + Electron) |
| `npm run build` | Build for production |
| `npm run package` | Package as distributable app |
| `npm run package:win` | Package for Windows |
| `npm run package:mac` | Package for macOS |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

## Project Structure

```
Dexteria/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App entry point, window creation
│   │   └── preload.ts  # IPC bridge (context isolation)
│   ├── renderer/       # React application
│   │   ├── main.tsx    # React entry point
│   │   ├── App.tsx     # Root component
│   │   └── styles.css  # Global styles
│   └── shared/         # Shared code
│       ├── types.ts    # TypeScript type definitions
│       └── schemas.ts  # Validators and factories
├── .local-kanban/      # Project brain (see above)
├── assets/             # App icons and images
├── public/             # Static files
├── package.json        # Dependencies and scripts
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript config (renderer)
└── tsconfig.main.json  # TypeScript config (main)
```

## Architecture

Dexteria uses a standard Electron architecture with enhanced security:

- **Main Process** (`src/main/`): Node.js environment handling file system, IPC, and agent runtime
- **Renderer Process** (`src/renderer/`): React app running in a sandboxed Chromium environment
- **Preload Script** (`src/main/preload.ts`): Secure bridge exposing limited APIs to the renderer
- **Context Isolation**: Enabled by default — renderer cannot access Node.js APIs directly

## Development

### Adding New IPC Handlers

1. Add the handler in `src/main/main.ts`:
   ```typescript
   ipcMain.handle('namespace:method', async (event, arg) => {
     // Implementation
   });
   ```

2. Expose it in `src/main/preload.ts`:
   ```typescript
   contextBridge.exposeInMainWorld('dexteria', {
     namespace: {
       method: (arg) => ipcRenderer.invoke('namespace:method', arg),
     },
   });
   ```

3. Update types in `src/main/preload.ts` for TypeScript support.

### Adding React Components

Create components in `src/renderer/components/` and import them in `App.tsx`.

## Contributing

Dexteria is in active development. See the tasks in `.local-kanban/tasks.json` for planned work.

## License

MIT
