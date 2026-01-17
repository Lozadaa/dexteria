import * as React from "react"
import { cn } from "../../../lib/utils"

export type AIResponseStatus = "streaming" | "complete" | "error" | "cancelled"

export interface AIResponseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Response status */
  status?: AIResponseStatus
  /** AI model name */
  model?: string
  /** Response timestamp */
  timestamp?: Date
  /** Token count */
  tokenCount?: number
  /** Duration in ms */
  duration?: number
  /** Copy handler */
  onCopy?: () => void
  /** Retry handler */
  onRetry?: () => void
  /** Edit handler */
  onEdit?: () => void
  /** Feedback handler */
  onFeedback?: (type: "positive" | "negative") => void
  /** Cancel handler (while streaming) */
  onCancel?: () => void
  /** Show metadata */
  showMetadata?: boolean
  /** Avatar/icon */
  avatar?: React.ReactNode
  /** Title */
  title?: string
  /** Collapsible */
  collapsible?: boolean
}

// AI avatar icon
const AIAvatar = ({ className }: { className?: string }) => (
  <div className={cn("h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center", className)}>
    <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  </div>
)

// Streaming indicator
const StreamingIndicator = () => (
  <div className="flex items-center gap-1">
    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
  </div>
)

const AIResponseCard = React.forwardRef<HTMLDivElement, AIResponseCardProps>(
  (
    {
      className,
      status = "complete",
      model,
      timestamp,
      tokenCount,
      duration,
      onCopy,
      onRetry,
      onEdit,
      onFeedback,
      onCancel,
      showMetadata = true,
      avatar,
      title = "Assistant",
      collapsible = false,
      children,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = React.useState(false)
    const [copied, setCopied] = React.useState(false)
    const [feedback, setFeedback] = React.useState<"positive" | "negative" | null>(null)

    // Handle copy
    const handleCopy = React.useCallback(() => {
      onCopy?.()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }, [onCopy])

    // Handle feedback
    const handleFeedback = React.useCallback(
      (type: "positive" | "negative") => {
        setFeedback(type)
        onFeedback?.(type)
      },
      [onFeedback]
    )

    // Format duration
    const formatDuration = (ms: number) => {
      if (ms < 1000) return `${ms}ms`
      return `${(ms / 1000).toFixed(1)}s`
    }

    // Format timestamp
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    const statusStyles: Record<AIResponseStatus, string> = {
      streaming: "border-primary/50",
      complete: "border-border",
      error: "border-red-500/50 bg-red-500/5",
      cancelled: "border-muted opacity-60",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "ai-response-card rounded-lg border overflow-hidden",
          "bg-card",
          statusStyles[status],
          className
        )}
        {...props}
      >
        {/* Header */}
        <div
          className={cn(
            "response-header flex items-center gap-2 px-3 py-2",
            collapsible && "cursor-pointer"
          )}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          {/* Avatar */}
          {avatar || <AIAvatar />}

          {/* Title & status */}
          <div className="flex-1 flex items-center gap-2">
            <span className="font-medium text-sm">{title}</span>
            {model && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {model}
              </span>
            )}
            {status === "streaming" && <StreamingIndicator />}
            {status === "error" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">
                Error
              </span>
            )}
            {status === "cancelled" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Cancelled
              </span>
            )}
          </div>

          {/* Collapse toggle */}
          {collapsible && (
            <svg
              className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "rotate-180")}
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
          <>
            <div className="response-content px-3 py-3">
              {children}
            </div>

            {/* Footer */}
            <div className="response-footer flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/10">
              {/* Metadata */}
              {showMetadata && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {timestamp && <span>{formatTime(timestamp)}</span>}
                  {tokenCount !== undefined && <span>{tokenCount} tokens</span>}
                  {duration !== undefined && <span>{formatDuration(duration)}</span>}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Cancel (while streaming) */}
                {status === "streaming" && onCancel && (
                  <button
                    onClick={onCancel}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Stop"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </button>
                )}

                {/* Copy */}
                {onCopy && status !== "streaming" && (
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "p-1.5 rounded transition-colors cursor-pointer",
                      copied ? "text-green-500" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={copied ? "Copied!" : "Copy"}
                  >
                    {copied ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Edit */}
                {onEdit && status === "complete" && (
                  <button
                    onClick={onEdit}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}

                {/* Retry */}
                {onRetry && (status === "error" || status === "cancelled") && (
                  <button
                    onClick={onRetry}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Retry"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}

                {/* Feedback */}
                {onFeedback && status === "complete" && (
                  <>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button
                      onClick={() => handleFeedback("positive")}
                      className={cn(
                        "p-1.5 rounded transition-colors cursor-pointer",
                        feedback === "positive"
                          ? "text-green-500 bg-green-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="Helpful"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleFeedback("negative")}
                      className={cn(
                        "p-1.5 rounded transition-colors cursor-pointer",
                        feedback === "negative"
                          ? "text-red-500 bg-red-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="Not helpful"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }
)
AIResponseCard.displayName = "AIResponseCard"

export { AIResponseCard }
