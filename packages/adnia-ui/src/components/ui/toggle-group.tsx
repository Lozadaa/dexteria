import * as React from "react"
import { cn } from "../../lib/utils"

interface ToggleGroupOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  options: ToggleGroupOption[]
  size?: "sm" | "md"
  className?: string
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ value, onValueChange, options, size = "md", className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center bg-muted rounded-full p-0.5",
          className
        )}
        role="radiogroup"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 font-medium rounded-full transition-all",
              // Size variants
              size === "sm" && "px-2.5 py-0.5 text-[10px]",
              size === "md" && "px-3 py-1 text-xs",
              // Active/inactive states
              value === option.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    )
  }
)
ToggleGroup.displayName = "ToggleGroup"

export { ToggleGroup }
export type { ToggleGroupProps, ToggleGroupOption }
