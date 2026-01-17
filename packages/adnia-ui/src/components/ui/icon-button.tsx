import * as React from "react"
import { cn } from "../../lib/utils"

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline" | "secondary" | "danger" | "success" | "warning"
  size?: "xs" | "sm" | "md" | "lg"
  tooltip?: string
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", tooltip, children, ...props }, ref) => (
    <button
      ref={ref}
      title={tooltip}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
        // Variants
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "ghost" && "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        variant === "outline" && "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "danger" && "text-muted-foreground hover:bg-red-500/20 hover:text-red-400",
        variant === "success" && "text-muted-foreground hover:bg-green-500/20 hover:text-green-500",
        variant === "warning" && "text-muted-foreground hover:bg-yellow-500/20 hover:text-yellow-500",
        // Sizes
        size === "xs" && "h-6 w-6 [&>svg]:h-3 [&>svg]:w-3",
        size === "sm" && "h-7 w-7 [&>svg]:h-3.5 [&>svg]:w-3.5",
        size === "md" && "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4",
        size === "lg" && "h-10 w-10 [&>svg]:h-5 [&>svg]:w-5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
IconButton.displayName = "IconButton"

export { IconButton }
export type { IconButtonProps }
