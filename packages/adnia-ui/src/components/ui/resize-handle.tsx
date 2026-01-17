import * as React from "react"
import { cn } from "../../lib/utils"

export interface ResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  direction: "horizontal" | "vertical"
  onResize: (delta: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}

const ResizeHandle = React.forwardRef<HTMLDivElement, ResizeHandleProps>(
  ({ className, direction, onResize, onResizeStart, onResizeEnd, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const startPosRef = React.useRef(0)

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      startPosRef.current = direction === "horizontal" ? e.clientX : e.clientY
      onResizeStart?.()
    }

    React.useEffect(() => {
      if (!isDragging) return

      const handleMouseMove = (e: MouseEvent) => {
        const currentPos = direction === "horizontal" ? e.clientX : e.clientY
        const delta = currentPos - startPosRef.current
        startPosRef.current = currentPos
        onResize(delta)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        onResizeEnd?.()
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }, [isDragging, direction, onResize, onResizeEnd])

    const handleDoubleClick = () => {
      // Signal to reset - parent should handle this
      onResize(0)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex-shrink-0 bg-transparent transition-colors hover:bg-primary/20",
          direction === "horizontal"
            ? "w-1 cursor-col-resize hover:w-1"
            : "h-1 cursor-row-resize hover:h-1",
          isDragging && "bg-primary/30",
          className
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        {...props}
      />
    )
  }
)
ResizeHandle.displayName = "ResizeHandle"

export { ResizeHandle }
