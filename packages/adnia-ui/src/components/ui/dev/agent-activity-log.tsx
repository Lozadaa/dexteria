import * as React from "react"
import { cn } from "../../../lib/utils"

/**
 * Types of agent operations that can be logged
 */
export type AgentOperationType =
  | "spawn"
  | "run"
  | "search"
  | "read"
  | "write"
  | "grep"
  | "tool"
  | "thinking"
  | "complete"
  | "error"

/**
 * Status of an agent operation
 */
export type AgentOperationStatus = "running" | "completed" | "error" | "pending"

/**
 * Single agent operation entry
 */
export interface AgentOperation {
  id: string
  type: AgentOperationType
  status: AgentOperationStatus
  title: string
  content?: string
  timestamp?: Date
  duration?: number
  metadata?: Record<string, unknown>
}

export interface AgentActivityLogProps extends React.HTMLAttributes<HTMLDivElement> {
  /** List of operations to display */
  operations: AgentOperation[]
  /** Whether the log is collapsible */
  collapsible?: boolean
  /** Initial collapsed state */
  defaultCollapsed?: boolean
  /** Show timestamps */
  showTimestamps?: boolean
  /** Show durations */
  showDurations?: boolean
  /** Maximum operations to show (older ones hidden) */
  maxVisible?: number
  /** Auto-scroll to new operations */
  followTail?: boolean
  /** Header title */
  title?: string
  /** Show operation count */
  showCount?: boolean
  /** Compact mode */
  compact?: boolean
  /** On operation click */
  onOperationClick?: (operation: AgentOperation) => void
}

// Icons for each operation type
const operationIcons: Record<AgentOperationType, React.ReactNode> = {
  spawn: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  run: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  search: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  read: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  write: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  grep: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  tool: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  thinking: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  complete: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

// Status indicators
const StatusIndicator: React.FC<{ status: AgentOperationStatus }> = ({ status }) => {
  switch (status) {
    case "running":
      return (
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:150ms]" />
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:300ms]" />
        </div>
      )
    case "completed":
      return (
        <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    case "error":
      return (
        <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    case "pending":
      return (
        <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
      )
    default:
      return null
  }
}

// Style configurations for each operation type
const operationStyles: Record<AgentOperationType, { bg: string; iconColor: string; label: string }> = {
  spawn: {
    bg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    label: "Spawning",
  },
  run: {
    bg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    label: "Running",
  },
  search: {
    bg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
    label: "Searching",
  },
  read: {
    bg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    label: "Reading",
  },
  write: {
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    label: "Writing",
  },
  grep: {
    bg: "bg-pink-500/10",
    iconColor: "text-pink-500",
    label: "Grep",
  },
  tool: {
    bg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    label: "Tool",
  },
  thinking: {
    bg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    label: "Thinking",
  },
  complete: {
    bg: "bg-green-500/10",
    iconColor: "text-green-500",
    label: "Complete",
  },
  error: {
    bg: "bg-red-500/10",
    iconColor: "text-red-500",
    label: "Error",
  },
}

// Single operation item
const AgentOperationItem: React.FC<{
  operation: AgentOperation
  compact?: boolean
  showTimestamp?: boolean
  showDuration?: boolean
  onClick?: () => void
}> = ({ operation, compact = false, showTimestamp = false, showDuration = false, onClick }) => {
  const [expanded, setExpanded] = React.useState(false)
  const style = operationStyles[operation.type]
  const hasContent = operation.content && operation.content.length > 0

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div
      className={cn(
        "agent-operation-item border-l-2 transition-colors",
        operation.status === "running" ? "border-l-blue-500" : "border-l-transparent",
        style.bg,
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3",
          compact ? "py-1" : "py-2",
          hasContent && "cursor-pointer"
        )}
        onClick={(e) => {
          if (hasContent) {
            e.stopPropagation()
            setExpanded(!expanded)
          }
        }}
      >
        {/* Operation icon */}
        <div className={cn("flex-shrink-0", style.iconColor)}>
          {operationIcons[operation.type]}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span className={cn("text-sm truncate", compact && "text-xs")}>
            {operation.title}
          </span>
        </div>

        {/* Timestamp */}
        {showTimestamp && operation.timestamp && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatTime(operation.timestamp)}
          </span>
        )}

        {/* Duration */}
        {showDuration && operation.duration !== undefined && operation.status === "completed" && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDuration(operation.duration)}
          </span>
        )}

        {/* Status indicator */}
        <div className="flex-shrink-0">
          <StatusIndicator status={operation.status} />
        </div>

        {/* Expand indicator */}
        {hasContent && (
          <svg
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform flex-shrink-0",
              expanded && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Expanded content */}
      {expanded && hasContent && (
        <div className="px-3 pb-2 pt-0">
          <div
            className={cn(
              "p-2 rounded bg-background/50 border border-border/50",
              "font-mono text-xs text-muted-foreground",
              "max-h-48 overflow-auto whitespace-pre-wrap break-all"
            )}
            style={{ fontFamily: "var(--font-family-mono)" }}
          >
            {operation.content}
          </div>
        </div>
      )}
    </div>
  )
}

