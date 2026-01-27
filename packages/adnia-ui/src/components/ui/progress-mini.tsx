import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const progressMiniVariants = cva(
  "inline-flex items-center gap-2",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

const progressBarVariants = cva(
  "rounded-full bg-muted overflow-hidden",
  {
    variants: {
      size: {
        sm: "h-1 w-16",
        md: "h-1.5 w-20",
        lg: "h-2 w-24",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

export interface ProgressMiniProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressMiniVariants> {
  /** Current step (1-based) */
  current: number
  /** Total steps */
  total: number
  /** Whether to show the progress bar */
  showBar?: boolean
  /** Custom format for the text (receives current and total) */
  format?: (current: number, total: number) => string
}

const ProgressMini = React.forwardRef<HTMLDivElement, ProgressMiniProps>(
  ({ className, size, current, total, showBar = true, format, ...props }, ref) => {
    // Ensure current is within valid range
    const safeCurrent = Math.max(1, Math.min(current, total))
    const percentage = total > 0 ? (safeCurrent / total) * 100 : 0

    const displayText = format
      ? format(safeCurrent, total)
      : `${safeCurrent}/${total}`

    return (
      <div
        ref={ref}
        className={cn(progressMiniVariants({ size }), className)}
        role="progressbar"
        aria-valuenow={safeCurrent}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${safeCurrent} of ${total}`}
        {...props}
      >
        <span className="text-muted-foreground font-medium tabular-nums">
          {displayText}
        </span>
        {showBar && (
          <div className={cn(progressBarVariants({ size }))}>
            <div
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    )
  }
)
ProgressMini.displayName = "ProgressMini"

export { ProgressMini, progressMiniVariants }
