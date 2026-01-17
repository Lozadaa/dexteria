import * as React from "react"
import { cn } from "../../lib/utils"

interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string
  subtitle?: string
}

const AppHeader = React.forwardRef<HTMLElement, AppHeaderProps>(
  ({ className, title, subtitle, children, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        "flex h-14 items-center justify-between border-b border-border bg-background px-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        {title && (
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  )
)
AppHeader.displayName = "AppHeader"

interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: "connected" | "disconnected" | "loading" | "error"
  label?: string
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, status, label, ...props }, ref) => {
    const statusColors = {
      connected: "bg-green-600",
      disconnected: "bg-muted-foreground",
      loading: "bg-amber-500 animate-pulse",
      error: "bg-destructive",
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2 text-sm", className)}
        {...props}
      >
        <span className={cn("h-2 w-2 rounded-full", statusColors[status])} />
        {label && <span className="text-muted-foreground">{label}</span>}
      </div>
    )
  }
)
StatusIndicator.displayName = "StatusIndicator"

export { AppHeader, StatusIndicator }
