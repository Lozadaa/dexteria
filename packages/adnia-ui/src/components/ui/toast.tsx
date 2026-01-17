import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "bg-background border-border text-foreground",
        success: "bg-green-600 border-green-700 text-white dark:bg-green-700 dark:border-green-600",
        error: "bg-red-600 border-red-700 text-white dark:bg-red-700 dark:border-red-600",
        warning: "bg-amber-500 border-amber-600 text-white dark:bg-amber-600 dark:border-amber-500",
        info: "bg-blue-600 border-blue-700 text-white dark:bg-blue-700 dark:border-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, action, onDismiss, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {description && (
            <div className="mt-1 text-sm opacity-90">{description}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="text-sm font-medium underline-offset-4 hover:underline cursor-pointer"
            >
              {action.label}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
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
Toast.displayName = "Toast"

// Toast Container and Context
type ToastType = {
  id: string
  title: string
  description?: string
  variant?: VariantProps<typeof toastVariants>["variant"]
  duration?: number
  action?: { label: string; onClick: () => void }
}

type ToastContextType = {
  toasts: ToastType[]
  toast: (props: Omit<ToastType, "id">) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export interface ToastProviderProps {
  children: React.ReactNode
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"
  maxToasts?: number
}

export function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastType[]>([])

  const toast = React.useCallback((props: Omit<ToastType, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = props.duration ?? 5000

    setToasts((prev) => {
      const next = [...prev, { ...props, id }]
      return next.slice(-maxToasts)
    })

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }

    return id
  }, [maxToasts])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = React.useCallback(() => {
    setToasts([])
  }, [])

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <div
        className={cn(
          "fixed z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none",
          positionClasses[position]
        )}
      >
        {toasts.map((t) => (
          <Toast
            key={t.id}
            title={t.title}
            description={t.description}
            variant={t.variant}
            action={t.action}
            onDismiss={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export { Toast, toastVariants }
