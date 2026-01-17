import * as React from "react"
import { cn } from "../../lib/utils"

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
SectionCard.displayName = "SectionCard"

interface SectionCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
}

const SectionCardHeader = React.forwardRef<HTMLDivElement, SectionCardHeaderProps>(
  ({ className, title, description, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30",
        className
      )}
      {...props}
    >
      <div>
        {title && (
          <h3 className="text-sm font-semibold text-foreground">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
)
SectionCardHeader.displayName = "SectionCardHeader"

interface SectionCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean
}

const SectionCardContent = React.forwardRef<HTMLDivElement, SectionCardContentProps>(
  ({ className, noPadding = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        !noPadding && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
SectionCardContent.displayName = "SectionCardContent"

export { SectionCard, SectionCardHeader, SectionCardContent }
export type { SectionCardProps, SectionCardHeaderProps, SectionCardContentProps }
