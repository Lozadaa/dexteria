import * as React from "react"
import { cn } from "../../../lib/utils"

export interface EditorDecoration {
  /** Line number (1-indexed) */
  line: number
  /** Decoration type */
  type: "error" | "warning" | "info" | "highlight"
  /** Message to display */
  message?: string
  /** Custom className for the line */
  className?: string
  /** Column range (optional) */
  startColumn?: number
  endColumn?: number
}

export interface EditorPosition {
  line: number
  column: number
}

export interface EditorRange {
  start: EditorPosition
  end: EditorPosition
}

export interface CodeEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Editor content */
  value: string
  /** Programming language for syntax highlighting */
  language?: string
  /** Change handler */
  onChange?: (value: string) => void
  /** Save handler (Ctrl+S) */
  onSave?: (value: string) => void
  /** Format handler */
  onFormat?: () => void
  /** Run handler */
  onRun?: () => void
  /** Read-only mode */
  readOnly?: boolean
  /** Show line numbers */
  lineNumbers?: boolean
  /** Word wrap */
  wordWrap?: boolean
  /** Show minimap */
  minimap?: boolean
  /** Line decorations */
  decorations?: EditorDecoration[]
  /** Placeholder text */
  placeholder?: string
  /** Tab size */
  tabSize?: number
  /** Use soft tabs (spaces instead of tabs) */
  softTabs?: boolean
  /** Highlight active line */
  highlightActiveLine?: boolean
  /** Custom syntax highlighter */
  highlighter?: (code: string, language: string) => React.ReactNode
  /** Custom editor renderer (for Monaco, CodeMirror integration) */
  renderEditor?: (props: EditorRenderProps) => React.ReactNode
}

export interface EditorRenderProps {
  value: string
  language?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  lineNumbers?: boolean
  wordWrap?: boolean
  minimap?: boolean
  decorations?: EditorDecoration[]
  placeholder?: string
  tabSize?: number
  className?: string
}

export interface DefaultEditorProps extends EditorRenderProps {
  /** Syntax highlighter function */
  highlighter?: (code: string, language: string) => React.ReactNode
}

