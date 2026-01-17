import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const bannerVariants = cva(
  "flex items-center justify-between gap-4 px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        info: "bg-blue-600 text-white dark:bg-blue-700",
        success: "bg-green-600 text-white dark:bg-green-700",
        warning: "bg-amber-500 text-white dark:bg-amber-600",
        error: "bg-red-600 text-white dark:bg-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  icon?: React.ReactNode
  action?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  sticky?: boolean
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      className,
      children,
      variant,
      icon,
      action,
      dismissible,
      onDismiss,
      sticky = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="banner"
        className={cn(
          bannerVariants({ variant }),
          sticky && "sticky top-0 z-40",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <div className="flex-1">{children}</div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {dismissible && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
)
Banner.displayName = "Banner"

export { Banner, bannerVariants }
