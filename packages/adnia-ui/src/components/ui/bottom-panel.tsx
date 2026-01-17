import * as React from "react"
import { cn } from "../../lib/utils"
import { ResizeHandle } from "./resize-handle"

export interface PanelTab {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number
}

export interface BottomPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs?: PanelTab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  defaultHeight?: number
  minHeight?: number
  maxHeight?: number
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

const BottomPanel = React.forwardRef<HTMLDivElement, BottomPanelProps>(
  (
    {
      className,
      children,
      tabs,
      activeTab,
      onTabChange,
      defaultHeight = 200,
      minHeight = 100,
      maxHeight = 500,
      collapsed = false,
      onCollapse,
      ...props
    },
    ref
  ) => {
    const [height, setHeight] = React.useState(defaultHeight)

    const handleResize = (delta: number) => {
      if (collapsed) return

      setHeight((h) => {
        const newHeight = h - delta // Inverted because dragging up should increase height
        return Math.min(Math.max(newHeight, minHeight), maxHeight)
      })
    }

    const toggleCollapse = () => {
      onCollapse?.(!collapsed)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col border-t border-border bg-background transition-[height] duration-200",
          className
        )}
        style={{ height: collapsed ? 32 : height }}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center border-b border-border">
          {/* Resize handle */}
          {!collapsed && (
            <ResizeHandle
              direction="vertical"
              onResize={handleResize}
              className="absolute top-0 left-0 right-0"
            />
          )}

          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors cursor-pointer",
                    "hover:text-foreground",
                    activeTab === tab.id
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <svg
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="flex-1 overflow-auto">{children}</div>
        )}
      </div>
    )
  }
)
BottomPanel.displayName = "BottomPanel"

export { BottomPanel }
