import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Tooltip, TooltipProvider } from "./tooltip"

const toolbarVariants = cva(
  "flex items-center gap-1 border-b border-border bg-background px-2",
  {
    variants: {
      variant: {
        default: "h-10",
        compact: "h-8",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToolbarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toolbarVariants> {}

const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          ref={ref}
          role="toolbar"
          className={cn(toolbarVariants({ variant }), className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    )
  }
)
Toolbar.displayName = "Toolbar"

export interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  separator?: boolean
}

const ToolbarGroup = React.forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({ className, separator, children, ...props }, ref) => {
    return (
      <>
        <div
          ref={ref}
          role="group"
          className={cn("flex items-center gap-0.5", className)}
          {...props}
        >
          {children}
        </div>
        {separator && <ToolbarSeparator />}
      </>
    )
  }
)
ToolbarGroup.displayName = "ToolbarGroup"

const ToolbarSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mx-1 h-6 w-px bg-border", className)}
    {...props}
  />
))
ToolbarSeparator.displayName = "ToolbarSeparator"

export interface ToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label?: string
  tooltip?: string
  shortcut?: string
  active?: boolean
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, icon, label, tooltip, shortcut, active, disabled, ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md p-1.5 text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "cursor-pointer",
          active && "bg-accent text-accent-foreground",
          className
        )}
        {...props}
      >
        <span className="h-4 w-4">{icon}</span>
        {label && <span className="ml-1.5">{label}</span>}
      </button>
    )

    if (tooltip) {
      return (
        <Tooltip content={tooltip} shortcut={shortcut}>
          {button}
        </Tooltip>
      )
    }

    return button
  }
)
ToolbarButton.displayName = "ToolbarButton"

export { Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarButton }
