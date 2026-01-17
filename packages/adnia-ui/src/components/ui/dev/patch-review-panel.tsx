import * as React from "react"
import { cn } from "../../../lib/utils"

export type PatchFileStatus = "added" | "modified" | "deleted" | "renamed"

export interface PatchFile {
  path: string
  status: PatchFileStatus
  oldPath?: string // for renames
  additions: number
  deletions: number
  accepted?: boolean
  rejected?: boolean
}

export interface PatchReviewPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Changed files */
  files: PatchFile[]
  /** Accept file handler */
  onAcceptFile?: (path: string) => void
  /** Reject file handler */
  onRejectFile?: (path: string) => void
  /** Accept all handler */
  onAcceptAll?: () => void
  /** Reject all handler */
  onRejectAll?: () => void
  /** File select handler */
  onFileSelect?: (path: string) => void
  /** Selected file path */
  selectedFile?: string
  /** Show summary */
  showSummary?: boolean
  /** Title */
  title?: string
  /** Collapsible */
  collapsible?: boolean
  /** Default collapsed */
  defaultCollapsed?: boolean
}

// Status icons
const statusIcons: Record<PatchFileStatus, React.ReactNode> = {
  added: (
    <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  modified: (
    <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  deleted: (
    <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  renamed: (
    <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  ),
}


const PatchReviewPanel = React.forwardRef<HTMLDivElement, PatchReviewPanelProps>(
  (
    {
      className,
      files,
      onAcceptFile,
      onRejectFile,
      onAcceptAll,
      onRejectAll,
      onFileSelect,
      selectedFile,
      showSummary = true,
      title = "Changed Files",
      collapsible = true,
      defaultCollapsed = false,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed)

    // Calculate stats
    const stats = React.useMemo(() => {
      let totalAdditions = 0
      let totalDeletions = 0
      let pendingCount = 0
      let acceptedCount = 0
      let rejectedCount = 0

      for (const file of files) {
        totalAdditions += file.additions
        totalDeletions += file.deletions

        if (file.accepted) acceptedCount++
        else if (file.rejected) rejectedCount++
        else pendingCount++
      }

      return {
        totalAdditions,
        totalDeletions,
        totalFiles: files.length,
        pendingCount,
        acceptedCount,
        rejectedCount,
      }
    }, [files])

    // Get file name from path
    const getFileName = (path: string) => {
      return path.split("/").pop() || path
    }

    // Get folder path from path
    const getFolderPath = (path: string) => {
      const parts = path.split("/")
      return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
    }

    return (
      <div
        ref={ref}
        className={cn(
          "patch-review-panel rounded-md border border-border overflow-hidden",
          "bg-card",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div
          className={cn(
            "patch-header flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30",
            collapsible && "cursor-pointer"
          )}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            {collapsible && (
              <svg
                className={cn("h-3 w-3 transition-transform", !collapsed && "rotate-90")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span className="font-medium text-sm">{title}</span>
            <span className="text-xs text-muted-foreground">
              ({stats.totalFiles} file{stats.totalFiles !== 1 ? "s" : ""})
            </span>
          </div>

          {showSummary && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-500">+{stats.totalAdditions}</span>
              <span className="text-red-500">-{stats.totalDeletions}</span>
            </div>
          )}
        </div>

        {/* Content */}
        {!collapsed && (
          <>
            {/* File list */}
            <div className="patch-files divide-y divide-border/50">
              {files.map((file) => {
                const isSelected = selectedFile === file.path
                const fileName = getFileName(file.path)
                const folderPath = getFolderPath(file.path)

                return (
                  <div
                    key={file.path}
                    className={cn(
                      "patch-file flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/50",
                      isSelected && "bg-accent",
                      file.accepted && "bg-green-500/10",
                      file.rejected && "bg-red-500/10 opacity-60"
                    )}
                    onClick={() => onFileSelect?.(file.path)}
                  >
                    {/* Status icon */}
                    <span className="shrink-0">{statusIcons[file.status]}</span>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm truncate", file.rejected && "line-through")}>
                          {fileName}
                        </span>
                        {file.status === "renamed" && file.oldPath && (
                          <span className="text-xs text-muted-foreground">
                            ← {getFileName(file.oldPath)}
                          </span>
                        )}
                      </div>
                      {folderPath && (
                        <div className="text-xs text-muted-foreground truncate">
                          {folderPath}
                        </div>
                      )}
                    </div>

                    {/* Changes */}
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      {file.additions > 0 && (
                        <span className="text-green-500">+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className="text-red-500">-{file.deletions}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {file.accepted ? (
                        <span className="text-xs text-green-500 font-medium">Accepted</span>
                      ) : file.rejected ? (
                        <span className="text-xs text-red-500 font-medium">Rejected</span>
                      ) : (
                        <>
                          {onRejectFile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onRejectFile(file.path)
                              }}
                              className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                              title="Reject"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {onAcceptFile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onAcceptFile(file.path)
                              }}
                              className="p-1 rounded hover:bg-green-500/20 text-muted-foreground hover:text-green-500 transition-colors cursor-pointer"
                              title="Accept"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer actions */}
            {(onAcceptAll || onRejectAll) && stats.pendingCount > 0 && (
              <div className="patch-actions flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
                <div className="text-xs text-muted-foreground">
                  {stats.pendingCount} pending · {stats.acceptedCount} accepted · {stats.rejectedCount} rejected
                </div>
                <div className="flex items-center gap-2">
                  {onRejectAll && (
                    <button
                      onClick={onRejectAll}
                      className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Reject All
                    </button>
                  )}
                  {onAcceptAll && (
                    <button
                      onClick={onAcceptAll}
                      className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      Accept All
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }
)
PatchReviewPanel.displayName = "PatchReviewPanel"

export { PatchReviewPanel }
