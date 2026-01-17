import * as React from "react"
import { cn } from "../../lib/utils"
import { Kbd } from "./kbd"

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string
  onChange: (value: string) => void
  shortcut?: string
  loading?: boolean
  onClear?: () => void
  onSubmit?: () => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      placeholder = "Search...",
      shortcut,
      loading = false,
      onClear,
      onSubmit,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    // Handle keyboard shortcut
    React.useEffect(() => {
      if (!shortcut) return

      const handleKeyDown = (e: KeyboardEvent) => {
        const keys = shortcut.toLowerCase().split("+")
        const key = keys[keys.length - 1]
        const needsMod = keys.includes("mod")

        const modPressed = e.metaKey || e.ctrlKey

        if (e.key.toLowerCase() === key && (needsMod ? modPressed : true)) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }

      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }, [shortcut])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && onSubmit) {
        e.preventDefault()
        onSubmit()
      } else if (e.key === "Escape") {
        inputRef.current?.blur()
      }
    }

    const handleClear = () => {
      onChange("")
      onClear?.()
      inputRef.current?.focus()
    }

    return (
      <div className={cn("relative flex items-center", className)}>
        {/* Search icon */}
        <svg
          className="absolute left-3 h-4 w-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-12 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...props}
        />

        {/* Right side: loading, clear button, or shortcut */}
        <div className="absolute right-2 flex items-center gap-1">
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : shortcut ? (
            <Kbd className="text-muted-foreground">{shortcut}</Kbd>
          ) : null}
        </div>
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
