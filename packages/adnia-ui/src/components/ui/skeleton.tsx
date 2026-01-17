import * as React from "react"
import { cn } from "../../lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: number | string
  height?: number | string
  lines?: number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    { className, variant = "rectangular", width, height, lines = 1, ...props },
    ref
  ) => {
    const baseClasses = "animate-pulse bg-muted"

    if (variant === "text" && lines > 1) {
      return (
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                baseClasses,
                "h-4 rounded",
                i === lines - 1 && "w-3/4" // Last line shorter
              )}
              style={{
                width: i === lines - 1 ? "75%" : width,
                height,
              }}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variant === "circular" && "rounded-full",
          variant === "text" && "h-4 rounded",
          variant === "rectangular" && "rounded-md",
          className
        )}
        style={{
          width: width || (variant === "circular" ? 40 : "100%"),
          height: height || (variant === "circular" ? 40 : variant === "text" ? 16 : 100),
        }}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// Pre-built skeleton patterns
export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-3 rounded-lg border border-border p-4", className)}
        {...props}
      >
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" lines={2} />
      </div>
    )
  }
)
SkeletonCard.displayName = "SkeletonCard"

export interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number
}

const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ className, count = 3, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="70%" />
            </div>
          </div>
        ))}
      </div>
    )
  }
)
SkeletonList.displayName = "SkeletonList"

export { Skeleton, SkeletonCard, SkeletonList }
