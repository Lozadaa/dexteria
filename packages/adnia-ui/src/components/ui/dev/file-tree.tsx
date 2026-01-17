import * as React from "react"
import { cn } from "../../../lib/utils"

export type FileNodeStatus = "modified" | "added" | "deleted" | "renamed" | "untracked" | "ignored"

export interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: FileNode[]
  icon?: React.ReactNode
  status?: FileNodeStatus
  metadata?: Record<string, unknown>
}

export interface FileTreeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onContextMenu" | "onSelect"> {
  /** File tree structure */
  files: FileNode[]
  /** Selected file path */
  selectedPath?: string
  /** Expanded folder paths */
  expandedPaths?: string[]
  /** Selection handler */
  onSelect?: (path: string, node: FileNode) => void
  /** Open handler (double-click) */
  onOpen?: (path: string, node: FileNode) => void
  /** Expand change handler */
  onExpandChange?: (paths: string[]) => void
  /** Context menu handler */
  onContextMenu?: (path: string, node: FileNode, event: React.MouseEvent) => void
  /** Create handler */
  onCreate?: (parentPath: string, type: "file" | "folder") => void
  /** Rename handler */
  onRename?: (path: string, newName: string) => void
  /** Delete handler */
  onDelete?: (path: string) => void
  /** Move handler (drag & drop) */
  onMove?: (sourcePath: string, targetPath: string) => void
  /** Custom icon renderer */
  renderIcon?: (node: FileNode) => React.ReactNode
  /** Custom action renderer */
  renderActions?: (node: FileNode) => React.ReactNode
  /** Show status indicators */
  showStatus?: boolean
  /** Compact mode */
  compact?: boolean
  /** Show file extensions */
  showExtensions?: boolean
}

// Default file icons
const FileIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const FolderIcon = ({ open, className }: { open?: boolean; className?: string }) => (
  <svg className={cn("h-4 w-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    {open ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    )}
  </svg>
)

const ChevronIcon = ({ open, className }: { open?: boolean; className?: string }) => (
  <svg
    className={cn("h-3 w-3 transition-transform", open && "rotate-90", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

// Status colors
const statusColors: Record<FileNodeStatus, string> = {
  modified: "text-amber-500",
  added: "text-green-500",
  deleted: "text-red-500",
  renamed: "text-blue-500",
  untracked: "text-muted-foreground",
  ignored: "text-muted-foreground/50",
}

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  selectedPath?: string
  expandedPaths: Set<string>
  onSelect?: (path: string, node: FileNode) => void
  onOpen?: (path: string, node: FileNode) => void
  onToggleExpand: (path: string) => void
  onContextMenu?: (path: string, node: FileNode, event: React.MouseEvent) => void
  renderIcon?: (node: FileNode) => React.ReactNode
  renderActions?: (node: FileNode) => React.ReactNode
  showStatus?: boolean
  compact?: boolean
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onSelect,
  onOpen,
  onToggleExpand,
  onContextMenu,
  renderIcon,
  renderActions,
  showStatus,
  compact,
}) => {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const isFolder = node.type === "folder"

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isFolder) {
        onToggleExpand(node.path)
      }
      onSelect?.(node.path, node)
    },
    [isFolder, node, onSelect, onToggleExpand]
  )

  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isFolder) {
        onOpen?.(node.path, node)
      }
    },
    [isFolder, node, onOpen]
  )

  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu?.(node.path, node, e)
    },
    [node, onContextMenu]
  )

  // Default icon
  const icon = renderIcon ? (
    renderIcon(node)
  ) : node.icon ? (
    node.icon
  ) : isFolder ? (
    <FolderIcon open={isExpanded} className="text-amber-500" />
  ) : (
    <FileIcon className="text-muted-foreground" />
  )

  return (
    <div className="file-tree-node">
      <div
        className={cn(
          "file-tree-item flex items-center gap-1 cursor-pointer select-none",
          compact ? "py-0.5 px-1" : "py-1 px-2",
          "hover:bg-muted/50 rounded-sm transition-colors",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Expand chevron */}
        {isFolder && (
          <span className="shrink-0 w-4 flex items-center justify-center">
            <ChevronIcon open={isExpanded} />
          </span>
        )}
        {!isFolder && <span className="shrink-0 w-4" />}

        {/* Icon */}
        <span className="shrink-0">{icon}</span>

        {/* Name */}
        <span
          className={cn(
            "flex-1 truncate text-sm",
            node.status && showStatus && statusColors[node.status]
          )}
        >
          {node.name}
        </span>

        {/* Status indicator */}
        {showStatus && node.status && (
          <span className={cn("text-[10px] font-medium uppercase", statusColors[node.status])}>
            {node.status[0]}
          </span>
        )}

        {/* Actions */}
        {renderActions && (
          <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {renderActions(node)}
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && isExpanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onOpen={onOpen}
              onToggleExpand={onToggleExpand}
              onContextMenu={onContextMenu}
              renderIcon={renderIcon}
              renderActions={renderActions}
              showStatus={showStatus}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const FileTree = React.forwardRef<HTMLDivElement, FileTreeProps>(
  (
    {
      className,
      files,
      selectedPath,
      expandedPaths: controlledExpandedPaths,
      onSelect,
      onOpen,
      onExpandChange,
      onContextMenu,
      onCreate,
      onRename,
      onDelete,
      onMove,
      renderIcon,
      renderActions,
      showStatus = true,
      compact = false,
      showExtensions = true,
      ...props
    },
    ref
  ) => {
    // Expanded paths state
    const [internalExpandedPaths, setInternalExpandedPaths] = React.useState<Set<string>>(
      new Set(controlledExpandedPaths || [])
    )

    // Use controlled or internal expanded paths
    const expandedPaths = controlledExpandedPaths
      ? new Set(controlledExpandedPaths)
      : internalExpandedPaths

    // Toggle expand
    const handleToggleExpand = React.useCallback(
      (path: string) => {
        const newPaths = new Set(expandedPaths)
        if (newPaths.has(path)) {
          newPaths.delete(path)
        } else {
          newPaths.add(path)
        }

        if (onExpandChange) {
          onExpandChange(Array.from(newPaths))
        } else {
          setInternalExpandedPaths(newPaths)
        }
      },
      [expandedPaths, onExpandChange]
    )

    return (
      <div
        ref={ref}
        className={cn("file-tree overflow-auto", className)}
        {...props}
      >
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
            No files
          </div>
        ) : (
          files.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onOpen={onOpen}
              onToggleExpand={handleToggleExpand}
              onContextMenu={onContextMenu}
              renderIcon={renderIcon}
              renderActions={renderActions}
              showStatus={showStatus}
              compact={compact}
            />
          ))
        )}
      </div>
    )
  }
)
FileTree.displayName = "FileTree"

export { FileTree }
