import React, { useState, useRef, useEffect } from 'react';
import { cn, formatDateTime } from '../lib/utils';
import {
  MessageSquare,
  AlertTriangle,
  Bot,
  User,
  HelpCircle,
  Info,
  Send,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';
import { Button, Textarea, IconButton } from 'adnia-ui';
import type { TaskComment, Task } from '../../shared/types';

interface TaskCommentsProps {
  task: Task;
  onAddComment: (content: string, type: 'note' | 'instruction') => Promise<void>;
  onRetryWithContext?: () => Promise<void>;
  isRetrying?: boolean;
}

const COMMENT_TYPE_CONFIG = {
  note: {
    icon: MessageSquare,
    label: 'Note',
    bgClass: 'bg-muted/10',
    borderClass: 'border-border',
    iconClass: 'text-muted-foreground',
  },
  instruction: {
    icon: Info,
    label: 'Instruction',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    iconClass: 'text-blue-400',
  },
  failure: {
    icon: AlertTriangle,
    label: 'Failure',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/20',
    iconClass: 'text-red-400',
  },
  agent: {
    icon: Bot,
    label: 'Agent',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20',
    iconClass: 'text-purple-400',
  },
  system: {
    icon: Info,
    label: 'System',
    bgClass: 'bg-yellow-500/10',
    borderClass: 'border-yellow-500/20',
    iconClass: 'text-yellow-400',
  },
};

export const TaskComments: React.FC<TaskCommentsProps> = ({
  task,
  onAddComment,
  onRetryWithContext,
  isRetrying = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'note' | 'instruction'>('instruction');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const comments = task.comments || [];

  // Focus textarea when popup opens
  useEffect(() => {
    if (showCommentPopup && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showCommentPopup]);

  // Close popup on click outside
  useEffect(() => {
    if (!showCommentPopup) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowCommentPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCommentPopup]);

  // Only show failure banner if the LAST comment is a failure
  const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;
  const hasFailure = lastComment?.type === 'failure';
  const latestFailure = hasFailure ? lastComment : null;

  // Check if agent is requesting clarification (last comment is failure with question)
  const pendingClarification = hasFailure && lastComment?.content.includes('Question:')
    ? lastComment
    : null;

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim(), commentType);
      setNewComment('');
      setShowCommentPopup(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const formatCommentContent = (content: string) => {
    // Convert markdown-style formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Failure Alert Banner */}
      {hasFailure && latestFailure && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-red-300">Task Failed</div>
              <div className="text-xs text-red-300/80 mt-1 line-clamp-2">
                {latestFailure.content.split('\n')[0].replace(/\*\*/g, '')}
              </div>
              {latestFailure.runId && (
                <div className="text-xs font-mono text-red-400/60 mt-1">
                  Run: {latestFailure.runId.substring(0, 12)}
                </div>
              )}
            </div>
            {onRetryWithContext && (
              <Button
                variant="status-danger"
                size="xs"
                onClick={onRetryWithContext}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <RotateCw size={12} className="animate-spin" />
                ) : (
                  <RotateCw size={12} />
                )}
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Clarification Request Banner */}
      {pendingClarification && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-start gap-2">
            <HelpCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-300">Clarification Needed</div>
              <div className="text-xs text-amber-300/80 mt-1">
                The agent needs your input to proceed. Please add an instruction below.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-border cursor-pointer hover:bg-muted/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Comments & Activity
          </span>
          <span className="text-xs text-muted-foreground/60">
            ({comments.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground" />
        )}
      </div>

      {isExpanded && (
        <>
          {/* Comments List - newest first */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {comments.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No comments yet. Add notes or instructions for the agent.
              </div>
            ) : (
              [...comments].reverse().map((comment) => {
                const config = COMMENT_TYPE_CONFIG[comment.type] || COMMENT_TYPE_CONFIG.note;
                const Icon = config.icon;
                const isAgent = comment.author === 'dexter' || comment.author === 'system';

                return (
                  <div
                    key={comment.id}
                    className={cn(
                      "rounded-lg border p-3",
                      config.bgClass,
                      config.borderClass
                    )}
                  >
                    {/* Comment Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={config.iconClass} />
                        <span className="text-xs font-medium text-muted-foreground">
                          {isAgent ? (
                            <span className="flex items-center gap-1">
                              {comment.author === 'dexter' ? (
                                <Bot size={12} className="text-purple-400" />
                              ) : (
                                <Info size={12} className="text-yellow-400" />
                              )}
                              {comment.author}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {comment.author}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground/50">
                          {config.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground/50">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>

                    {/* Comment Content */}
                    <div
                      className="text-sm whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{
                        __html: formatCommentContent(comment.content)
                      }}
                    />

                    {/* Run ID if present */}
                    {comment.runId && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <span className="text-xs font-mono text-muted-foreground/50">
                          Run: {comment.runId.substring(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment Button */}
          <div className="p-2 border-t border-border relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommentPopup(true)}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <Plus size={14} />
              Add instruction or note...
            </Button>

            {/* Comment Popup */}
            {showCommentPopup && (
              <div
                ref={popupRef}
                className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-card border border-border rounded-lg shadow-lg p-3 space-y-3 z-50"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Add Comment</span>
                  <IconButton
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowCommentPopup(false)}
                  >
                    <X size={14} />
                  </IconButton>
                </div>

                {/* Type Selector */}
                <div className="flex gap-2">
                  <Button
                    variant={commentType === 'instruction' ? "status-info" : "ghost"}
                    size="xs"
                    onClick={() => setCommentType('instruction')}
                  >
                    <Info size={12} />
                    Instruction
                  </Button>
                  <Button
                    variant={commentType === 'note' ? "muted" : "ghost"}
                    size="xs"
                    onClick={() => setCommentType('note')}
                    className={commentType === 'note' ? "border border-border" : ""}
                  >
                    <MessageSquare size={12} />
                    Note
                  </Button>
                </div>

                {/* Input Area */}
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    commentType === 'instruction'
                      ? "Add instructions for the agent..."
                      : "Add a note..."
                  }
                  className="w-full resize-none h-24"
                />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground/50">
                    Cmd/Ctrl + Enter to send
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCommentPopup(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!newComment.trim() || isSubmitting}
                      size="sm"
                    >
                      {isSubmitting ? (
                        <RotateCw size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
