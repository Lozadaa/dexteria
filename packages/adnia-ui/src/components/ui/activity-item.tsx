import * as React from "react"
import { cn } from "../../lib/utils"

interface ActivityItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  iconVariant?: "success" | "error" | "warning" | "info" | "default"
  title: string
  description?: string
  timestamp?: string
  action?: React.ReactNode
}

const ActivityItem = React.forwardRef<HTMLDivElement, ActivityItemProps>(
  ({ className, icon, iconVariant = "default", title, description, timestamp, action, ...props }, ref) => {
    const iconStyles = {
      success: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
      error: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
      warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
      info: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
      default: "bg-muted text-muted-foreground",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start gap-3 py-3 px-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors",
          className
        )}
        {...props}
      >
        {icon && (
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
              iconStyles[iconVariant]
            )}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">
            {title}
          </div>
          {description && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {description}
            </div>
          )}
        </div>
        {timestamp && (
          <div className="text-xs text-muted-foreground flex-shrink-0">
            {timestamp}
          </div>
        )}
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    )
  }
)
ActivityItem.displayName = "ActivityItem"

export { ActivityItem }
export type { ActivityItemProps }
