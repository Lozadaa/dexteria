import * as React from "react"
import { cn } from "../../lib/utils"

interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
}

interface TabNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: "default" | "pills" | "underline"
}

const TabNavigation = React.forwardRef<HTMLDivElement, TabNavigationProps>(
  ({ className, tabs, activeTab, onTabChange, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1",
          variant === "pills" && "rounded-lg bg-muted p-1",
          variant === "underline" && "border-b border-border",
          className
        )}
        role="tablist"
        {...props}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              variant === "default" && [
                "rounded-md",
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              ],
              variant === "pills" && [
                "rounded-md",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ],
              variant === "underline" && [
                "border-b-2 -mb-px pb-2",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
              ]
            )}
          >
            {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }
)
TabNavigation.displayName = "TabNavigation"

export { TabNavigation }
export type { TabItem, TabNavigationProps }
