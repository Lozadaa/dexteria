import * as React from "react"
import { cn } from "../../lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground opacity-60">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-foreground mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
          {description}
        </p>
      )}
      {children}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
export type { EmptyStateProps }
