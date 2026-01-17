import * as React from "react"
import { cn } from "../../lib/utils"
import { ResizeHandle } from "./resize-handle"
import { Tooltip, TooltipProvider } from "./tooltip"

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  width?: number
  minWidth?: number
  maxWidth?: number
  collapsedWidth?: number
  position?: "left" | "right"
  resizable?: boolean
  onWidthChange?: (width: number) => void
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      className,
      children,
      collapsed = false,
      onCollapse,
      width = 240,
      minWidth = 180,
      maxWidth = 400,
      collapsedWidth = 48,
      position = "left",
      resizable = true,
      onWidthChange,
      ...props
    },
    ref
  ) => {
    const [currentWidth, setCurrentWidth] = React.useState(width)

    const handleResize = (delta: number) => {
      if (collapsed) return

      setCurrentWidth((w) => {
        const newWidth = position === "left" ? w + delta : w - delta
        const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth)
        onWidthChange?.(clampedWidth)
        return clampedWidth
      })
    }

    const actualWidth = collapsed ? collapsedWidth : currentWidth

    return (
      <TooltipProvider delayDuration={0}>
        <aside
          ref={ref}
          className={cn(
            "flex h-full flex-col border-border bg-background transition-[width] duration-200",
            position === "left" ? "border-r" : "border-l",
            className
          )}
          style={{ width: actualWidth }}
          {...props}
        >
          <div className="flex-1 overflow-hidden">{children}</div>
          {resizable && !collapsed && (
            <ResizeHandle
              direction="horizontal"
              onResize={handleResize}
              className={cn(
                "absolute top-0 bottom-0",
                position === "left" ? "right-0" : "left-0"
              )}
            />
          )}
        </aside>
      </TooltipProvider>
    )
  }
)
Sidebar.displayName = "Sidebar"

export interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

const SidebarSection = React.forwardRef<HTMLDivElement, SidebarSectionProps>(
  (
    { className, children, title, collapsible = false, defaultCollapsed = false, ...props },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {title && (
          <div
            className={cn(
              "flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
              collapsible && "cursor-pointer hover:text-foreground"
            )}
            onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
          >
            {collapsible && (
              <svg
                className={cn(
                  "mr-1 h-3 w-3 transition-transform",
                  isCollapsed && "-rotate-90"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {title}
          </div>
        )}
        {(!collapsible || !isCollapsed) && <div className="space-y-0.5">{children}</div>}
      </div>
    )
  }
)
SidebarSection.displayName = "SidebarSection"

export interface SidebarItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: number | string
  collapsed?: boolean
  disabled?: boolean
}

const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, icon, label, active, badge, collapsed, disabled, ...props }, ref) => {
    const content = (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          active && "bg-accent text-accent-foreground font-medium",
          collapsed && "justify-center px-0",
          className
        )}
        {...props}
      >
        <span className={cn("h-4 w-4 flex-shrink-0", collapsed && "h-5 w-5")}>{icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{label}</span>
            {badge !== undefined && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                {badge}
              </span>
            )}
          </>
        )}
      </button>
    )

    if (collapsed) {
      return <Tooltip content={label}>{content}</Tooltip>
    }

    return content
  }
)
SidebarItem.displayName = "SidebarItem"

export { Sidebar, SidebarSection, SidebarItem }
