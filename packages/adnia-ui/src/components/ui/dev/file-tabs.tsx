import * as React from "react"
import { cn } from "../../../lib/utils"

export interface FileTab {
  id: string
  name: string
  path?: string
  icon?: React.ReactNode
  isDirty?: boolean
  isPinned?: boolean
  isPreview?: boolean
}

export interface FileTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onContextMenu"> {
  /** Tab items */
  tabs: FileTab[]
  /** Active tab ID */
  activeTab?: string
  /** Tab select handler */
  onTabSelect?: (id: string) => void
  /** Tab close handler */
  onTabClose?: (id: string) => void
  /** Close other tabs handler */
  onTabCloseOthers?: (id: string) => void
  /** Close all tabs handler */
  onTabCloseAll?: () => void
  /** Tab reorder handler */
  onTabReorder?: (fromIndex: number, toIndex: number) => void
  /** Tab pin handler */
  onTabPin?: (id: string) => void
  /** Context menu handler */
  onContextMenu?: (id: string, event: React.MouseEvent) => void
  /** Max visible tabs */
  maxTabs?: number
  /** Show close button */
  showCloseButton?: boolean
  /** Allow drag reorder */
  allowReorder?: boolean
}

// Default file icon
const DefaultFileIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-3.5 w-3.5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

// Close icon
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-3 w-3", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// Pin icon
const PinIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-3 w-3", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
)

const FileTabs = React.forwardRef<HTMLDivElement, FileTabsProps>(
  (
    {
      className,
      tabs,
      activeTab,
      onTabSelect,
      onTabClose,
      onTabCloseOthers,
      onTabCloseAll,
      onTabReorder,
      onTabPin,
      onContextMenu,
      maxTabs,
      showCloseButton = true,
      allowReorder = true,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

    // Visible tabs (pinned first, then limited if maxTabs)
    const visibleTabs = React.useMemo(() => {
      const pinned = tabs.filter((t) => t.isPinned)
      const unpinned = tabs.filter((t) => !t.isPinned)

      if (maxTabs && unpinned.length > maxTabs - pinned.length) {
        return [...pinned, ...unpinned.slice(0, maxTabs - pinned.length)]
      }

      return [...pinned, ...unpinned]
    }, [tabs, maxTabs])

    // Hidden tabs count
    const hiddenCount = tabs.length - visibleTabs.length

    // Handle drag start
    const handleDragStart = React.useCallback(
      (e: React.DragEvent, index: number) => {
        if (!allowReorder) return
        e.dataTransfer.effectAllowed = "move"
        setDraggedIndex(index)
      },
      [allowReorder]
    )

    // Handle drag over
    const handleDragOver = React.useCallback(
      (e: React.DragEvent, index: number) => {
        if (!allowReorder || draggedIndex === null) return
        e.preventDefault()
        setDragOverIndex(index)
      },
      [allowReorder, draggedIndex]
    )

    // Handle drop
    const handleDrop = React.useCallback(
      (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedIndex !== null && draggedIndex !== index) {
          onTabReorder?.(draggedIndex, index)
        }
        setDraggedIndex(null)
        setDragOverIndex(null)
      },
      [draggedIndex, onTabReorder]
    )

    // Handle drag end
    const handleDragEnd = React.useCallback(() => {
      setDraggedIndex(null)
      setDragOverIndex(null)
    }, [])

    // Handle close click
    const handleClose = React.useCallback(
      (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        onTabClose?.(id)
      },
      [onTabClose]
    )

    // Handle middle click close
    const handleMiddleClick = React.useCallback(
      (e: React.MouseEvent, id: string) => {
        if (e.button === 1) {
          e.preventDefault()
          onTabClose?.(id)
        }
      },
      [onTabClose]
    )

    // Handle context menu
    const handleContextMenu = React.useCallback(
      (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        onContextMenu?.(id, e)
      },
      [onContextMenu]
    )

    return (
      <div
        ref={ref}
        className={cn(
          "file-tabs flex items-stretch overflow-x-auto",
          "border-b border-border bg-muted/30",
          "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
          className
        )}
        {...props}
      >
        {visibleTabs.map((tab, index) => {
          const isActive = tab.id === activeTab
          const isDragging = draggedIndex === index
          const isDragOver = dragOverIndex === index && draggedIndex !== index

          return (
            <div
              key={tab.id}
              ref={containerRef}
              draggable={allowReorder && !tab.isPinned}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onTabSelect?.(tab.id)}
              onMouseDown={(e) => handleMiddleClick(e, tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className={cn(
                "file-tab group relative flex items-center gap-1.5 px-3 py-1.5",
                "text-sm cursor-pointer select-none transition-colors",
                "border-r border-border/50",
                isActive
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                isDragging && "opacity-50",
                isDragOver && "bg-accent/50",
                tab.isPreview && "italic"
              )}
            >
              {/* Pin indicator */}
              {tab.isPinned && (
                <span
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTabPin?.(tab.id)
                  }}
                >
                  <PinIcon />
                </span>
              )}

              {/* Icon */}
              {tab.icon || <DefaultFileIcon className="text-muted-foreground" />}

              {/* Name */}
              <span className="truncate max-w-[120px]">{tab.name}</span>

              {/* Dirty indicator */}
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}

              {/* Close button */}
              {showCloseButton && !tab.isPinned && (
                <button
                  onClick={(e) => handleClose(e, tab.id)}
                  className={cn(
                    "shrink-0 p-0.5 rounded transition-colors cursor-pointer",
                    "hover:bg-muted",
                    "opacity-0 group-hover:opacity-100",
                    tab.isDirty && "opacity-100"
                  )}
                >
                  {tab.isDirty ? (
                    <span className="w-2 h-2 rounded-full bg-primary block" />
                  ) : (
                    <CloseIcon />
                  )}
                </button>
              )}

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </div>
          )
        })}

        {/* Hidden tabs indicator */}
        {hiddenCount > 0 && (
          <div className="flex items-center px-2 text-xs text-muted-foreground">
            +{hiddenCount} more
          </div>
        )}

        {/* Actions */}
        {onTabCloseAll && tabs.length > 0 && (
          <button
            onClick={onTabCloseAll}
            className="ml-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Close all"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
)
FileTabs.displayName = "FileTabs"

export { FileTabs }
