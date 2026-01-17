import * as React from "react"
import { cn } from "../../lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const alertBannerVariants = cva(
  "flex items-start gap-3 p-4 rounded-lg border",
  {
    variants: {
      variant: {
        default: "bg-muted border-border text-foreground",
        info: "bg-blue-600 border-blue-700 text-white dark:bg-blue-700 dark:border-blue-600",
        success: "bg-green-600 border-green-700 text-white dark:bg-green-700 dark:border-green-600",
        warning: "bg-amber-500 border-amber-600 text-white dark:bg-amber-600 dark:border-amber-500",
        error: "bg-red-600 border-red-700 text-white dark:bg-red-700 dark:border-red-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface AlertBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertBannerVariants> {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
  onDismiss?: () => void
}

const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  ({ className, variant, icon, title, description, action, onDismiss, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(alertBannerVariants({ variant }), className)}
      role="alert"
      {...props}
    >
      {icon && (
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold text-sm mb-0.5">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm opacity-90">
            {description}
          </div>
        )}
        {children}
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
)
AlertBanner.displayName = "AlertBanner"

export { AlertBanner, alertBannerVariants }
export type { AlertBannerProps }
