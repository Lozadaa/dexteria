import * as React from "react"
import { cn } from "../../lib/utils"

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: "sm" | "md"
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        size === "sm" && "h-4 w-7",
        size === "md" && "h-5 w-9",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform",
          size === "sm" && "h-3 w-3",
          size === "md" && "h-4 w-4"
        )}
        style={{
          transform: checked
            ? `translateX(${size === "sm" ? "14px" : "18px"})`
            : "translateX(2px)"
        }}
      />
    </button>
  )
)
Switch.displayName = "Switch"

export { Switch }
export type { SwitchProps }
