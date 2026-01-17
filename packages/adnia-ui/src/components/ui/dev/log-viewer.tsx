import * as React from "react"
import { cn } from "../../../lib/utils"

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
  source?: string
  metadata?: Record<string, unknown>
}

export interface LogFilter {
  levels?: LogLevel[]
  search?: string
  source?: string
}

export interface LogViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onCopy"> {
  /** Log entries */
  entries: LogEntry[]
  /** Maximum entries to keep */
  maxEntries?: number
  /** Show timestamp column */
  showTimestamp?: boolean
  /** Show level column */
  showLevel?: boolean
  /** Show source column */
  showSource?: boolean
  /** Current filter */
  filter?: LogFilter
  /** Filter change handler */
  onFilterChange?: (filter: LogFilter) => void
  /** Clear logs handler */
  onClear?: () => void
  /** Copy logs handler */
  onCopy?: (entries: LogEntry[]) => void
  /** Auto-scroll to new entries */
  followTail?: boolean
  /** Entry click handler */
  onEntryClick?: (entry: LogEntry) => void
  /** Compact mode */
  compact?: boolean
  /** Show filter controls */
  showFilters?: boolean
}

export interface LogViewerRef {
  /** Scroll to bottom */
  scrollToBottom: () => void
  /** Scroll to top */
  scrollToTop: () => void
  /** Get filtered entries */
  getFilteredEntries: () => LogEntry[]
}

