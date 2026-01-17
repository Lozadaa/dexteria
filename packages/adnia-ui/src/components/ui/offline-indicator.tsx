import * as React from "react"
import { cn } from "../../lib/utils"

export interface OfflineIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  online: boolean
  showWhenOnline?: boolean
  position?: "top" | "bottom"
  onlineLabel?: string
  offlineLabel?: string
}

const OfflineIndicator = React.forwardRef<HTMLDivElement, OfflineIndicatorProps>(
  (
    {
      className,
      online,
      showWhenOnline = false,
      position = "bottom",
      onlineLabel = "Back online",
      offlineLabel = "You are offline",
      ...props
    },
    ref
  ) => {
    const [showOnlineMessage, setShowOnlineMessage] = React.useState(false)
    const prevOnline = React.useRef(online)

    // Show "back online" message briefly when connection is restored
    React.useEffect(() => {
      if (!prevOnline.current && online) {
        setShowOnlineMessage(true)
        const timer = setTimeout(() => setShowOnlineMessage(false), 3000)
        return () => clearTimeout(timer)
      }
      prevOnline.current = online
    }, [online])

    // Don't show anything if online and not showing online message
    if (online && !showOnlineMessage && !showWhenOnline) {
      return null
    }

    const isShowingOnline = online && (showOnlineMessage || showWhenOnline)

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          "fixed left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300",
          position === "top" ? "top-0" : "bottom-0",
          isShowingOnline
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white",
          className
        )}
        {...props}
      >
        {/* Status dot */}
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isShowingOnline ? "bg-white animate-pulse" : "bg-white/70"
          )}
        />
        {/* Label */}
        <span>{isShowingOnline ? onlineLabel : offlineLabel}</span>
      </div>
    )
  }
)
OfflineIndicator.displayName = "OfflineIndicator"

// Hook to track online/offline status
export function useOnlineStatus() {
  const [online, setOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )

  React.useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return online
}

export { OfflineIndicator }
