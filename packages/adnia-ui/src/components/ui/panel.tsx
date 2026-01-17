import * as React from "react"
import { cn } from "../../lib/utils"

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated"
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg bg-card text-card-foreground",
        variant === "bordered" && "border border-border",
        variant === "elevated" && "shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Panel.displayName = "Panel"

interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  actions?: React.ReactNode
}

const PanelHeader = React.forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ className, title, description, actions, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between border-b border-border px-4 py-3",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-0.5">
        {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
)
PanelHeader.displayName = "PanelHeader"

interface PanelContentProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean
}

const PanelContent = React.forwardRef<HTMLDivElement, PanelContentProps>(
  ({ className, noPadding = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(!noPadding && "p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
PanelContent.displayName = "PanelContent"

interface PanelFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const PanelFooter = React.forwardRef<HTMLDivElement, PanelFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border px-4 py-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
PanelFooter.displayName = "PanelFooter"

export { Panel, PanelHeader, PanelContent, PanelFooter }
export type { PanelProps, PanelHeaderProps, PanelContentProps, PanelFooterProps }
