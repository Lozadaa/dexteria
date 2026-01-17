import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-green-600 text-white",
        warning: "bg-amber-500 text-white",
        error: "bg-red-600 text-white",
        outline: "border border-border text-foreground",
      },
      size: {
        sm: "h-4 min-w-4 px-1 text-[10px]",
        md: "h-5 min-w-5 px-1.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeVariantProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

const BadgeVariant = React.forwardRef<HTMLSpanElement, BadgeVariantProps>(
  ({ className, variant, size, dot, children, ...props }, ref) => {
    if (dot) {
      return (
        <span
          ref={ref}
          className={cn(
            "inline-flex h-2 w-2 rounded-full",
            variant === "default" && "bg-primary",
            variant === "secondary" && "bg-secondary",
            variant === "success" && "bg-green-600",
            variant === "warning" && "bg-amber-500",
            variant === "error" && "bg-red-600",
            variant === "outline" && "border border-current",
            className
          )}
          {...props}
        />
      )
    }

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)
BadgeVariant.displayName = "BadgeVariant"

// Notification badge wrapper (shows count on top-right of children)
export interface NotificationBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  count: number
  max?: number
  showZero?: boolean
  variant?: VariantProps<typeof badgeVariants>["variant"]
}

const NotificationBadge = React.forwardRef<HTMLDivElement, NotificationBadgeProps>(
  (
    { className, children, count, max = 99, showZero = false, variant = "error", ...props },
    ref
  ) => {
    const displayCount = count > max ? `${max}+` : count

    if (count === 0 && !showZero) {
      return <div ref={ref} className={className} {...props}>{children}</div>
    }

    return (
      <div ref={ref} className={cn("relative inline-flex", className)} {...props}>
        {children}
        <BadgeVariant
          variant={variant}
          size="sm"
          className="absolute -right-1 -top-1"
        >
          {displayCount}
        </BadgeVariant>
      </div>
    )
  }
)
NotificationBadge.displayName = "NotificationBadge"

export { BadgeVariant, NotificationBadge }
