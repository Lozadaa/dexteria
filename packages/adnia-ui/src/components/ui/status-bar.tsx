import * as React from "react"
import { cn } from "../../lib/utils"

interface StatusBarProps extends React.HTMLAttributes<HTMLElement> {
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
}

const StatusBar = React.forwardRef<HTMLElement, StatusBarProps>(
  ({ className, leftContent, rightContent, children, ...props }, ref) => (
    <footer
      ref={ref}
      className={cn(
        "flex h-6 items-center justify-between border-t border-border bg-muted/50 px-2 text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {leftContent}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {rightContent}
      </div>
    </footer>
  )
)
StatusBar.displayName = "StatusBar"

interface StatusBarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  label?: string
  value?: string | number
  clickable?: boolean
}

const StatusBarItem = React.forwardRef<HTMLDivElement, StatusBarItemProps>(
  ({ className, icon, label, value, clickable = false, children, onClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>); } : undefined}
        className={cn(
          "flex items-center gap-1.5",
          clickable && "cursor-pointer hover:text-foreground transition-colors",
          className
        )}
        {...props}
      >
        {icon && <span className="h-3 w-3">{icon}</span>}
        {label && <span>{label}</span>}
        {value !== undefined && <span className="font-medium">{value}</span>}
        {children}
      </div>
    )
  }
)
StatusBarItem.displayName = "StatusBarItem"

export { StatusBar, StatusBarItem }
export type { StatusBarProps, StatusBarItemProps }
