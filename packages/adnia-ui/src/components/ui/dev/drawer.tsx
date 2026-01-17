import * as React from "react"
import { cn } from "../../../lib/utils"

export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Is drawer open */
  open: boolean
  /** Open change handler */
  onOpenChange: (open: boolean) => void
  /** Drawer side */
  side?: "left" | "right" | "top" | "bottom"
  /** Drawer size */
  size?: number | string
  /** Show modal overlay */
  modal?: boolean
  /** Close on overlay click */
  closeOnOverlayClick?: boolean
  /** Close on escape */
  closeOnEscape?: boolean
  /** Show close button */
  showCloseButton?: boolean
}

const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  (
    {
      className,
      open,
      onOpenChange,
      side = "right",
      size = 320,
      modal = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      children,
      ...props
    },
    ref
  ) => {
    // Handle escape key
    React.useEffect(() => {
      if (!closeOnEscape || !open) return

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onOpenChange(false)
        }
      }

      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }, [open, closeOnEscape, onOpenChange])

    // Lock body scroll when modal is open
    React.useEffect(() => {
      if (modal && open) {
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
          document.body.style.overflow = originalOverflow
        }
      }
    }, [modal, open])

    const sideStyles: Record<typeof side, string> = {
      left: "left-0 top-0 bottom-0",
      right: "right-0 top-0 bottom-0",
      top: "top-0 left-0 right-0",
      bottom: "bottom-0 left-0 right-0",
    }

    const translateStyles: Record<typeof side, string> = {
      left: open ? "translate-x-0" : "-translate-x-full",
      right: open ? "translate-x-0" : "translate-x-full",
      top: open ? "translate-y-0" : "-translate-y-full",
      bottom: open ? "translate-y-0" : "translate-y-full",
    }

    const sizeStyle =
      side === "left" || side === "right"
        ? { width: typeof size === "number" ? `${size}px` : size }
        : { height: typeof size === "number" ? `${size}px` : size }

    // Handle overlay click
    const handleOverlayClick = React.useCallback(() => {
      if (closeOnOverlayClick) {
        onOpenChange(false)
      }
    }, [closeOnOverlayClick, onOpenChange])

    if (!open && !modal) {
      return null
    }

    return (
      <>
        {/* Overlay */}
        {modal && (
          <div
            className={cn(
              "drawer-overlay fixed inset-0 z-40 bg-black/50 transition-opacity",
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={handleOverlayClick}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          ref={ref}
          className={cn(
            "drawer fixed z-50 bg-background border-border shadow-lg",
            "transition-transform duration-300 ease-out",
            sideStyles[side],
            translateStyles[side],
            (side === "left" || side === "right") && "border-x",
            (side === "top" || side === "bottom") && "border-y",
            className
          )}
          style={sizeStyle}
          role="dialog"
          aria-modal={modal}
          {...props}
        >
          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={() => onOpenChange(false)}
              className={cn(
                "absolute z-10 p-1.5 rounded-sm cursor-pointer",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                "transition-colors",
                side === "left" && "top-2 right-2",
                side === "right" && "top-2 left-2",
                side === "top" && "bottom-2 right-2",
                side === "bottom" && "top-2 right-2"
              )}
              aria-label="Close drawer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div className="drawer-content h-full overflow-auto">{children}</div>
        </div>
      </>
    )
  }
)
Drawer.displayName = "Drawer"

// Drawer Header
interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("drawer-header px-4 py-3 border-b border-border", className)}
      {...props}
    />
  )
)
DrawerHeader.displayName = "DrawerHeader"

// Drawer Title
interface DrawerTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const DrawerTitle = React.forwardRef<HTMLHeadingElement, DrawerTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
)
DrawerTitle.displayName = "DrawerTitle"

// Drawer Description
interface DrawerDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const DrawerDescription = React.forwardRef<HTMLParagraphElement, DrawerDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
DrawerDescription.displayName = "DrawerDescription"

// Drawer Body
interface DrawerBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("drawer-body flex-1 overflow-auto p-4", className)}
      {...props}
    />
  )
)
DrawerBody.displayName = "DrawerBody"

// Drawer Footer
interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "drawer-footer flex items-center justify-end gap-2 px-4 py-3 border-t border-border",
        className
      )}
      {...props}
    />
  )
)
DrawerFooter.displayName = "DrawerFooter"

export {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
}
