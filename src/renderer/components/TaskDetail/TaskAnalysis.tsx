/**
 * TaskAnalysis Component
 *
 * Displays task state analysis results.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { RotateCw, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { IconButton } from 'adnia-ui';
import { useTranslation } from '../../i18n/useTranslation';
import type { AnalysisResult } from './constants';

interface TaskAnalysisProps {
  analysis: AnalysisResult;
  currentStatus: string;
  onClose: () => void;
}

/**
 * Display task state analysis with criteria verification results.
 */
export const TaskAnalysis: React.FC<TaskAnalysisProps> = ({
  analysis,
  currentStatus,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        analysis.status === 'analyzing' && 'bg-blue-500/10 border-blue-500/20',
        analysis.status === 'complete' && 'bg-muted/10 border-border',
        analysis.status === 'error' && 'bg-red-500/10 border-red-500/20'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          {analysis.status === 'analyzing' && (
            <RotateCw className="w-3 h-3 animate-spin" />
          )}
          {analysis.status === 'complete' && (
            <CheckCircle className="w-3 h-3 text-green-500" />
          )}
          {analysis.status === 'error' && (
            <XCircle className="w-3 h-3 text-red-500" />
          )}
          {t('views.taskDetail.stateAnalysis')}
        </h3>
        <IconButton variant="ghost" size="xs" onClick={onClose} aria-label={t('actions.close')}>
          <X size={14} />
        </IconButton>
      </div>

      {analysis.status === 'analyzing' && (
        <div className="text-sm text-muted-foreground">
          {t('views.taskDetail.analyzingTask')}
        </div>
      )}

      {analysis.status === 'error' && (
        <div className="text-sm text-red-400">{analysis.error}</div>
      )}

      {analysis.status === 'complete' && (
        <div className="space-y-3">
          {analysis.summary && <div className="text-sm">{analysis.summary}</div>}

          {analysis.suggestedStatus && analysis.suggestedStatus !== currentStatus && (
            <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle size={14} className="text-yellow-500 shrink-0" />
              <span className="text-sm">
                {t('views.taskDetail.suggestedStatus')}{' '}
                <strong className="capitalize">{analysis.suggestedStatus}</strong>{' '}
                ({t('views.taskDetail.currentStatus')} <span className="capitalize">{currentStatus}</span>)
              </span>
            </div>
          )}

          {analysis.criteria && analysis.criteria.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {t('views.taskDetail.acceptanceCriteriaCheck')}
              </div>
              {analysis.criteria.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2 text-sm p-2 rounded border',
                    c.passed
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  {c.passed ? (
                    <CheckCircle
                      size={14}
                      className="text-green-500 shrink-0 mt-0.5"
                    />
                  ) : (
                    <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className={cn(c.passed ? 'text-green-300' : 'text-red-300')}>
                      {c.criterion}
                    </div>
                    {c.evidence && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {c.evidence}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
