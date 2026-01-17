import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { TerminalPanel, type TerminalPanelRef } from "../components/ui/dev"

const meta: Meta<typeof TerminalPanel> = {
  title: "UI/TerminalPanel",
  component: TerminalPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof TerminalPanel>

// Interactive demo
function TerminalDemo() {
  const ref = React.useRef<TerminalPanelRef>(null)
  const [sessions, setSessions] = React.useState([
    { id: "1", name: "Terminal 1", status: "idle" as const },
  ])
  const [activeSession, setActiveSession] = React.useState("1")

  const handleCommand = (command: string, sessionId: string) => {
    // Update session to running
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: "running" as const } : s
      )
    )

    // Simulate command execution
    setTimeout(() => {
      if (command === "help") {
        ref.current?.appendOutput("Available commands: help, clear, echo <text>, date")
      } else if (command === "clear") {
        ref.current?.clear()
      } else if (command.startsWith("echo ")) {
        ref.current?.appendOutput(command.slice(5))
      } else if (command === "date") {
        ref.current?.appendOutput(new Date().toString())
      } else if (command === "error") {
        ref.current?.appendOutput("Error: Something went wrong!", "error")
      } else {
        ref.current?.appendOutput(`Command not found: ${command}`, "error")
      }

      // Reset session status
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: "idle" as const } : s
        )
      )
    }, 500)
  }

  const handleCreateSession = () => {
    const newId = String(sessions.length + 1)
    setSessions([
      ...sessions,
      { id: newId, name: `Terminal ${newId}`, status: "idle" },
    ])
    setActiveSession(newId)
  }

  const handleCloseSession = (id: string) => {
    if (sessions.length > 1) {
      const newSessions = sessions.filter((s) => s.id !== id)
      setSessions(newSessions)
      if (activeSession === id) {
        setActiveSession(newSessions[0].id)
      }
    }
  }

  return (
    <TerminalPanel
      ref={ref}
      sessions={sessions}
      activeSession={activeSession}
      onCommand={handleCommand}
      onSessionChange={setActiveSession}
      onSessionCreate={handleCreateSession}
      onSessionClose={handleCloseSession}
      onClear={(id) => ref.current?.clear()}
      onInterrupt={(id) =>
        setSessions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: "idle" as const } : s
          )
        )
      }
      className="h-[400px]"
      initialLines={[
        { id: "1", type: "system", content: "Welcome to Terminal! Type 'help' for available commands." },
      ]}
    />
  )
}

export const Interactive: Story = {
  render: () => <TerminalDemo />,
}

export const Default: Story = {
  args: {
    sessions: [{ id: "1", name: "Terminal", status: "idle" }],
    activeSession: "1",
    className: "h-[300px]",
  },
}

export const MultipleSessions: Story = {
  args: {
    sessions: [
      { id: "1", name: "Terminal 1", status: "idle" },
      { id: "2", name: "Terminal 2", status: "running" },
      { id: "3", name: "Build", status: "error" },
    ],
    activeSession: "1",
    showTabs: true,
    className: "h-[300px]",
  },
}

export const WithOutput: Story = {
  args: {
    sessions: [{ id: "1", name: "Terminal", status: "idle" }],
    activeSession: "1",
    className: "h-[300px]",
    initialLines: [
      { id: "1", type: "input", content: "$ npm install" },
      { id: "2", type: "output", content: "added 150 packages in 5s" },
      { id: "3", type: "input", content: "$ npm run build" },
      { id: "4", type: "output", content: "Building..." },
      { id: "5", type: "output", content: "Build complete!" },
      { id: "6", type: "system", content: "Process exited with code 0" },
    ],
  },
}

export const WithErrors: Story = {
  args: {
    sessions: [{ id: "1", name: "Terminal", status: "error" }],
    activeSession: "1",
    className: "h-[300px]",
    initialLines: [
      { id: "1", type: "input", content: "$ npm run test" },
      { id: "2", type: "output", content: "Running tests..." },
      { id: "3", type: "error", content: "Error: Test failed - expected 5 but got 3" },
      { id: "4", type: "error", content: "  at test.js:15:10" },
      { id: "5", type: "system", content: "Process exited with code 1" },
    ],
  },
}

export const ReadOnly: Story = {
  args: {
    sessions: [{ id: "1", name: "Logs", status: "idle" }],
    activeSession: "1",
    className: "h-[300px]",
    readOnly: true,
    initialLines: [
      { id: "1", type: "output", content: "[2024-01-01 12:00:00] Server started" },
      { id: "2", type: "output", content: "[2024-01-01 12:00:01] Listening on port 3000" },
      { id: "3", type: "output", content: "[2024-01-01 12:00:05] Request: GET /api/users" },
    ],
  },
}
