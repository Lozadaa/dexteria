# Changelog

All notable changes to Dexteria will be documented in this file.

---

## [0.1.0] - 2026-01-21

### Core Features

#### Kanban Board
- Drag-and-drop task management with 5 columns: Backlog, To Do, In Progress, Review, Done
- Task cards with priority indicators (low, medium, high, critical)
- Task dependencies system
- Epic support with custom colors
- Sprint field for Jira alignment
- Acceptance criteria per task
- Task comments system (notes, instructions, failures, agent, system)
- Relative time formatting for timestamps
- Done cards show completion timestamp

#### AI Agent System
- **Planner Mode**: Safe mode for reading code, analyzing, creating tasks, and chatting
- **Agent Mode**: Full execution mode with file writing and command execution
- **Ralph Mode (Autopilot)**: Autonomous batch execution that:
  - Processes tasks from backlog respecting dependencies
  - Learns from failures and retries with context
  - Moves successful tasks to review
  - Creates git branch per execution for rollback
- Streaming responses with real-time tool action display
- Multiple AI providers:
  - Claude Code CLI integration
  - OpenCode integration
  - Mock provider for testing

#### Agent Tools
- `list_files` - List files matching glob patterns
- `read_file` - Read file contents
- `search` - Search for patterns in files
- `write_file` - Write content to files
- `apply_patch` - Apply unified diff patches
- `run_command` - Execute shell commands
- `create_task` - Create new tasks with Epic/Sprint
- `update_task` - Update existing tasks
- `list_tasks` - List all tasks
- `task_complete` - Mark task as complete
- `task_blocked` - Mark task as blocked
- `task_failed` - Mark task as failed
- `save_progress` - Save progress checkpoint

#### VSCode-Style Docking System
- Flexible panel layout with drag-and-drop tabs
- Split panels horizontally/vertically
- Resize panels with drag handles
- Layout persistence in localStorage
- Window menu for panel management
- Available panels: Board, Chat, Task Runner, Settings, Theme Editor, Plugins, Jira

#### Theme System
- Customizable color themes with 20+ color variables
- Theme editor with live preview
- Import/export themes as JSON
- Per-project theme settings
- Default dark theme included

#### Plugin System
- 14 hooks for extensibility:
  - `chat:beforeSend`, `chat:afterResponse`
  - `task:beforeCreate`, `task:afterCreate`
  - `task:beforeUpdate`, `task:afterUpdate`
  - `task:beforeMove`, `task:afterMove`
  - `task:beforeDelete`
  - `board:refresh`
  - `agent:beforeRun`, `agent:afterRun`
  - `agent:onToolCall`, `agent:onStep`
- 8 UI extension slots:
  - `settings:tab`, `docking:panel`
  - `topbar:left`, `topbar:right`
  - `task-detail:sidebar`, `task-detail:footer`
  - `task-card:badge`, `bottom-panel:tab`
- Storage API for plugin data
- Bundled Jira integration plugin
- Plugins stored in AppData for persistence

#### Chat Interface
- AI chat with streaming responses
- Tool action visualization during execution
- Chat history persistence
- Multiple chat sessions support

#### Welcome Screen
- Project open/create actions
- Recent projects list with quick access
- Keyboard shortcut support (Ctrl+O)
- Build version display with timestamp

#### Settings
- Project configuration
- AI provider selection (Claude Code, OpenCode)
- VSCode integration setup
- Policy configuration for security limits

#### Security & Safety
- Policy-based access control:
  - Max steps per run
  - Max files modified
  - Max runtime minutes
  - Allowed/protected paths
  - Allowed commands whitelist
- Path traversal prevention
- Git branch per Ralph run for rollback
- Detailed failure logging

#### Local-First Architecture
- All data stored in `.local-kanban/` folder
- Human-readable JSON files
- Works completely offline
- Full privacy - no cloud sync

#### Observability
- Activity logging (`.local-kanban/activity.jsonl`)
- Run artifacts saved per task
- Failure context preserved
- Agent run history

---

### Technical Stack
- **Desktop**: Electron 28
- **Frontend**: React 18 + TypeScript
- **Build**: Vite 5
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API / Claude Code CLI / OpenCode
- **Drag & Drop**: dnd-kit
- **Panels**: react-resizable-panels
- **Validation**: Zod
- **State**: Zustand

---

### Build & Release

#### 2026-01-21
- Fixed Windows taskbar icon display
  - Added `app.setAppUserModelId()` for proper taskbar grouping
  - BrowserWindow uses `.ico` on Windows
  - Regenerated multi-size ICO (16, 32, 48, 256)
- Added build version with timestamp (`0.1.0-DDHHMM`)
- Cleaned up obsolete release artifacts

#### 2026-01-20
- OpenCode integration and setup wizard improvements
- VSCode integration
- Tab system updates

#### 2026-01-19
- Plugins moved to AppData for persistence
- Plugin UI improvements

#### 2026-01-17
- First official release (v0)
- Plugin system implementation
- Theme system implementation

#### 2026-01-13
- Major improvements batch
- Chat streaming with tool actions
- Formatted dates implementation

#### 2026-01-12
- Initial commit
- Core Kanban board
- Ralph mode implementation
- Task execution system
- Done cards timestamp
- Ralph stop button fix
