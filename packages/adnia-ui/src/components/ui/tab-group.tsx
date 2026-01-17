import * as React from "react"
import { cn } from "../../lib/utils"

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  dirty?: boolean
  pinned?: boolean
  disabled?: boolean
}

export interface TabGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  onTabClose?: (id: string) => void
  closable?: boolean
  overflow?: "scroll" | "dropdown"
}

const TabGroup = React.forwardRef<HTMLDivElement, TabGroupProps>(
  (
    {
      className,
      tabs,
      activeTab,
      onTabChange,
      onTabClose,
      closable = false,
      overflow = "scroll",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "flex items-center border-b border-border bg-muted/30",
          overflow === "scroll" && "overflow-x-auto",
          className
        )}
        {...props}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onSelect={() => onTabChange(tab.id)}
            onClose={closable && onTabClose ? () => onTabClose(tab.id) : undefined}
          />
        ))}
      </div>
    )
  }
)
TabGroup.displayName = "TabGroup"

interface TabItemProps {
  tab: Tab
  active: boolean
  onSelect: () => void
  onClose?: () => void
}

const TabItem = ({ tab, active, onSelect, onClose }: TabItemProps) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.()
  }

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1 && onClose) {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={tab.disabled}
      onClick={onSelect}
      onMouseDown={handleMiddleClick}
      className={cn(
        "group relative flex items-center gap-2 border-r border-border px-3 py-2 text-sm transition-colors cursor-pointer",
        "hover:bg-muted/50",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
        "disabled:pointer-events-none disabled:opacity-50",
        active && "bg-background",
        tab.pinned && "bg-muted/20"
      )}
    >
      {/* Active indicator */}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}

      {/* Icon */}
      {tab.icon && <span className="h-4 w-4 flex-shrink-0">{tab.icon}</span>}

      {/* Label */}
      <span className={cn("truncate", tab.dirty && "italic")}>{tab.label}</span>

      {/* Dirty indicator */}
      {tab.dirty && (
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
      )}

      {/* Pin indicator */}
      {tab.pinned && (
        <svg
          className="h-3 w-3 flex-shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      )}

      {/* Close button */}
      {onClose && !tab.pinned && (
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            "ml-1 h-4 w-4 flex-shrink-0 rounded-sm opacity-0 transition-opacity cursor-pointer",
            "hover:bg-muted",
            "group-hover:opacity-100",
            active && "opacity-60"
          )}
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </button>
  )
}

export { TabGroup }
