import * as React from "react"
import { cn } from "../../lib/utils"

// Status types for the status indicator
export type StatusType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "pending"
  | "running"
  | "paused"
  | "stopped"
  | "connected"
  | "disconnected"
  | "testing"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status type - determines color */
  status: StatusType
  /** Text to display */
  children?: React.ReactNode
  /** Show pulsing dot indicator */
  pulse?: boolean
  /** Size variant */
  size?: "sm" | "default" | "lg"
  /** Variant style */
  variant?: "default" | "outline" | "subtle"
}

const statusColors: Record<StatusType, { bg: string; text: string; dot: string }> = {
  success: {
    bg: "bg-green-500/15",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  error: {
    bg: "bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  warning: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-600 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  info: {
    bg: "bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  pending: {
    bg: "bg-orange-500/15",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  running: {
    bg: "bg-green-500/15",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  paused: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-600 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  stopped: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  connected: {
    bg: "bg-green-500/15",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  disconnected: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  testing: {
    bg: "bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    {
      className,
      status,
      children,
      pulse = false,
      size = "default",
      variant = "default",
      ...props
    },
    ref
  ) => {
    const colors = statusColors[status]

    const sizeClasses = {
      sm: "text-[10px] px-1.5 py-0.5 gap-1",
      default: "text-xs px-2 py-1 gap-1.5",
      lg: "text-sm px-2.5 py-1.5 gap-2",
    }

    const dotSizeClasses = {
      sm: "h-1.5 w-1.5",
      default: "h-2 w-2",
      lg: "h-2.5 w-2.5",
    }

    const variantClasses = {
      default: colors.bg,
      outline: "border border-current bg-transparent",
      subtle: "bg-transparent",
    }

    return (
      <span
        ref={ref}
        className={cn(
          "status-badge inline-flex items-center font-medium rounded-full",
          sizeClasses[size],
          colors.text,
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "status-badge__dot rounded-full shrink-0",
            dotSizeClasses[size],
            colors.dot,
            pulse && "animate-pulse"
          )}
        />
        {children}
      </span>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

// Score badge - for displaying percentage scores with color coding
export interface ScoreBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Score value (0-100) */
  score: number
  /** Show percentage sign */
  showPercent?: boolean
  /** Size variant */
  size?: "sm" | "default" | "lg"
  /** Custom thresholds for colors */
  thresholds?: {
    success: number
    warning: number
  }
}

const ScoreBadge = React.forwardRef<HTMLSpanElement, ScoreBadgeProps>(
  (
    {
      className,
      score,
      showPercent = true,
      size = "default",
      thresholds = { success: 80, warning: 60 },
      ...props
    },
    ref
  ) => {
    const getScoreColor = () => {
      if (score >= thresholds.success) return "bg-green-500/15 text-green-600 dark:text-green-400"
      if (score >= thresholds.warning) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
      return "bg-red-500/15 text-red-600 dark:text-red-400"
    }

    const sizeClasses = {
      sm: "text-[10px] px-1.5 py-0.5",
      default: "text-xs px-2 py-1",
      lg: "text-sm px-2.5 py-1.5",
    }

    return (
      <span
        ref={ref}
        className={cn(
          "score-badge inline-flex items-center font-medium rounded-full tabular-nums",
          sizeClasses[size],
          getScoreColor(),
          className
        )}
        {...props}
      >
        {score}{showPercent && "%"}
      </span>
    )
  }
)
ScoreBadge.displayName = "ScoreBadge"

export { StatusBadge, ScoreBadge }
