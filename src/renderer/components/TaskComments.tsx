import React, { useState } from 'react';
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
} from 'lucide-react';
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

  const comments = task.comments || [];

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
              <button
                onClick={onRetryWithContext}
                disabled={isRetrying}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium rounded transition-colors disabled:opacity-50"
              >
                {isRetrying ? (
                  <RotateCw size={12} className="animate-spin" />
                ) : (
                  <RotateCw size={12} />
                )}
                Retry
              </button>
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

          {/* Comment Input */}
          <div className="p-3 border-t border-border space-y-2">
            {/* Type Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setCommentType('instruction')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors",
                  commentType === 'instruction'
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : "text-muted-foreground hover:bg-muted border border-transparent"
                )}
              >
                <Info size={12} />
                Instruction
              </button>
              <button
                onClick={() => setCommentType('note')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors",
                  commentType === 'note'
                    ? "bg-muted text-foreground border border-border"
                    : "text-muted-foreground hover:bg-muted border border-transparent"
                )}
              >
                <MessageSquare size={12} />
                Note
              </button>
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  commentType === 'instruction'
                    ? "Add instructions for the agent..."
                    : "Add a note..."
                }
                className="flex-1 bg-muted border border-border rounded-lg p-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || isSubmitting}
                className="self-end px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <RotateCw size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <div className="text-xs text-muted-foreground/50">
              Press Cmd/Ctrl + Enter to send
            </div>
          </div>
        </>
      )}
    </div>
  );
};
