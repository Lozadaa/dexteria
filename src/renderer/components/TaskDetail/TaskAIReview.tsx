/**
 * TaskAIReview Component
 *
 * Displays AI review results and provides actions to manage AI review state.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from 'adnia-ui';
import type { Task, AIReviewResult } from '../../../shared/types';

interface TaskAIReviewProps {
  aiReview: AIReviewResult;
  taskId: string;
  onClear: () => void;
}

/**
 * Display AI review results with pass/fail indicators and feedback.
 */
export const TaskAIReview: React.FC<TaskAIReviewProps> = ({
  aiReview,
  taskId,
  onClear,
}) => {
  return (
    <div
      className={cn(
        'mt-3 p-3 rounded-lg border',
        aiReview.passed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-red-500/10 border-red-500/30'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {aiReview.passed ? (
          <CheckCircle size={16} className="text-green-500" />
        ) : (
          <XCircle size={16} className="text-red-500" />
        )}
        <span
          className={cn(
            'text-sm font-medium',
            aiReview.passed ? 'text-green-400' : 'text-red-400'
          )}
        >
          AI Review: {aiReview.passed ? 'Passed' : 'Needs Attention'}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(aiReview.reviewedAt).toLocaleString()}
        </span>
      </div>
      <p className="text-sm text-foreground/80">{aiReview.feedback}</p>
      {aiReview.checklist && aiReview.checklist.length > 0 && (
        <div className="mt-2 space-y-1">
          {aiReview.checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {item.passed ? (
                <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
              )}
              <span className={item.passed ? 'text-green-300' : 'text-red-300'}>
                {item.criterion}
                {item.note && (
                  <span className="text-muted-foreground ml-1">- {item.note}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* Clear AI Review button */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-xs"
        onClick={onClear}
      >
        <X size={12} />
        Clear Review
      </Button>
    </div>
  );
};
