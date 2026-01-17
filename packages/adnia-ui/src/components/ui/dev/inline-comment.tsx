import * as React from "react"
import { cn } from "../../../lib/utils"

export interface Comment {
  id: string
  author: string
  avatar?: string
  timestamp: Date
  content: string
}

export interface CommentThread {
  id: string
  line: number
  comments: Comment[]
  resolved?: boolean
  codeSnippet?: string
}

export interface InlineCommentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Comment thread */
  thread: CommentThread
  /** Reply handler */
  onReply?: (content: string) => void
  /** Resolve handler */
  onResolve?: () => void
  /** Edit handler */
  onEdit?: (commentId: string, content: string) => void
  /** Delete handler */
  onDelete?: (commentId: string) => void
  /** Current user for edit/delete permissions */
  currentUser?: string
  /** Show code snippet */
  showCodeSnippet?: boolean
  /** Collapsible */
  collapsible?: boolean
  /** Default collapsed */
  defaultCollapsed?: boolean
}

// Default avatar
const DefaultAvatar = ({ letter, className }: { letter: string; className?: string }) => (
  <div className={cn("h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium", className)}>
    {letter}
  </div>
)

const InlineComment = React.forwardRef<HTMLDivElement, InlineCommentProps>(
  (
    {
      className,
      thread,
      onReply,
      onResolve,
      onEdit,
      onDelete,
      currentUser,
      showCodeSnippet = false,
      collapsible = false,
      defaultCollapsed = false,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed)
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editText, setEditText] = React.useState("")
    const [replyText, setReplyText] = React.useState("")
    const [showReply, setShowReply] = React.useState(false)

    // Format timestamp
    const formatTime = (date: Date) => {
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (minutes < 1) return "just now"
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`

      return date.toLocaleDateString()
    }

    // Handle edit submit
    const handleEditSubmit = (commentId: string) => {
      if (editText.trim()) {
        onEdit?.(commentId, editText.trim())
        setEditingId(null)
        setEditText("")
      }
    }

    // Handle reply submit
    const handleReplySubmit = () => {
      if (replyText.trim()) {
        onReply?.(replyText.trim())
        setReplyText("")
        setShowReply(false)
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-comment rounded-md border border-border overflow-hidden",
          "bg-card shadow-sm",
          thread.resolved && "opacity-60",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div
          className={cn(
            "comment-header flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/20",
            collapsible && "cursor-pointer"
          )}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          {/* Collapse indicator */}
          {collapsible && (
            <svg
              className={cn("h-3 w-3 transition-transform shrink-0", !collapsed && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}

          {/* Thread info */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">Line {thread.line}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {thread.comments.length} comment{thread.comments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Status badge */}
          {thread.resolved && (
            <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">
              Resolved
            </span>
          )}

          {/* Resolve action */}
          {onResolve && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onResolve()
              }}
              className={cn(
                "p-1 rounded transition-colors cursor-pointer",
                thread.resolved
                  ? "text-green-500 hover:bg-green-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={thread.resolved ? "Unresolve" : "Resolve"}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        {!collapsed && (
          <>
            {/* Code snippet */}
            {showCodeSnippet && thread.codeSnippet && (
              <div className="px-3 py-2 bg-muted/30 border-b border-border/50">
                <code className="text-xs font-mono text-muted-foreground">
                  {thread.codeSnippet}
                </code>
              </div>
            )}

            {/* Comments */}
            <div className="divide-y divide-border/30">
              {thread.comments.map((comment) => {
                const isEditing = editingId === comment.id
                const canModify = currentUser && comment.author === currentUser

                return (
                  <div key={comment.id} className="px-3 py-2">
                    {/* Comment header */}
                    <div className="flex items-center gap-2 mb-1">
                      {comment.avatar ? (
                        typeof comment.avatar === "string" && comment.avatar.length === 1 ? (
                          <DefaultAvatar letter={comment.avatar} />
                        ) : (
                          <img src={comment.avatar} alt={comment.author} className="h-6 w-6 rounded-full" />
                        )
                      ) : (
                        <DefaultAvatar letter={comment.author[0]} />
                      )}
                      <span className="text-sm font-medium">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(comment.timestamp)}
                      </span>
                    </div>

                    {/* Comment content */}
                    {isEditing ? (
                      <div className="space-y-2 ml-8">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 text-sm bg-muted border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(null)
                              setEditText("")
                            }}
                            className="px-2 py-1 text-xs rounded hover:bg-muted transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditSubmit(comment.id)}
                            className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-8">
                        <p className="text-sm leading-relaxed">{comment.content}</p>
                        {/* Actions */}
                        {canModify && (onEdit || onDelete) && (
                          <div className="flex items-center gap-2 mt-1">
                            {onEdit && (
                              <button
                                onClick={() => {
                                  setEditText(comment.content)
                                  setEditingId(comment.id)
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => onDelete(comment.id)}
                                className="text-xs text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Reply input */}
            {onReply && (
              <div className="border-t border-border/50">
                {showReply ? (
                  <div className="px-3 py-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full p-2 text-sm bg-muted border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setShowReply(false)
                          setReplyText("")
                        }}
                        className="px-2 py-1 text-xs rounded hover:bg-muted transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReplySubmit}
                        disabled={!replyText.trim()}
                        className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowReply(true)}
                    className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer text-left"
                  >
                    Reply...
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }
)
InlineComment.displayName = "InlineComment"

export { InlineComment }
