import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const inlineActionRowVariants = cva(
  "flex flex-wrap gap-2",
  {
    variants: {
      align: {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
      },
      size: {
        sm: "gap-1.5",
        md: "gap-2",
        lg: "gap-3",
      },
    },
    defaultVariants: {
      align: "left",
      size: "md",
    },
  }
)

const actionButtonVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border transition-colors font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
        primary: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
        secondary: "border-secondary/20 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        outline: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "px-2.5 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface ActionItem {
  /** Unique identifier for the action */
  id: string
  /** Display label */
  label: string
  /** Optional icon element */
  icon?: React.ReactNode
  /** Button variant */
  variant?: VariantProps<typeof actionButtonVariants>['variant']
  /** Whether the action is disabled */
  disabled?: boolean
}

export interface InlineActionRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inlineActionRowVariants> {
  /** Array of action items to display */
  actions: ActionItem[]
  /** Callback when an action is clicked */
  onAction: (actionId: string) => void
  /** Size of the action buttons */
  buttonSize?: VariantProps<typeof actionButtonVariants>['size']
}

const InlineActionRow = React.forwardRef<HTMLDivElement, InlineActionRowProps>(
  ({ className, align, size, actions, onAction, buttonSize = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn(inlineActionRowVariants({ align, size }), className)}
        {...props}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id)}
            disabled={action.disabled}
            className={cn(
              actionButtonVariants({
                variant: action.variant || "default",
                size: buttonSize,
              }),
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            {action.icon && (
              <span className="flex-shrink-0">{action.icon}</span>
            )}
            {action.label}
          </button>
        ))}
      </div>
    )
  }
)
InlineActionRow.displayName = "InlineActionRow"

export { InlineActionRow, inlineActionRowVariants, actionButtonVariants }
