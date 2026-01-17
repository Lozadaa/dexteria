import * as React from "react"
import { cn } from "../../../lib/utils"

export interface TerminalSession {
  id: string
  name: string
  status: "idle" | "running" | "error" | "disconnected"
  cwd?: string
}

export interface TerminalLine {
  id: string
  type: "input" | "output" | "error" | "system"
  content: string
  timestamp?: Date
}

export interface TerminalPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Terminal sessions */
  sessions?: TerminalSession[]
  /** Active session ID */
  activeSession?: string
  /** Command submit handler */
  onCommand?: (command: string, sessionId: string) => void
  /** Session change handler */
  onSessionChange?: (sessionId: string) => void
  /** Session close handler */
  onSessionClose?: (sessionId: string) => void
  /** Session create handler */
  onSessionCreate?: () => void
  /** Clear handler */
  onClear?: (sessionId: string) => void
  /** Interrupt handler (Ctrl+C) */
  onInterrupt?: (sessionId: string) => void
  /** Show session tabs */
  showTabs?: boolean
  /** Prompt string */
  prompt?: string
  /** Read-only mode */
  readOnly?: boolean
  /** Initial lines */
  initialLines?: TerminalLine[]
}

export interface TerminalPanelRef {
  /** Append output to terminal */
  appendOutput: (content: string, type?: TerminalLine["type"]) => void
  /** Clear terminal */
  clear: () => void
  /** Focus input */
  focus: () => void
  /** Scroll to bottom */
  scrollToBottom: () => void
}

