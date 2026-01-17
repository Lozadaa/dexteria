import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

export interface TagInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  /** Current tags */
  value: string[]
  /** Called when tags change */
  onChange: (tags: string[]) => void
  /** Placeholder when no tags */
  placeholder?: string
  /** Maximum number of tags allowed */
  maxTags?: number
  /** Allow duplicates */
  allowDuplicates?: boolean
  /** Keys that trigger tag creation (default: Enter, comma) */
  triggerKeys?: string[]
  /** Variant style */
  variant?: "default" | "outline"
  /** Size */
  size?: "sm" | "default" | "lg"
  /** Tag color variant */
  tagVariant?: "default" | "secondary" | "outline"
}

const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      className,
      value = [],
      onChange,
      placeholder = "Add tag...",
      maxTags,
      allowDuplicates = false,
      triggerKeys = ["Enter", ","],
      variant = "default",
      size = "default",
      tagVariant = "default",
      disabled,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current!)

    const addTag = (tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed) return
      if (maxTags && value.length >= maxTags) return
      if (!allowDuplicates && value.includes(trimmed)) return

      onChange([...value, trimmed])
      setInputValue("")
    }

    const removeTag = (index: number) => {
      if (disabled) return
      onChange(value.filter((_, i) => i !== index))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (triggerKeys.includes(e.key)) {
        e.preventDefault()
        addTag(inputValue)
      } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
        removeTag(value.length - 1)
      }
    }

    const handleContainerClick = () => {
      if (!disabled) {
        inputRef.current?.focus()
      }
    }

    const sizeClasses = {
      sm: "min-h-8 text-xs gap-1 px-2 py-1",
      default: "min-h-10 text-sm gap-1.5 px-3 py-2",
      lg: "min-h-12 text-base gap-2 px-4 py-3",
    }

    const tagSizeClasses = {
      sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
      default: "text-xs px-2 py-1 gap-1",
      lg: "text-sm px-2.5 py-1.5 gap-1.5",
    }

    const tagVariantClasses = {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "border border-border bg-background text-foreground",
    }

    return (
      <div
        className={cn(
          "tag-input flex flex-wrap items-center rounded-md border border-input bg-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          variant === "outline" && "border-2",
          disabled && "cursor-not-allowed opacity-50",
          sizeClasses[size],
          className
        )}
        onClick={handleContainerClick}
      >
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={cn(
              "tag-input__tag inline-flex items-center rounded-md font-medium",
              tagVariantClasses[tagVariant],
              tagSizeClasses[size]
            )}
          >
            {tag}
            <button
              type="button"
              className={cn(
                "tag-input__remove ml-0.5 rounded-sm hover:bg-foreground/20 focus:outline-none",
                disabled && "pointer-events-none"
              )}
              onClick={(e) => {
                e.stopPropagation()
                removeTag(index)
              }}
              disabled={disabled}
              aria-label={`Remove ${tag}`}
            >
              <X className={cn(size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-4 w-4" : "h-3 w-3")} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputValue && addTag(inputValue)}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          className={cn(
            "tag-input__input flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground",
            disabled && "cursor-not-allowed"
          )}
          {...props}
        />
      </div>
    )
  }
)
TagInput.displayName = "TagInput"

export { TagInput }
