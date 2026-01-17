import * as React from "react"
import { cn } from "../../lib/utils"

// Detect platform
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

// Key symbol mappings
const keySymbols: Record<string, string> = {
  mod: isMac ? '⌘' : 'Ctrl',
  ctrl: isMac ? '⌃' : 'Ctrl',
  alt: isMac ? '⌥' : 'Alt',
  shift: '⇧',
  enter: '↵',
  backspace: '⌫',
  delete: '⌦',
  escape: 'Esc',
  esc: 'Esc',
  tab: '⇥',
  space: '␣',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  pageup: 'PgUp',
  pagedown: 'PgDn',
  home: 'Home',
  end: 'End',
}

function formatKey(key: string): string {
  const lower = key.toLowerCase()
  return keySymbols[lower] || key.toUpperCase()
}

function parseShortcut(shortcut: string): string[] {
  return shortcut
    .split(/[\s+]+/)
    .filter(Boolean)
    .map(formatKey)
}

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** The keyboard shortcut to display (e.g., "mod+k", "ctrl+shift+p") */
  children: string
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    const keys = parseShortcut(children)

    return (
      <kbd
        ref={ref}
        className={cn(
          "inline-flex items-center gap-0.5 font-mono text-[10px] font-medium text-muted-foreground",
          className
        )}
        {...props}
      >
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1">
              {key}
            </span>
          </React.Fragment>
        ))}
      </kbd>
    )
  }
)
Kbd.displayName = "Kbd"

export { Kbd }
