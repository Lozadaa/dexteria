import * as React from "react"
import { cn } from "../../../lib/utils"

export type DiffLineType = "add" | "remove" | "unchanged" | "header"

export interface DiffLine {
  type: DiffLineType
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Original content */
  original: string
  /** Modified content */
  modified: string
  /** Programming language */
  language?: string
  /** File path (for display) */
  filename?: string
  /** View mode */
  mode?: "split" | "unified"
  /** Show line numbers */
  showLineNumbers?: boolean
  /** Accept changes handler */
  onAccept?: () => void
  /** Reject changes handler */
  onReject?: () => void
  /** Custom line action renderer */
  renderLineAction?: (props: LineActionProps) => React.ReactNode
  /** Wrap long lines */
  wrapLines?: boolean
  /** Expandable context lines */
  expandableContext?: boolean
  /** Number of context lines to show */
  contextLines?: number
}

export interface LineActionProps {
  lineNumber: number
  type: DiffLineType
  content: string
  side: "old" | "new"
}

// Simple diff algorithm (Myers diff simplified)
function computeDiff(original: string, modified: string): DiffLine[] {
  const oldLines = original.split("\n")
  const newLines = modified.split("\n")
  const result: DiffLine[] = []

  let oldIndex = 0
  let newIndex = 0

  // Simple LCS-based diff
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Remaining new lines are additions
      result.push({
        type: "add",
        content: newLines[newIndex],
        newLineNumber: newIndex + 1,
      })
      newIndex++
    } else if (newIndex >= newLines.length) {
      // Remaining old lines are deletions
      result.push({
        type: "remove",
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
      })
      oldIndex++
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines match
      result.push({
        type: "unchanged",
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
      })
      oldIndex++
      newIndex++
    } else {
      // Look ahead to find matching lines
      let foundOld = -1
      let foundNew = -1

      // Look for the current old line in upcoming new lines
      for (let i = newIndex; i < Math.min(newIndex + 10, newLines.length); i++) {
        if (newLines[i] === oldLines[oldIndex]) {
          foundOld = i
          break
        }
      }

      // Look for the current new line in upcoming old lines
      for (let i = oldIndex; i < Math.min(oldIndex + 10, oldLines.length); i++) {
        if (oldLines[i] === newLines[newIndex]) {
          foundNew = i
          break
        }
      }

      if (foundOld !== -1 && (foundNew === -1 || foundOld - newIndex <= foundNew - oldIndex)) {
        // Add new lines until we find the match
        while (newIndex < foundOld) {
          result.push({
            type: "add",
            content: newLines[newIndex],
            newLineNumber: newIndex + 1,
          })
          newIndex++
        }
      } else if (foundNew !== -1) {
        // Remove old lines until we find the match
        while (oldIndex < foundNew) {
          result.push({
            type: "remove",
            content: oldLines[oldIndex],
            oldLineNumber: oldIndex + 1,
          })
          oldIndex++
        }
      } else {
        // No match found, treat as remove + add
        result.push({
          type: "remove",
          content: oldLines[oldIndex],
          oldLineNumber: oldIndex + 1,
        })
        result.push({
          type: "add",
          content: newLines[newIndex],
          newLineNumber: newIndex + 1,
        })
        oldIndex++
        newIndex++
      }
    }
  }

  return result
}

// Calculate diff stats
function getDiffStats(diff: DiffLine[]) {
  let additions = 0
  let deletions = 0

  for (const line of diff) {
    if (line.type === "add") additions++
    if (line.type === "remove") deletions++
  }

  return { additions, deletions }
}

