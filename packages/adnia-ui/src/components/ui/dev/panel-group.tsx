import * as React from "react"
import { cn } from "../../../lib/utils"

// PanelGroup
export interface PanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Layout direction */
  direction?: "horizontal" | "vertical"
  /** Layout change handler */
  onLayout?: (sizes: number[]) => void
  /** Auto-save layout key */
  autoSaveId?: string
}

const PanelGroup = React.forwardRef<HTMLDivElement, PanelGroupProps>(
  ({ className, direction = "horizontal", onLayout, autoSaveId, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-direction={direction}
        data-autosave-id={autoSaveId}
        className={cn(
          "panel-group flex overflow-hidden h-full",
          direction === "horizontal" ? "flex-row" : "flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PanelGroup.displayName = "PanelGroup"

// Panel
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default size (percentage) */
  defaultSize?: number
  /** Minimum size (percentage) */
  minSize?: number
  /** Maximum size (percentage) */
  maxSize?: number
  /** Is collapsible */
  collapsible?: boolean
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      className,
      defaultSize = 50,
      minSize = 10,
      maxSize = 90,
      collapsible = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("panel overflow-auto flex-1", className)}
        style={{
          flexBasis: `${defaultSize}%`,
          minWidth: minSize ? `${minSize}%` : undefined,
          maxWidth: maxSize ? `${maxSize}%` : undefined,
        }}
        data-collapsible={collapsible}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Panel.displayName = "Panel"

// PanelResizeHandle
export interface PanelResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show visual handle indicator */
  withHandle?: boolean
}

const PanelResizeHandle = React.forwardRef<HTMLDivElement, PanelResizeHandleProps>(
  ({ className, withHandle = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "panel-resize-handle relative shrink-0 group",
          "w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors",
          className
        )}
        {...props}
      >
        {withHandle && (
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 flex items-center justify-center">
            <div className="h-8 w-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary/50 transition-colors" />
          </div>
        )}
      </div>
    )
  }
)
PanelResizeHandle.displayName = "PanelResizeHandle"

// Hook for panel group (placeholder for future use)
function usePanelGroup() {
  return {
    direction: "horizontal" as const,
  }
}

export { PanelGroup, Panel, PanelResizeHandle, usePanelGroup }