// Default textarea-based editor (fallback when no custom renderer is provided)
const DefaultEditor = React.forwardRef<HTMLTextAreaElement, DefaultEditorProps>(
  (
    {
      value,
      language = "text",
      onChange,
      readOnly,
      lineNumbers = true,
      placeholder,
      tabSize = 2,
      className,
      highlighter,
    },
    ref
  ) => {
    const lines = value.split("\n")
    const lineCount = lines.length
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const [scrollTop, setScrollTop] = React.useState(0)
    const [scrollLeft, setScrollLeft] = React.useState(0)

    // Forward ref
    React.useImperativeHandle(ref, () => textareaRef.current!)

    // Handle tab key
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab" && !readOnly) {
          e.preventDefault()
          const target = e.currentTarget
          const start = target.selectionStart
          const end = target.selectionEnd
          const spaces = " ".repeat(tabSize)

          const newValue =
            value.substring(0, start) + spaces + value.substring(end)
          onChange?.(newValue)

          // Restore cursor position
          requestAnimationFrame(() => {
            target.selectionStart = target.selectionEnd = start + tabSize
          })
        }
      },
      [value, onChange, readOnly, tabSize]
    )

    // Handle scroll sync
    const handleScroll = React.useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
      const target = e.currentTarget
      setScrollTop(target.scrollTop)
      setScrollLeft(target.scrollLeft)
    }, [])

    return (
      <div className={cn("default-editor flex font-mono text-[13px]", className)}>
        {/* Line numbers */}
        {lineNumbers && (
          <div
            className="line-numbers select-none pr-3 text-right text-muted-foreground/60 border-r border-border mr-3"
            style={{
              minWidth: `${String(lineCount).length + 2}ch`,
              marginTop: -scrollTop,
            }}
          >
            {lines.map((_, i) => (
              <div key={i} className="leading-[1.6]">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Editor container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Highlighted code overlay */}
          {highlighter && (
            <div
              className="highlighted-code absolute inset-0 pointer-events-none overflow-hidden whitespace-pre leading-[1.6]"
              style={{
                fontFamily: "var(--font-family-mono)",
                tabSize,
                transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
              }}
              aria-hidden="true"
            >
              {highlighter(value, language)}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            readOnly={readOnly}
            placeholder={placeholder}
            spellCheck={false}
            className={cn(
              "w-full h-full resize-none bg-transparent outline-none",
              "leading-[1.6] whitespace-pre font-inherit",
              "placeholder:text-muted-foreground",
              readOnly && "cursor-default",
              highlighter && "text-transparent caret-foreground"
            )}
            style={{
              fontFamily: "var(--font-family-mono)",
              tabSize,
            }}
          />
        </div>
      </div>
    )
  }
)
DefaultEditor.displayName = "DefaultEditor"

const CodeEditor = React.forwardRef<HTMLDivElement, CodeEditorProps>(
  (
    {
      className,
      value,
      language = "text",
      onChange,
      onSave,
      onFormat,
      onRun,
      readOnly = false,
      lineNumbers = true,
      wordWrap = false,
      minimap = false,
      decorations = [],
      placeholder,
      tabSize = 2,
      softTabs = true,
      highlightActiveLine = true,
      highlighter,
      renderEditor,
      ...props
    },
    ref
  ) => {
    // Handle keyboard shortcuts
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        // Save: Ctrl+S / Cmd+S
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault()
          onSave?.(value)
        }
        // Format: Ctrl+Shift+F / Cmd+Shift+F
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "f") {
          e.preventDefault()
          onFormat?.()
        }
        // Run: Ctrl+Enter / Cmd+Enter
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault()
          onRun?.()
        }
      },
      [value, onSave, onFormat, onRun]
    )

    // Render decorations overlay
    const renderDecorations = () => {
      if (decorations.length === 0) return null

      const lines = value.split("\n")

      return (
        <div className="decorations-overlay absolute inset-0 pointer-events-none overflow-hidden">
          {decorations.map((decoration, index) => {
            const lineIndex = decoration.line - 1
            if (lineIndex < 0 || lineIndex >= lines.length) return null

            const typeColors = {
              error: "bg-red-500/10 border-l-2 border-red-500",
              warning: "bg-amber-500/10 border-l-2 border-amber-500",
              info: "bg-blue-500/10 border-l-2 border-blue-500",
              highlight: "bg-primary/10 border-l-2 border-primary",
            }

            return (
              <div
                key={index}
                className={cn(
                  "decoration-line absolute left-0 right-0",
                  typeColors[decoration.type],
                  decoration.className
                )}
                style={{
                  top: `${lineIndex * 1.6}em`,
                  height: "1.6em",
                }}
                title={decoration.message}
              />
            )
          })}
        </div>
      )
    }

    const editorProps: EditorRenderProps = {
      value,
      language,
      onChange,
      readOnly,
      lineNumbers,
      wordWrap,
      minimap,
      decorations,
      placeholder,
      tabSize,
      className: "flex-1",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "code-editor relative overflow-hidden rounded-md border border-border",
          "bg-[hsl(var(--code-background))] text-[hsl(var(--code-foreground))]",
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Toolbar (optional - shown if handlers provided) */}
        {(onSave || onFormat || onRun) && (
          <div className="editor-toolbar flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30">
            {language && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium mr-auto">
                {language}
              </span>
            )}
            {onFormat && (
              <button
                onClick={onFormat}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Format (Ctrl+Shift+F)"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            )}
            {onRun && (
              <button
                onClick={onRun}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Run (Ctrl+Enter)"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            {onSave && (
              <button
                onClick={() => onSave(value)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Save (Ctrl+S)"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Editor content */}
        <div className="editor-content relative p-3 overflow-auto" style={{ fontFamily: "var(--font-family-mono)" }}>
          {/* Decorations layer */}
          {renderDecorations()}

          {/* Editor */}
          {renderEditor ? (
            renderEditor(editorProps)
          ) : (
            <DefaultEditor {...editorProps} highlighter={highlighter} />
          )}
        </div>
      </div>
    )
  }
)
CodeEditor.displayName = "CodeEditor"

export { CodeEditor, DefaultEditor }