const DiffViewer = React.forwardRef<HTMLDivElement, DiffViewerProps>(
  (
    {
      className,
      original,
      modified,
      language,
      filename,
      mode = "split",
      showLineNumbers = true,
      onAccept,
      onReject,
      renderLineAction,
      wrapLines = false,
      ...props
    },
    ref
  ) => {
    const diff = React.useMemo(() => computeDiff(original, modified), [original, modified])
    const stats = React.useMemo(() => getDiffStats(diff), [diff])

    const lineTypeStyles: Record<DiffLineType, string> = {
      add: "bg-[hsl(var(--diff-add-background))] text-[hsl(var(--diff-add-foreground))]",
      remove: "bg-[hsl(var(--diff-remove-background))] text-[hsl(var(--diff-remove-foreground))]",
      unchanged: "",
      header: "bg-muted text-muted-foreground font-semibold",
    }

    const lineTypePrefix: Record<DiffLineType, string> = {
      add: "+",
      remove: "-",
      unchanged: " ",
      header: "",
    }

    // Unified view
    const renderUnifiedView = () => (
      <div className="unified-diff font-mono text-[13px]">
        {diff.map((line, index) => (
          <div
            key={index}
            className={cn(
              "diff-line flex",
              lineTypeStyles[line.type],
              wrapLines ? "whitespace-pre-wrap" : "whitespace-pre"
            )}
          >
            {showLineNumbers && (
              <>
                <span className="line-number w-10 px-2 text-right text-[hsl(var(--line-number))] select-none shrink-0 border-r border-border/30">
                  {line.oldLineNumber || ""}
                </span>
                <span className="line-number w-10 px-2 text-right text-[hsl(var(--line-number))] select-none shrink-0 border-r border-border/30">
                  {line.newLineNumber || ""}
                </span>
              </>
            )}
            <span className="diff-prefix w-4 text-center select-none shrink-0">
              {lineTypePrefix[line.type]}
            </span>
            <span className="line-content flex-1 px-2">
              {line.content || " "}
            </span>
          </div>
        ))}
      </div>
    )

    // Split view
    const renderSplitView = () => {
      // Organize lines for split view
      const leftLines: (DiffLine | null)[] = []
      const rightLines: (DiffLine | null)[] = []

      for (const line of diff) {
        if (line.type === "unchanged") {
          leftLines.push(line)
          rightLines.push(line)
        } else if (line.type === "remove") {
          leftLines.push(line)
          rightLines.push(null)
        } else if (line.type === "add") {
          leftLines.push(null)
          rightLines.push(line)
        }
      }

      // Balance arrays
      const maxLen = Math.max(leftLines.length, rightLines.length)
      while (leftLines.length < maxLen) leftLines.push(null)
      while (rightLines.length < maxLen) rightLines.push(null)

      // Compact by pairing removes with adds
      const compactedLeft: (DiffLine | null)[] = []
      const compactedRight: (DiffLine | null)[] = []

      let i = 0
      while (i < diff.length) {
        const line = diff[i]

        if (line.type === "unchanged") {
          compactedLeft.push(line)
          compactedRight.push(line)
          i++
        } else if (line.type === "remove") {
          // Look for following add
          if (i + 1 < diff.length && diff[i + 1].type === "add") {
            compactedLeft.push(line)
            compactedRight.push(diff[i + 1])
            i += 2
          } else {
            compactedLeft.push(line)
            compactedRight.push(null)
            i++
          }
        } else if (line.type === "add") {
          compactedLeft.push(null)
          compactedRight.push(line)
          i++
        } else {
          i++
        }
      }

      return (
        <div className="split-diff flex font-mono text-[13px]">
          {/* Left side (original) */}
          <div className="left-side flex-1 border-r border-border">
            {compactedLeft.map((line, index) => (
              <div
                key={index}
                className={cn(
                  "diff-line flex",
                  line ? lineTypeStyles[line.type] : "bg-muted/20",
                  wrapLines ? "whitespace-pre-wrap" : "whitespace-pre"
                )}
              >
                {showLineNumbers && (
                  <span className="line-number w-10 px-2 text-right text-[hsl(var(--line-number))] select-none shrink-0 border-r border-border/30">
                    {line?.oldLineNumber || ""}
                  </span>
                )}
                <span className="diff-prefix w-4 text-center select-none shrink-0">
                  {line ? lineTypePrefix[line.type] : ""}
                </span>
                <span className="line-content flex-1 px-2">
                  {line?.content || " "}
                </span>
              </div>
            ))}
          </div>

          {/* Right side (modified) */}
          <div className="right-side flex-1">
            {compactedRight.map((line, index) => (
              <div
                key={index}
                className={cn(
                  "diff-line flex",
                  line ? lineTypeStyles[line.type] : "bg-muted/20",
                  wrapLines ? "whitespace-pre-wrap" : "whitespace-pre"
                )}
              >
                {showLineNumbers && (
                  <span className="line-number w-10 px-2 text-right text-[hsl(var(--line-number))] select-none shrink-0 border-r border-border/30">
                    {line?.newLineNumber || ""}
                  </span>
                )}
                <span className="diff-prefix w-4 text-center select-none shrink-0">
                  {line ? lineTypePrefix[line.type] : ""}
                </span>
                <span className="line-content flex-1 px-2">
                  {line?.content || " "}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "diff-viewer rounded-md border border-border overflow-hidden",
          "bg-[hsl(var(--code-background))]",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="diff-header flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            {filename && (
              <span className="text-sm font-medium">{filename}</span>
            )}
            {language && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium">
                {language}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              <span className="text-[hsl(var(--diff-add-foreground))]">+{stats.additions}</span>
              {" / "}
              <span className="text-[hsl(var(--diff-remove-foreground))]">-{stats.deletions}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onReject && (
              <button
                onClick={onReject}
                className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Reject
              </button>
            )}
            {onAccept && (
              <button
                onClick={onAccept}
                className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
              >
                Accept
              </button>
            )}
          </div>
        </div>

        {/* Diff content */}
        <div
          className="diff-content overflow-auto"
          style={{ fontFamily: "var(--font-family-mono)" }}
        >
          {mode === "unified" ? renderUnifiedView() : renderSplitView()}
        </div>
      </div>
    )
  }
)
DiffViewer.displayName = "DiffViewer"

export { DiffViewer, computeDiff, getDiffStats }