const levelConfig: Record<LogLevel, { label: string; color: string; bg: string }> = {
  debug: {
    label: "DEBUG",
    color: "text-muted-foreground",
    bg: "bg-muted/30",
  },
  info: {
    label: "INFO",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  warn: {
    label: "WARN",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  error: {
    label: "ERROR",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
}

const LogViewer = React.forwardRef<LogViewerRef, LogViewerProps>(
  (
    {
      className,
      entries,
      maxEntries = 1000,
      showTimestamp = true,
      showLevel = true,
      showSource = true,
      filter = {},
      onFilterChange,
      onClear,
      onCopy,
      followTail = true,
      onEntryClick,
      compact = false,
      showFilters = true,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [localFilter, setLocalFilter] = React.useState<LogFilter>(filter)
    const [expandedEntries, setExpandedEntries] = React.useState<Set<string>>(new Set())

    // Sync filter with prop
    React.useEffect(() => {
      setLocalFilter(filter)
    }, [filter])

    // Filter entries
    const filteredEntries = React.useMemo(() => {
      return entries
        .slice(-maxEntries)
        .filter((entry) => {
          // Level filter
          if (localFilter.levels && localFilter.levels.length > 0) {
            if (!localFilter.levels.includes(entry.level)) return false
          }

          // Source filter
          if (localFilter.source && entry.source !== localFilter.source) {
            return false
          }

          // Search filter
          if (localFilter.search) {
            const searchLower = localFilter.search.toLowerCase()
            const messageMatch = entry.message.toLowerCase().includes(searchLower)
            const sourceMatch = entry.source?.toLowerCase().includes(searchLower)
            if (!messageMatch && !sourceMatch) return false
          }

          return true
        })
    }, [entries, maxEntries, localFilter])

    // Get unique sources
    const sources = React.useMemo(() => {
      const sourceSet = new Set<string>()
      entries.forEach((entry) => {
        if (entry.source) sourceSet.add(entry.source)
      })
      return Array.from(sourceSet)
    }, [entries])

    // Auto scroll
    React.useEffect(() => {
      if (followTail && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }, [filteredEntries, followTail])

    // Ref methods
    const scrollToBottom = React.useCallback(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }, [])

    const scrollToTop = React.useCallback(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0
      }
    }, [])

    const getFilteredEntries = React.useCallback(() => filteredEntries, [filteredEntries])

    React.useImperativeHandle(ref, () => ({
      scrollToBottom,
      scrollToTop,
      getFilteredEntries,
    }), [scrollToBottom, scrollToTop, getFilteredEntries])

    // Handle filter change
    const updateFilter = React.useCallback(
      (updates: Partial<LogFilter>) => {
        const newFilter = { ...localFilter, ...updates }
        setLocalFilter(newFilter)
        onFilterChange?.(newFilter)
      },
      [localFilter, onFilterChange]
    )

    // Toggle level filter
    const toggleLevel = React.useCallback(
      (level: LogLevel) => {
        const currentLevels = localFilter.levels || []
        const newLevels = currentLevels.includes(level)
          ? currentLevels.filter((l) => l !== level)
          : [...currentLevels, level]
        updateFilter({ levels: newLevels.length > 0 ? newLevels : undefined })
      },
      [localFilter.levels, updateFilter]
    )

    // Toggle entry expansion
    const toggleExpanded = React.useCallback((id: string) => {
      setExpandedEntries((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }, [])

    // Format timestamp
    const formatTimestamp = (date: Date) => {
      const time = date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      const ms = String(date.getMilliseconds()).padStart(3, "0")
      return `${time}.${ms}`
    }

    // Copy all
    const handleCopy = React.useCallback(() => {
      if (onCopy) {
        onCopy(filteredEntries)
      } else {
        const text = filteredEntries
          .map((e) => `[${formatTimestamp(e.timestamp)}] [${e.level.toUpperCase()}] ${e.source ? `[${e.source}] ` : ""}${e.message}`)
          .join("\n")
        navigator.clipboard.writeText(text)
      }
    }, [filteredEntries, onCopy])

    return (
      <div
        className={cn(
          "log-viewer flex flex-col rounded-md border border-border overflow-hidden",
          "bg-[hsl(var(--code-background))]",
          className
        )}
        {...props}
      >
        {/* Toolbar */}
        {showFilters && (
          <div className="log-toolbar flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
            {/* Level filters */}
            <div className="flex items-center gap-1">
              {(Object.keys(levelConfig) as LogLevel[]).map((level) => {
                const config = levelConfig[level]
                const isActive = !localFilter.levels || localFilter.levels.includes(level)
                return (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer",
                      isActive ? `${config.bg} ${config.color}` : "text-muted-foreground/50 hover:text-muted-foreground"
                    )}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search logs..."
              value={localFilter.search || ""}
              onChange={(e) => updateFilter({ search: e.target.value || undefined })}
              className="flex-1 px-2 py-1 text-xs bg-transparent border border-border rounded outline-none focus:border-primary"
            />

            {/* Source filter */}
            {sources.length > 1 && (
              <select
                value={localFilter.source || ""}
                onChange={(e) => updateFilter({ source: e.target.value || undefined })}
                className="px-2 py-1 text-xs bg-transparent border border-border rounded outline-none cursor-pointer"
              >
                <option value="">All sources</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-muted-foreground">
                {filteredEntries.length} / {entries.length}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Copy logs"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              {onClear && (
                <button
                  onClick={onClear}
                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                  title="Clear logs"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Log entries */}
        <div
          ref={containerRef}
          className="log-entries flex-1 overflow-auto font-mono text-[12px]"
          style={{ fontFamily: "var(--font-family-mono)" }}
        >
          {filteredEntries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No log entries
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const config = levelConfig[entry.level]
              const isExpanded = expandedEntries.has(entry.id)
              const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0

              return (
                <div
                  key={entry.id}
                  className={cn(
                    "log-entry flex items-start gap-2 px-3 border-b border-border/30",
                    compact ? "py-0.5" : "py-1",
                    config.bg,
                    onEntryClick && "cursor-pointer hover:bg-muted/30"
                  )}
                  onClick={() => {
                    if (hasMetadata) toggleExpanded(entry.id)
                    onEntryClick?.(entry)
                  }}
                >
                  {showTimestamp && (
                    <span className="text-muted-foreground shrink-0 w-[85px]">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  )}
                  {showLevel && (
                    <span className={cn("shrink-0 w-[45px] font-medium", config.color)}>
                      {config.label}
                    </span>
                  )}
                  {showSource && entry.source && (
                    <span className="text-muted-foreground shrink-0 max-w-[100px] truncate">
                      [{entry.source}]
                    </span>
                  )}
                  <span className="flex-1 break-all whitespace-pre-wrap">
                    {entry.message}
                  </span>
                  {hasMetadata && (
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }
)
LogViewer.displayName = "LogViewer"

export { LogViewer }
