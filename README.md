# Dexteria

**AI Project Executor** — A local-first desktop application for AI-driven project planning and execution.

![Dexteria Screenshot](assets/splash.png)

## What is Dexteria?

Dexteria is an Electron-based desktop application that combines a Kanban board with an AI agent named **Dexter**. Dexter helps you plan, manage, and execute project tasks autonomously while keeping all your data local and private.

### Key Features

- **Local-First Kanban Board**: Manage tasks with drag-and-drop across Backlog, To Do, In Progress, Review, and Done columns
- **AI Agent (Dexter)**: An intelligent assistant that can understand your project context, write code, and execute tasks
- **VSCode-Style Docking**: Flexible panel layout with draggable tabs and resizable splits
- **Epic & Sprint Support**: Organize tasks with colored Epic labels and Sprint identifiers for Jira alignment
- **Theme System**: Customizable color themes with live preview and import/export
- **Plugin System**: Extend functionality with hooks-based plugins (e.g., Jira integration)
- **Ralph Mode**: Full autonomous execution where Dexter works through your task queue without intervention
- **Policy-Based Safety**: Configurable restrictions on what files and operations the agent can access
- **Project Brain (`.local-kanban/`)**: All project data stored locally in JSON files — no external database required

## What is Dexter?

Dexter is your AI project executor. Unlike traditional assistants, Dexter:

1. **Understands Project Context**: Reads and maintains a "project brain" with knowledge about your codebase
2. **Executes Tasks Autonomously**: Can write code, modify files, run commands, and complete work items
3. **Works from Acceptance Criteria**: Each task has clear criteria that Dexter uses to know when work is complete
4. **Learns from Failures**: When something goes wrong, Dexter can discuss the issue and retry with new context
5. **Respects Epic/Sprint**: Creates and updates tasks with proper Epic and Sprint categorization

## What is `.local-kanban/`?

The `.local-kanban/` directory is your project's brain — a structured collection of JSON files that store:

```
.local-kanban/
├── board.json              # Kanban board state (columns, task positions)
├── tasks.json              # All task definitions with Epic/Sprint metadata
├── state.json              # Current agent state (active task, mode, queue)
├── policy.json             # Safety rules for agent operations
├── settings.json           # Project settings
├── activity.jsonl          # Activity log (append-only)
├── context/
│   ├── project_context.json    # Project description, architecture, goals
│   └── repo_index.json         # Index of important files and paths
├── chats/
│   ├── index.json          # Chat index
│   └── chat-*.json         # Individual chat histories
├── themes/                 # Custom themes
│   ├── index.json          # Theme registry
│   └── *.json              # Individual theme files
├── plugins/                # Installed plugins
│   ├── index.json          # Plugin registry
│   └── com.example.plugin/ # Plugin directories
├── agent-runs/             # Agent execution sessions
│   └── <taskId>/
│       └── <runId>.json    # Run artifacts
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
- Claude Code CLI (optional, for AI features)

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
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # App entry point, window creation
│   │   ├── preload.ts           # IPC bridge (context isolation)
│   │   ├── agent/               # AI agent system
│   │   │   ├── AgentRuntime.ts  # Task execution engine
│   │   │   ├── RalphEngine.ts   # Autonomous batch executor
│   │   │   ├── AgentProvider.ts # LLM abstraction
│   │   │   └── tools/           # Agent tools (file, command, search)
│   │   ├── ipc/handlers/        # IPC handlers by domain
│   │   └── services/            # Business logic
│   │       ├── LocalKanbanStore.ts
│   │       ├── ThemeService.ts
│   │       └── PluginManager.ts
│   ├── renderer/                # React application
│   │   ├── App.tsx              # Root component
│   │   ├── components/          # UI components
│   │   │   ├── KanbanBoard.tsx  # Drag-drop board
│   │   │   ├── TaskCard.tsx     # Task with Epic label
│   │   │   ├── TaskDetail.tsx   # Task editor with Epic/Sprint
│   │   │   ├── ChatPanel.tsx    # AI chat interface
│   │   │   ├── TopBar.tsx       # Window menu, mode selector
│   │   │   ├── ThemeEditor.tsx  # Theme customization
│   │   │   └── SettingsPanel.tsx
│   │   ├── docking/             # VSCode-style docking system
│   │   │   ├── DockingContext.tsx
│   │   │   ├── DockingLayout.tsx
│   │   │   ├── ComponentRegistry.tsx
│   │   │   └── treeOperations.ts
│   │   ├── contexts/            # React context providers
│   │   └── hooks/               # Custom hooks
│   └── shared/                  # Shared code
│       ├── types.ts             # TypeScript interfaces
│       └── schemas.ts           # Zod validators
├── .local-kanban/               # Project brain (see above)
├── docs/                        # Documentation
│   ├── agent-runtime.md
│   └── PLUGIN_DEVELOPMENT_GUIDE.md
├── assets/                      # App icons and images
└── package.json
```

## Architecture

Dexteria uses a standard Electron architecture with enhanced security:

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

### Security Features

- **Context Isolation**: Enabled by default — renderer cannot access Node.js APIs directly
- **Preload Script**: Secure bridge exposing limited APIs to the renderer
- **Policy-Based Access**: Configurable restrictions on files and commands
- **Git Branch per Run**: Each Ralph run creates a dedicated branch for easy rollback

## Features in Detail

### VSCode-Style Docking

The UI features a flexible panel system inspired by VSCode:

- **Drag tabs** between panels to reorganize your workspace
- **Drop on edges** to split panels horizontally or vertically
- **Resize panels** with drag handles
- **Layout persistence** - your layout is saved automatically
- **Window menu** - quickly open or focus any panel

### Epic & Sprint Support

Tasks can be organized with:

- **Epic**: A colored label (e.g., "Authentication" in blue) that appears on task cards
- **Sprint**: A sprint identifier (e.g., "Sprint 3") for delivery planning

These fields are fully integrated with the AI agent - Dexter understands and can create/update tasks with Epic and Sprint metadata.

### Theme System

Customize the look and feel:

- Create custom themes with the visual Theme Editor
- Adjust colors for all UI elements
- Import/export themes as JSON
- Per-project themes stored in `.local-kanban/themes/`

### Plugin System

Extend Dexteria with plugins:

- **14 hooks** for intercepting events (task create, chat send, agent run, etc.)
- **UI extensions** for adding tabs and context menu items
- **Storage API** for persisting plugin data
- See `docs/PLUGIN_DEVELOPMENT_GUIDE.md` for details

## Development

### Adding New IPC Handlers

1. Add the handler in `src/main/ipc/handlers/`:
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

### Adding Docking Components

1. Create your component in `src/renderer/components/`
2. Add a wrapper in `src/renderer/docking/DockingComponents.tsx`
3. Register it in the `dockingComponents` array with a unique key
4. Add it to `COMPONENT_KEYS` in `defaultLayout.ts`

## Contributing

Dexteria is in active development. See the tasks in `.local-kanban/tasks.json` for planned work.

## License

MIT
