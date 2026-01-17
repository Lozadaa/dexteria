import * as React from "react"
import { cn } from "../../lib/utils"
import { ResizeHandle } from "./resize-handle"

export interface SplitViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: [React.ReactNode, React.ReactNode]
  direction?: "horizontal" | "vertical"
  defaultSizes?: [number, number]
  minSizes?: [number, number]
  maxSizes?: [number, number]
  onResize?: (sizes: [number, number]) => void
}

const SplitView = React.forwardRef<HTMLDivElement, SplitViewProps>(
  (
    {
      className,
      children,
      direction = "horizontal",
      defaultSizes = [50, 50],
      minSizes = [10, 10],
      maxSizes = [90, 90],
      onResize,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [sizes, setSizes] = React.useState<[number, number]>(defaultSizes)

    const handleResize = (delta: number) => {
      const container = containerRef.current
      if (!container) return

      const containerSize =
        direction === "horizontal" ? container.offsetWidth : container.offsetHeight

      const deltaPercent = (delta / containerSize) * 100

      setSizes(([first, second]) => {
        let newFirst = first + deltaPercent
        let newSecond = second - deltaPercent

        // Apply constraints
        if (newFirst < minSizes[0]) {
          newFirst = minSizes[0]
          newSecond = 100 - newFirst
        }
        if (newSecond < minSizes[1]) {
          newSecond = minSizes[1]
          newFirst = 100 - newSecond
        }
        if (newFirst > maxSizes[0]) {
          newFirst = maxSizes[0]
          newSecond = 100 - newFirst
        }
        if (newSecond > maxSizes[1]) {
          newSecond = maxSizes[1]
          newFirst = 100 - newSecond
        }

        const newSizes: [number, number] = [newFirst, newSecond]
        onResize?.(newSizes)
        return newSizes
      })
    }

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        className={cn(
          "flex",
          direction === "horizontal" ? "flex-row" : "flex-col",
          className
        )}
        {...props}
      >
        <div
          className="overflow-auto"
          style={{
            [direction === "horizontal" ? "width" : "height"]: `${sizes[0]}%`,
          }}
        >
          {children[0]}
        </div>
        <ResizeHandle direction={direction} onResize={handleResize} />
        <div
          className="overflow-auto"
          style={{
            [direction === "horizontal" ? "width" : "height"]: `${sizes[1]}%`,
          }}
        >
          {children[1]}
        </div>
      </div>
    )
  }
)
SplitView.displayName = "SplitView"

export { SplitView }
