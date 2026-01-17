import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const progressVariants = cva(
  "h-full transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-600",
        warning: "bg-amber-500",
        error: "bg-red-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const progressContainerVariants = cva(
  "overflow-hidden rounded-full bg-muted",
  {
    variants: {
      size: {
        sm: "h-1",
        md: "h-2",
        lg: "h-3",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressContainerVariants> {
  value?: number // 0-100, undefined for indeterminate
  showValue?: boolean
  label?: string
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    { className, value, variant, size, showValue = false, label, ...props },
    ref
  ) => {
    const isIndeterminate = value === undefined

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {(label || showValue) && (
          <div className="mb-1 flex items-center justify-between text-sm">
            {label && <span className="text-muted-foreground">{label}</span>}
            {showValue && !isIndeterminate && (
              <span className="text-muted-foreground">{Math.round(value)}%</span>
            )}
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn(progressContainerVariants({ size }))}
        >
          <div
            className={cn(
              progressVariants({ variant }),
              isIndeterminate && "animate-indeterminate-progress w-1/3"
            )}
            style={
              isIndeterminate
                ? undefined
                : { width: `${Math.min(Math.max(value, 0), 100)}%` }
            }
          />
        </div>
      </div>
    )
  }
)
ProgressBar.displayName = "ProgressBar"

export { ProgressBar, progressVariants }
