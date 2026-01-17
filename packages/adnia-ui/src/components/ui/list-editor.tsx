import * as React from "react"
import { cn } from "../../lib/utils"
import { X, Plus, GripVertical } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"

export interface ListEditorProps {
  /** Current items */
  value: string[]
  /** Called when items change */
  onChange: (items: string[]) => void
  /** Placeholder for new item input */
  placeholder?: string
  /** Label for add button */
  addLabel?: string
  /** Maximum number of items */
  maxItems?: number
  /** Whether items can be reordered (drag and drop) */
  sortable?: boolean
  /** Size variant */
  size?: "sm" | "default" | "lg"
  /** Additional class name */
  className?: string
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Custom render for each item */
  renderItem?: (item: string, index: number) => React.ReactNode
}

const ListEditor = React.forwardRef<HTMLDivElement, ListEditorProps>(
  (
    {
      value = [],
      onChange,
      placeholder = "Add item...",
      addLabel = "Add",
      maxItems,
      sortable = false,
      size = "default",
      className,
      disabled,
      renderItem,
    },
    ref
  ) => {
    const [newItem, setNewItem] = React.useState("")
    const [dragIndex, setDragIndex] = React.useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

    const canAdd = !maxItems || value.length < maxItems

    const addItem = () => {
      const trimmed = newItem.trim()
      if (trimmed && canAdd) {
        onChange([...value, trimmed])
        setNewItem("")
      }
    }

    const removeItem = (index: number) => {
      if (disabled) return
      onChange(value.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, newValue: string) => {
      if (disabled) return
      const updated = [...value]
      updated[index] = newValue
      onChange(updated)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        addItem()
      }
    }

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
      if (!sortable || disabled) return
      setDragIndex(index)
      e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
      if (!sortable || disabled || dragIndex === null) return
      e.preventDefault()
      setDragOverIndex(index)
    }

    const handleDragEnd = () => {
      if (!sortable || disabled || dragIndex === null || dragOverIndex === null) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }

      if (dragIndex !== dragOverIndex) {
        const items = [...value]
        const [removed] = items.splice(dragIndex, 1)
        items.splice(dragOverIndex, 0, removed)
        onChange(items)
      }

      setDragIndex(null)
      setDragOverIndex(null)
    }

    const sizeClasses = {
      sm: "text-xs gap-1.5",
      default: "text-sm gap-2",
      lg: "text-base gap-2.5",
    }

    const inputSizeClasses = {
      sm: "h-7 text-xs",
      default: "h-9 text-sm",
      lg: "h-11 text-base",
    }

    return (
      <div
        ref={ref}
        className={cn("list-editor", sizeClasses[size], className)}
      >
        {/* Items list */}
        {value.length > 0 && (
          <ul className="list-editor__items space-y-1.5">
            {value.map((item, index) => (
              <li
                key={index}
                className={cn(
                  "list-editor__item flex items-center gap-2",
                  sortable && "cursor-move",
                  dragIndex === index && "opacity-50",
                  dragOverIndex === index && dragIndex !== index && "border-t-2 border-primary"
                )}
                draggable={sortable && !disabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                {sortable && !disabled && (
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {renderItem ? (
                  renderItem(item, index)
                ) : (
                  <Input
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    disabled={disabled}
                    className={cn("flex-1", inputSizeClasses[size])}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={disabled}
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Remove item"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new item */}
        <div className="list-editor__add flex items-center gap-2 mt-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || !canAdd}
            className={cn("flex-1", inputSizeClasses[size])}
          />
          <Button
            type="button"
            variant="secondary"
            size={size}
            onClick={addItem}
            disabled={disabled || !newItem.trim() || !canAdd}
          >
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        </div>

        {/* Max items indicator */}
        {maxItems && (
          <p className="text-xs text-muted-foreground mt-1">
            {value.length} / {maxItems} items
          </p>
        )}
      </div>
    )
  }
)
ListEditor.displayName = "ListEditor"

export { ListEditor }