const TerminalPanel = React.forwardRef<TerminalPanelRef, TerminalPanelProps>(
  (
    {
      className,
      sessions = [{ id: "default", name: "Terminal", status: "idle" }],
      activeSession = "default",
      onCommand,
      onSessionChange,
      onSessionClose,
      onSessionCreate,
      onClear,
      onInterrupt,
      showTabs = true,
      prompt = "$",
      readOnly = false,
      initialLines = [],
      ...props
    },
    ref
  ) => {
    // Per-session lines storage
    const [sessionLines, setSessionLines] = React.useState<Record<string, TerminalLine[]>>(() => ({
      [activeSession]: initialLines,
    }))
    const [currentInput, setCurrentInput] = React.useState("")
    const [historyIndex, setHistoryIndex] = React.useState(-1)
    const [commandHistory, setCommandHistory] = React.useState<string[]>([])

    // Get lines for current session
    const lines = sessionLines[activeSession] || []
    const setLines = React.useCallback((updater: React.SetStateAction<TerminalLine[]>) => {
      setSessionLines((prev) => ({
        ...prev,
        [activeSession]: typeof updater === "function" ? updater(prev[activeSession] || []) : updater,
      }))
    }, [activeSession])

    const inputRef = React.useRef<HTMLInputElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const outputRef = React.useRef<HTMLDivElement>(null)

    // Get current session
    const currentSession = sessions.find((s) => s.id === activeSession) || sessions[0]

    // Scroll to bottom
    const scrollToBottom = React.useCallback(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
    }, [])

    // Append output
    const appendOutput = React.useCallback(
      (content: string, type: TerminalLine["type"] = "output") => {
        const newLine: TerminalLine = {
          id: `${Date.now()}-${Math.random()}`,
          type,
          content,
          timestamp: new Date(),
        }
        setLines((prev) => [...prev, newLine])
        requestAnimationFrame(scrollToBottom)
      },
      [scrollToBottom]
    )

    // Clear terminal
    const clear = React.useCallback(() => {
      setLines([])
    }, [])

    // Focus input
    const focus = React.useCallback(() => {
      inputRef.current?.focus()
    }, [])

    // Imperative handle
    React.useImperativeHandle(
      ref,
      () => ({
        appendOutput,
        clear,
        focus,
        scrollToBottom,
      }),
      [appendOutput, clear, focus, scrollToBottom]
    )

    // Handle command submission
    const handleSubmit = React.useCallback(
      (e: React.FormEvent) => {
        e.preventDefault()

        if (!currentInput.trim()) return

        // Add to history
        setCommandHistory((prev) => [...prev, currentInput])
        setHistoryIndex(-1)

        // Add input line
        appendOutput(`${prompt} ${currentInput}`, "input")

        // Emit command
        onCommand?.(currentInput, activeSession)

        // Clear input
        setCurrentInput("")
      },
      [currentInput, prompt, activeSession, onCommand, appendOutput]
    )

    // Handle key events
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Ctrl+C - interrupt
        if (e.ctrlKey && e.key === "c") {
          e.preventDefault()
          onInterrupt?.(activeSession)
          appendOutput("^C", "system")
          setCurrentInput("")
        }

        // Ctrl+L - clear
        if (e.ctrlKey && e.key === "l") {
          e.preventDefault()
          clear()
          onClear?.(activeSession)
        }

        // Up arrow - history up
        if (e.key === "ArrowUp") {
          e.preventDefault()
          if (commandHistory.length > 0) {
            const newIndex = historyIndex + 1
            if (newIndex < commandHistory.length) {
              setHistoryIndex(newIndex)
              setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex])
            }
          }
        }

        // Down arrow - history down
        if (e.key === "ArrowDown") {
          e.preventDefault()
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex])
          } else if (historyIndex === 0) {
            setHistoryIndex(-1)
            setCurrentInput("")
          }
        }
      },
      [activeSession, onInterrupt, onClear, clear, commandHistory, historyIndex, appendOutput]
    )

    // Focus container click
    const handleContainerClick = React.useCallback(() => {
      focus()
    }, [focus])

    const statusColors: Record<TerminalSession["status"], string> = {
      idle: "bg-green-500",
      running: "bg-amber-500 animate-pulse",
      error: "bg-red-500",
      disconnected: "bg-muted-foreground",
    }

    const lineTypeColors: Record<TerminalLine["type"], string> = {
      input: "text-[hsl(var(--terminal-foreground))]",
      output: "text-[hsl(var(--terminal-foreground))]",
      error: "text-red-400",
      system: "text-muted-foreground italic",
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          "terminal-panel flex flex-col rounded-md border border-border overflow-hidden",
          "bg-[hsl(var(--terminal-background))] text-[hsl(var(--terminal-foreground))]",
          className
        )}
        onClick={handleContainerClick}
        {...props}
      >
        {/* Session tabs */}
        {showTabs && sessions.length > 0 && (
          <div className="terminal-tabs flex items-center gap-1 px-2 py-1 border-b border-border/50 bg-black/20">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onSessionChange?.(session.id)
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors cursor-pointer",
                  session.id === activeSession
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", statusColors[session.status])} />
                <span>{session.name}</span>
                {onSessionClose && sessions.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      onSessionClose(session.id)
                    }}
                    className="ml-1 hover:text-red-400 cursor-pointer"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            {onSessionCreate && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSessionCreate()
                }}
                className="px-2 py-1 text-xs text-white/40 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
              >
                +
              </button>
            )}
          </div>
        )}

        {/* Terminal output */}
        <div
          ref={outputRef}
          className="terminal-output flex-1 overflow-auto p-3 font-mono text-[13px] leading-[1.5]"
          style={{ fontFamily: "var(--font-family-mono)" }}
        >
          {lines.map((line) => (
            <div
              key={line.id}
              className={cn("terminal-line whitespace-pre-wrap break-all", lineTypeColors[line.type])}
            >
              {line.content}
            </div>
          ))}
        </div>

        {/* Input line */}
        {!readOnly && (
          <form
            onSubmit={handleSubmit}
            className="terminal-input flex items-center gap-2 px-3 py-2 border-t border-border/30 bg-black/10"
          >
            <span className="text-green-400 select-none">{prompt}</span>
            {currentSession?.cwd && (
              <span className="text-blue-400 text-xs select-none">{currentSession.cwd}</span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={currentSession?.status === "disconnected"}
              className={cn(
                "flex-1 bg-transparent outline-none font-mono text-[13px]",
                "text-[hsl(var(--terminal-foreground))] placeholder:text-white/30",
                "caret-[hsl(var(--terminal-cursor))]"
              )}
              style={{ fontFamily: "var(--font-family-mono)" }}
              placeholder={currentSession?.status === "running" ? "Running..." : ""}
              autoComplete="off"
              spellCheck={false}
            />
            {currentSession?.status === "running" && (
              <span className="text-xs text-amber-400">Running</span>
            )}
          </form>
        )}
      </div>
    )
  }
)
TerminalPanel.displayName = "TerminalPanel"

export { TerminalPanel }
