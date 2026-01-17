import * as React from "react"
import { cn } from "../../lib/utils"

export interface FilterTab<T extends string = string> {
  /** Unique value for this tab */
  value: T
  /** Display label */
  label: string
  /** Count to show as badge (optional) */
  count?: number
  /** Icon to display (optional) */
  icon?: React.ReactNode
  /** Whether this tab is disabled */
  disabled?: boolean
}

export interface FilterTabsProps<T extends string = string> {
  /** Array of tab definitions */
  tabs: FilterTab<T>[]
  /** Currently active tab value */
  value: T
  /** Called when tab changes */
  onValueChange: (value: T) => void
  /** Visual variant */
  variant?: "default" | "pills" | "underline"
  /** Size */
  size?: "sm" | "default" | "lg"
  /** Additional class name */
  className?: string
  /** Whether counts should be hidden when zero */
  hideZeroCounts?: boolean
}

function FilterTabs<T extends string = string>({
  tabs,
  value,
  onValueChange,
  variant = "default",
  size = "default",
  className,
  hideZeroCounts = true,
}: FilterTabsProps<T>) {
  const sizeClasses = {
    sm: "text-xs gap-1",
    default: "text-sm gap-1.5",
    lg: "text-base gap-2",
  }

  const tabSizeClasses = {
    sm: "px-2.5 py-1",
    default: "px-3 py-1.5",
    lg: "px-4 py-2",
  }

  const countSizeClasses = {
    sm: "text-[10px] px-1 py-0 min-w-[16px]",
    default: "text-[11px] px-1.5 py-0.5 min-w-[18px]",
    lg: "text-xs px-2 py-0.5 min-w-[20px]",
  }

  const variantClasses = {
    default: "bg-muted/50 rounded-lg p-1",
    pills: "gap-2",
    underline: "border-b border-border",
  }

  const tabVariantClasses = {
    default: {
      base: "rounded-md transition-colors",
      active: "bg-background text-foreground shadow-sm",
      inactive: "text-muted-foreground hover:text-foreground hover:bg-muted",
    },
    pills: {
      base: "rounded-full border transition-colors",
      active: "bg-primary text-primary-foreground border-primary",
      inactive: "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
    },
    underline: {
      base: "-mb-px border-b-2 transition-colors",
      active: "border-primary text-foreground",
      inactive: "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
    },
  }

  return (
    <div
      className={cn(
        "filter-tabs flex flex-wrap items-center",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value
        const showCount = tab.count !== undefined && (tab.count > 0 || !hideZeroCounts)

        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onValueChange(tab.value)}
            className={cn(
              "filter-tabs__tab inline-flex items-center justify-center font-medium cursor-pointer",
              tabVariantClasses[variant].base,
              isActive ? tabVariantClasses[variant].active : tabVariantClasses[variant].inactive,
              tabSizeClasses[size],
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.icon && <span className="filter-tabs__icon mr-1.5">{tab.icon}</span>}
            <span>{tab.label}</span>
            {showCount && (
              <span
                className={cn(
                  "filter-tabs__count ml-1.5 rounded-full text-center font-medium",
                  countSizeClasses[size],
                  isActive
                    ? variant === "pills"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { FilterTabs }
