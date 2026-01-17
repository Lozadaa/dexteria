import * as React from "react"
import { cn } from "../../../lib/utils"

export interface SplitPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Split direction */
  direction?: "horizontal" | "vertical"
  /** Initial sizes as percentages (should sum to 100) */
  defaultSizes?: number[]
  /** Minimum sizes in pixels */
  minSizes?: number[]
  /** Maximum sizes in pixels */
  maxSizes?: number[]
  /** Size change handler */
  onResize?: (sizes: number[]) => void
  /** Allow collapsing panels */
  collapsible?: boolean | boolean[]
  /** Collapse handler */
  onCollapse?: (index: number) => void
  /** Snap threshold in pixels */
  snapThreshold?: number
  /** Children panels */
  children: React.ReactNode[]
}

const SplitPane = React.forwardRef<HTMLDivElement, SplitPaneProps>(
  (
    {
      className,
      direction = "horizontal",
      defaultSizes,
      minSizes = [],
      maxSizes = [],
      onResize,
      collapsible = false,
      onCollapse,
      snapThreshold = 30,
      children,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const childCount = React.Children.count(children)

    // Initialize sizes
    const initialSizes = defaultSizes || Array(childCount).fill(100 / childCount)
    const [sizes, setSizes] = React.useState<number[]>(initialSizes)
    const [collapsedPanels] = React.useState<Set<number>>(new Set())
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragIndex, setDragIndex] = React.useState<number | null>(null)

    // Merge ref
    React.useImperativeHandle(ref, () => containerRef.current!)

    // Get container dimension
    const getContainerSize = React.useCallback(() => {
      if (!containerRef.current) return 0
      return direction === "horizontal"
        ? containerRef.current.offsetWidth
        : containerRef.current.offsetHeight
    }, [direction])

    // Convert percentage to pixels
    const toPixels = React.useCallback(
      (percentage: number) => {
        return (percentage / 100) * getContainerSize()
      },
      [getContainerSize]
    )

    // Convert pixels to percentage
    const toPercentage = React.useCallback(
      (pixels: number) => {
        const containerSize = getContainerSize()
        return containerSize > 0 ? (pixels / containerSize) * 100 : 0
      },
      [getContainerSize]
    )

    // Handle resize start
    const handleResizeStart = React.useCallback(
      (index: number, e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        setIsDragging(true)
        setDragIndex(index)
      },
      []
    )

    // Handle resize move
    const handleResizeMove = React.useCallback(
      (e: MouseEvent | TouchEvent) => {
        if (!isDragging || dragIndex === null || !containerRef.current) return

        const container = containerRef.current
        const rect = container.getBoundingClientRect()

        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

        const position =
          direction === "horizontal" ? clientX - rect.left : clientY - rect.top

        const containerSize = getContainerSize()
        const newSizes = [...sizes]

        // Calculate sizes before and after the divider
        let beforeSize = 0
        for (let i = 0; i < dragIndex; i++) {
          beforeSize += toPixels(sizes[i])
        }

        const dividerPosition = position
        const leftSize = dividerPosition - beforeSize
        const rightSize = toPixels(sizes[dragIndex]) + toPixels(sizes[dragIndex + 1]) - leftSize

        // Apply constraints
        const minLeft = minSizes[dragIndex] || 0
        const maxLeft = maxSizes[dragIndex] || containerSize
        const minRight = minSizes[dragIndex + 1] || 0
        const maxRight = maxSizes[dragIndex + 1] || containerSize

        let constrainedLeft = Math.max(minLeft, Math.min(maxLeft, leftSize))
        let constrainedRight = Math.max(
          minRight,
          Math.min(maxRight, rightSize + leftSize - constrainedLeft)
        )

        // Snap to collapse
        const isLeftCollapsible = Array.isArray(collapsible)
          ? collapsible[dragIndex]
          : collapsible
        const isRightCollapsible = Array.isArray(collapsible)
          ? collapsible[dragIndex + 1]
          : collapsible

        if (isLeftCollapsible && constrainedLeft < snapThreshold) {
          constrainedLeft = 0
          constrainedRight = leftSize + rightSize
        }

        if (isRightCollapsible && constrainedRight < snapThreshold) {
          constrainedRight = 0
          constrainedLeft = leftSize + rightSize
        }

        newSizes[dragIndex] = toPercentage(constrainedLeft)
        newSizes[dragIndex + 1] = toPercentage(constrainedRight)

        setSizes(newSizes)
        onResize?.(newSizes)
      },
      [
        isDragging,
        dragIndex,
        direction,
        sizes,
        minSizes,
        maxSizes,
        collapsible,
        snapThreshold,
        getContainerSize,
        toPixels,
        toPercentage,
        onResize,
      ]
    )

    // Handle resize end
    const handleResizeEnd = React.useCallback(() => {
      setIsDragging(false)
      setDragIndex(null)
    }, [])

    // Event listeners
    React.useEffect(() => {
      if (isDragging) {
        window.addEventListener("mousemove", handleResizeMove)
        window.addEventListener("mouseup", handleResizeEnd)
        window.addEventListener("touchmove", handleResizeMove)
        window.addEventListener("touchend", handleResizeEnd)
      }

      return () => {
        window.removeEventListener("mousemove", handleResizeMove)
        window.removeEventListener("mouseup", handleResizeEnd)
        window.removeEventListener("touchmove", handleResizeMove)
        window.removeEventListener("touchend", handleResizeEnd)
      }
    }, [isDragging, handleResizeMove, handleResizeEnd])

    const childArray = React.Children.toArray(children)

    return (
      <div
        ref={containerRef}
        className={cn(
          "split-pane flex overflow-hidden",
          direction === "horizontal" ? "flex-row" : "flex-col",
          isDragging && "select-none",
          className
        )}
        {...props}
      >
        {childArray.map((child, index) => {
          const isCollapsed = collapsedPanels.has(index)
          const size = isCollapsed ? 0 : sizes[index]
          const isLast = index === childArray.length - 1

          return (
            <React.Fragment key={index}>
              {/* Panel */}
              <div
                className={cn(
                  "split-pane-panel overflow-auto",
                  isCollapsed && "overflow-hidden"
                )}
                style={{
                  flexBasis: `${size}%`,
                  flexGrow: 0,
                  flexShrink: 0,
                }}
              >
                {child}
              </div>

              {/* Resizer */}
              {!isLast && (
                <div
                  className={cn(
                    "split-pane-resizer shrink-0 relative group",
                    direction === "horizontal"
                      ? "w-1 cursor-col-resize hover:bg-primary/20"
                      : "h-1 cursor-row-resize hover:bg-primary/20",
                    isDragging && dragIndex === index && "bg-primary/30"
                  )}
                  onMouseDown={(e) => handleResizeStart(index, e)}
                  onTouchStart={(e) => handleResizeStart(index, e)}
                  onDoubleClick={() => {
                    // Reset to default on double click
                    const newSizes = [...initialSizes]
                    setSizes(newSizes)
                    onResize?.(newSizes)
                  }}
                >
                  {/* Visual handle */}
                  <div
                    className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      "bg-primary/30"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }
)
SplitPane.displayName = "SplitPane"

export { SplitPane }