// Main component
const AgentActivityLog = React.forwardRef<HTMLDivElement, AgentActivityLogProps>(
  (
    {
      className,
      operations,
      collapsible = true,
      defaultCollapsed = false,
      showTimestamps = false,
      showDurations = true,
      maxVisible,
      followTail = true,
      title = "Agent Activity",
      showCount = true,
      compact = false,
      onOperationClick,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed)
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Filter operations if maxVisible is set
    const visibleOperations = maxVisible
      ? operations.slice(-maxVisible)
      : operations

    // Count running operations
    const runningCount = operations.filter((op) => op.status === "running").length
    const completedCount = operations.filter((op) => op.status === "completed").length
    const errorCount = operations.filter((op) => op.status === "error").length

    // Auto-scroll to bottom
    React.useEffect(() => {
      if (followTail && containerRef.current && !collapsed) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }, [operations, followTail, collapsed])

    return (
      <div
        ref={ref}
        className={cn(
          "agent-activity-log rounded-lg border border-border overflow-hidden bg-card",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border",
            collapsible && "cursor-pointer hover:bg-muted/50"
          )}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          {/* Icon */}
          <svg
            className="h-4 w-4 text-primary flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>

          {/* Title */}
          <span className="font-medium text-sm flex-1">{title}</span>

          {/* Counts */}
          {showCount && (
            <div className="flex items-center gap-2 text-xs">
              {runningCount > 0 && (
                <span className="flex items-center gap-1 text-blue-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {runningCount}
                </span>
              )}
              {completedCount > 0 && (
                <span className="flex items-center gap-1 text-green-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {completedCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {errorCount}
                </span>
              )}
              <span className="text-muted-foreground">
                {operations.length} total
              </span>
            </div>
          )}

          {/* Collapse toggle */}
          {collapsible && (
            <svg
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                collapsed && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>

        {/* Content */}
        {!collapsed && (
          <div
            ref={containerRef}
            className={cn(
              "agent-operations overflow-auto",
              operations.length > 6 && "max-h-64"
            )}
          >
            {visibleOperations.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                No activity yet
              </div>
            ) : (
              visibleOperations.map((operation) => (
                <AgentOperationItem
                  key={operation.id}
                  operation={operation}
                  compact={compact}
                  showTimestamp={showTimestamps}
                  showDuration={showDurations}
                  onClick={onOperationClick ? () => onOperationClick(operation) : undefined}
                />
              ))
            )}
          </div>
        )}
      </div>
    )
  }
)
AgentActivityLog.displayName = "AgentActivityLog"

export { AgentActivityLog, AgentOperationItem, StatusIndicator as AgentStatusIndicator }
