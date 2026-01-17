import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { LogViewer, type LogEntry } from "../components/ui/dev"

const meta: Meta<typeof LogViewer> = {
  title: "UI/LogViewer",
  component: LogViewer,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof LogViewer>

const generateLogs = (count: number): LogEntry[] => {
  const levels: LogEntry["level"][] = ["debug", "info", "warn", "error"]
  const sources = ["api", "auth", "db", "cache"]
  const messages = [
    "Request received",
    "Processing data",
    "Cache hit",
    "Cache miss",
    "User authenticated",
    "Query executed",
    "Connection established",
    "Retry attempt",
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    timestamp: new Date(Date.now() - (count - i) * 1000),
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)] + ` (${i + 1})`,
    source: sources[Math.floor(Math.random() * sources.length)],
  }))
}

const sampleLogs: LogEntry[] = [
  { id: "1", timestamp: new Date(), level: "info", message: "Application started", source: "app" },
  { id: "2", timestamp: new Date(), level: "debug", message: "Loading configuration", source: "config" },
  { id: "3", timestamp: new Date(), level: "info", message: "Connected to database", source: "db" },
  { id: "4", timestamp: new Date(), level: "warn", message: "Cache miss for key: user_123", source: "cache" },
  { id: "5", timestamp: new Date(), level: "info", message: "Request: GET /api/users", source: "api" },
  { id: "6", timestamp: new Date(), level: "error", message: "Failed to fetch user data: timeout", source: "api" },
  { id: "7", timestamp: new Date(), level: "info", message: "Retry attempt 1/3", source: "api" },
  { id: "8", timestamp: new Date(), level: "info", message: "Request successful", source: "api" },
]

// Interactive demo
function LogViewerDemo() {
  const [logs, setLogs] = React.useState<LogEntry[]>(sampleLogs)
  const [filter, setFilter] = React.useState({})

  React.useEffect(() => {
    // Simulate streaming logs
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: String(Date.now()),
        timestamp: new Date(),
        level: ["info", "debug", "warn", "error"][Math.floor(Math.random() * 4)] as LogEntry["level"],
        message: `Log message at ${new Date().toISOString()}`,
        source: ["api", "db", "cache"][Math.floor(Math.random() * 3)],
      }
      setLogs((prev) => [...prev.slice(-50), newLog])
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <LogViewer
      entries={logs}
      filter={filter}
      onFilterChange={setFilter}
      onClear={() => setLogs([])}
      followTail
      className="h-[400px]"
    />
  )
}

export const Interactive: Story = {
  render: () => <LogViewerDemo />,
}

export const Default: Story = {
  args: {
    entries: sampleLogs,
    className: "h-[300px]",
  },
}

export const WithManyLogs: Story = {
  args: {
    entries: generateLogs(100),
    className: "h-[400px]",
  },
}

export const FilteredByLevel: Story = {
  args: {
    entries: sampleLogs,
    filter: { levels: ["error", "warn"] },
    className: "h-[300px]",
  },
}

export const Compact: Story = {
  args: {
    entries: sampleLogs,
    compact: true,
    className: "h-[300px]",
  },
}

export const WithoutTimestamp: Story = {
  args: {
    entries: sampleLogs,
    showTimestamp: false,
    className: "h-[300px]",
  },
}

export const WithoutFilters: Story = {
  args: {
    entries: sampleLogs,
    showFilters: false,
    className: "h-[300px]",
  },
}

export const Empty: Story = {
  args: {
    entries: [],
    className: "h-[200px]",
  },
}
