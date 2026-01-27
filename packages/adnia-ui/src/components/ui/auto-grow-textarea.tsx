import * as React from "react"
import { cn } from "../../lib/utils"

export interface AutoGrowTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
  /** Minimum number of rows */
  minRows?: number
  /** Maximum number of rows before scrolling */
  maxRows?: number
  /** Callback when Enter is pressed without Shift */
  onSubmit?: (value: string) => void
}

const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ className, minRows = 1, maxRows = 8, onSubmit, onChange, onKeyDown, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const combinedRef = React.useMemo(() => {
      return (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }
    }, [ref])

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'

      // Calculate line height from computed styles
      const computedStyle = window.getComputedStyle(textarea)
      const lineHeight = parseFloat(computedStyle.lineHeight) || 20
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0
      const borderTop = parseFloat(computedStyle.borderTopWidth) || 0
      const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0

      // Calculate min and max heights
      const minHeight = lineHeight * minRows + paddingTop + paddingBottom + borderTop + borderBottom
      const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom + borderTop + borderBottom

      // Set height based on content, clamped between min and max
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }, [minRows, maxRows])

    // Adjust height when value changes
    React.useEffect(() => {
      adjustHeight()
    }, [props.value, adjustHeight])

    // Adjust height on mount
    React.useEffect(() => {
      adjustHeight()
    }, [adjustHeight])

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e)
        adjustHeight()
      },
      [onChange, adjustHeight]
    )

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle Enter without Shift for submit
        if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
          e.preventDefault()
          const value = textareaRef.current?.value.trim()
          if (value) {
            onSubmit(value)
          }
          return
        }
        onKeyDown?.(e)
      },
      [onKeyDown, onSubmit]
    )

    return (
      <textarea
        ref={combinedRef}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none overflow-y-auto",
          className
        )}
        rows={minRows}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
AutoGrowTextarea.displayName = "AutoGrowTextarea"

export { AutoGrowTextarea }
