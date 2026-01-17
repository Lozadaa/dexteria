import * as React from "react"
import { cn } from "../../lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: string
    positive: boolean
  }
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, icon, trend, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex flex-col gap-1",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-2">
          {icon}
        </div>
      )}
      <div className="text-2xl font-bold text-foreground leading-tight">
        {value}
      </div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      {trend && (
        <div
          className={cn(
            "text-xs font-medium mt-1",
            trend.positive ? "text-green-600" : "text-red-600"
          )}
        >
          {trend.value}
        </div>
      )}
    </div>
  )
)
StatCard.displayName = "StatCard"

export { StatCard }
export type { StatCardProps }
