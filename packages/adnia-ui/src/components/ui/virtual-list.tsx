import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "../../lib/utils"

export interface VirtualListProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, "onScroll"> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number | ((index: number) => number)
  overscan?: number
  onScroll?: (scrollTop: number) => void
  scrollToIndex?: number
}

function VirtualListInner<T>(
  {
    className,
    items,
    renderItem,
    itemHeight,
    overscan = 5,
    onScroll,
    scrollToIndex,
    ...props
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof itemHeight === "function" ? itemHeight : () => itemHeight,
    overscan,
  })

  // Scroll to index when specified
  React.useEffect(() => {
    if (scrollToIndex !== undefined && scrollToIndex >= 0 && scrollToIndex < items.length) {
      virtualizer.scrollToIndex(scrollToIndex, { align: "center" })
    }
  }, [scrollToIndex, items.length, virtualizer])

  // Forward scroll events
  React.useEffect(() => {
    const element = parentRef.current
    if (!element || !onScroll) return

    const handleScroll = () => {
      onScroll(element.scrollTop)
    }

    element.addEventListener("scroll", handleScroll)
    return () => element.removeEventListener("scroll", handleScroll)
  }, [onScroll])

  return (
    <div
      ref={(node) => {
        (parentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      className={cn("overflow-auto", className)}
      {...props}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Use generic forwardRef pattern
const VirtualList = React.forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement

export { VirtualList }
