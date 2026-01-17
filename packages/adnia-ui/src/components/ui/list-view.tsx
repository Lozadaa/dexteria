import * as React from "react"
import { cn } from "../../lib/utils"

export interface ListViewProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: T[]
  renderItem: (item: T, selected: boolean, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
  selected?: string | string[]
  onSelect?: (id: string | string[]) => void
  multiSelect?: boolean
  onItemClick?: (item: T) => void
  onItemDoubleClick?: (item: T) => void
  emptyState?: React.ReactNode
}

function ListViewInner<T>(
  {
    className,
    items,
    renderItem,
    keyExtractor,
    selected,
    onSelect,
    multiSelect = false,
    onItemClick,
    onItemDoubleClick,
    emptyState,
    ...props
  }: ListViewProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedSet = React.useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(Array.isArray(selected) ? selected : [selected])
  }, [selected])

  const isSelected = (item: T) => selectedSet.has(keyExtractor(item))

  const handleSelect = (item: T, e: React.MouseEvent) => {
    if (!onSelect) return

    const key = keyExtractor(item)

    if (multiSelect) {
      const newSelected = new Set(selectedSet)

      if (e.shiftKey && focusedIndex >= 0) {
        // Range selection
        const currentIndex = items.findIndex((i) => keyExtractor(i) === key)
        const start = Math.min(focusedIndex, currentIndex)
        const end = Math.max(focusedIndex, currentIndex)

        for (let i = start; i <= end; i++) {
          newSelected.add(keyExtractor(items[i]))
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        if (newSelected.has(key)) {
          newSelected.delete(key)
        } else {
          newSelected.add(key)
        }
      } else {
        // Single selection
        newSelected.clear()
        newSelected.add(key)
      }

      onSelect(Array.from(newSelected))
    } else {
      onSelect(key)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (items.length === 0) return

    let newIndex = focusedIndex

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        newIndex = Math.min(focusedIndex + 1, items.length - 1)
        break
      case "ArrowUp":
        e.preventDefault()
        newIndex = Math.max(focusedIndex - 1, 0)
        break
      case "Home":
        e.preventDefault()
        newIndex = 0
        break
      case "End":
        e.preventDefault()
        newIndex = items.length - 1
        break
      case "Enter":
      case " ":
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          const item = items[focusedIndex]
          if (onSelect) {
            onSelect(keyExtractor(item))
          }
          onItemClick?.(item)
        }
        return
      default:
        return
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex)

      // Select on keyboard navigation if not multi-select
      if (!multiSelect && onSelect) {
        onSelect(keyExtractor(items[newIndex]))
      }
    }
  }

  if (items.length === 0 && emptyState) {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {emptyState}
      </div>
    )
  }

  return (
    <div
      ref={(node) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      role="listbox"
      tabIndex={0}
      aria-multiselectable={multiSelect}
      onKeyDown={handleKeyDown}
      className={cn("outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md", className)}
      {...props}
    >
      {items.map((item, index) => {
        const key = keyExtractor(item)
        const itemSelected = isSelected(item)

        return (
          <div
            key={key}
            role="option"
            aria-selected={itemSelected}
            onClick={(e) => {
              setFocusedIndex(index)
              handleSelect(item, e)
              onItemClick?.(item)
            }}
            onDoubleClick={() => onItemDoubleClick?.(item)}
            className={cn(
              "cursor-pointer",
              focusedIndex === index && "ring-1 ring-inset ring-ring"
            )}
          >
            {renderItem(item, itemSelected, index)}
          </div>
        )
      })}
    </div>
  )
}

const ListView = React.forwardRef(ListViewInner) as <T>(
  props: ListViewProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement

export { ListView }
