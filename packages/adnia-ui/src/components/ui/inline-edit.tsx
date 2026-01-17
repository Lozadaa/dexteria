import * as React from "react"
import { cn } from "../../lib/utils"

export interface InlineEditProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string
  onChange: (value: string) => void
  onCancel?: () => void
  placeholder?: string
  disabled?: boolean
  selectOnFocus?: boolean
  submitOnBlur?: boolean
  submitOnEnter?: boolean
  cancelOnEscape?: boolean
}

const InlineEdit = React.forwardRef<HTMLDivElement, InlineEditProps>(
  (
    {
      className,
      value,
      onChange,
      onCancel,
      placeholder = "Click to edit...",
      disabled = false,
      selectOnFocus = true,
      submitOnBlur = true,
      submitOnEnter = true,
      cancelOnEscape = true,
      ...props
    },
    ref
  ) => {
    const [isEditing, setIsEditing] = React.useState(false)
    const [editValue, setEditValue] = React.useState(value)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Sync external value changes
    React.useEffect(() => {
      if (!isEditing) {
        setEditValue(value)
      }
    }, [value, isEditing])

    const startEditing = () => {
      if (disabled) return
      setIsEditing(true)
      setEditValue(value)
    }

    const submitEdit = () => {
      if (editValue !== value) {
        onChange(editValue)
      }
      setIsEditing(false)
    }

    const cancelEdit = () => {
      setEditValue(value)
      setIsEditing(false)
      onCancel?.()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && submitOnEnter) {
        e.preventDefault()
        submitEdit()
      } else if (e.key === "Escape" && cancelOnEscape) {
        e.preventDefault()
        cancelEdit()
      }
    }

    const handleBlur = () => {
      if (submitOnBlur) {
        submitEdit()
      } else {
        cancelEdit()
      }
    }

    // Focus input when editing starts
    React.useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus()
        if (selectOnFocus) {
          inputRef.current.select()
        }
      }
    }, [isEditing, selectOnFocus])

    if (isEditing) {
      return (
        <div ref={ref} className={cn("inline-block", className)} {...props}>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(
              "w-full bg-transparent text-inherit outline-none",
              "border-b border-primary focus:border-primary"
            )}
          />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-block cursor-text",
          "hover:bg-muted/50 rounded px-1 -mx-1",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        onClick={startEditing}
        onKeyDown={(e) => e.key === "Enter" && startEditing()}
        tabIndex={disabled ? -1 : 0}
        role="button"
        {...props}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
    )
  }
)
InlineEdit.displayName = "InlineEdit"

export { InlineEdit }
