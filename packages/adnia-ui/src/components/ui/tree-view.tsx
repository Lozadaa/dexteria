import * as React from "react"
import { cn } from "../../lib/utils"

export interface TreeNode<T> {
  id: string
  data: T
  children?: TreeNode<T>[]
  hasChildren?: boolean
}

export interface TreeViewProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  data: TreeNode<T>[]
  renderNode: (node: T, depth: number, expanded: boolean) => React.ReactNode
  expanded?: string[]
  onExpand?: (id: string, expanded: boolean) => void
  selected?: string | string[]
  onSelect?: (id: string | string[]) => void
  multiSelect?: boolean
  indentSize?: number
}

function TreeViewInner<T>(
  {
    className,
    data,
    renderNode,
    expanded = [],
    onExpand,
    selected,
    onSelect,
    multiSelect = false,
    indentSize = 16,
    ...props
  }: TreeViewProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const expandedSet = React.useMemo(() => new Set(expanded), [expanded])
  const selectedSet = React.useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(Array.isArray(selected) ? selected : [selected])
  }, [selected])

  const handleToggle = (id: string) => {
    onExpand?.(id, !expandedSet.has(id))
  }

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (!onSelect) return

    if (multiSelect && (e.ctrlKey || e.metaKey)) {
      const newSelected = new Set(selectedSet)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      onSelect(Array.from(newSelected))
    } else {
      onSelect(id)
    }
  }

  const renderTree = (nodes: TreeNode<T>[], depth: number = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = node.children?.length || node.hasChildren
      const isExpanded = expandedSet.has(node.id)
      const isSelected = selectedSet.has(node.id)

      return (
        <div key={node.id}>
          <div
            className={cn(
              "flex items-center py-1 px-2 cursor-pointer rounded-sm",
              "hover:bg-accent/50",
              isSelected && "bg-accent text-accent-foreground"
            )}
            style={{ paddingLeft: depth * indentSize + 8 }}
            onClick={(e) => handleSelect(node.id, e)}
          >
            {/* Expand/collapse toggle */}
            <button
              type="button"
              className={cn(
                "h-4 w-4 flex-shrink-0 mr-1 cursor-pointer",
                !hasChildren && "invisible"
              )}
              onClick={(e) => {
                e.stopPropagation()
                handleToggle(node.id)
              }}
            >
              <svg
                className={cn(
                  "h-4 w-4 transition-transform",
                  isExpanded && "rotate-90"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Node content */}
            <div className="flex-1 min-w-0">
              {renderNode(node.data, depth, isExpanded)}
            </div>
          </div>

          {/* Children */}
          {hasChildren && isExpanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <div
      ref={ref}
      role="tree"
      aria-multiselectable={multiSelect}
      className={cn("text-sm", className)}
      {...props}
    >
      {renderTree(data)}
    </div>
  )
}

const TreeView = React.forwardRef(TreeViewInner) as <T>(
  props: TreeViewProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement

export { TreeView }
