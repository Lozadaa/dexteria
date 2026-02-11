/**
 * RunHistoryPanel
 *
 * Displays the history of agent runs across all tasks.
 * Allows viewing past executions, their status, and details.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  FileText,
  Terminal,
  Play,
  Loader2,
  ScrollText,
  X,
  Wrench,
  Code,
  FileDiff,
  Plus,
  Minus,
  ClipboardCheck,
  Search,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { cn, formatRelativeTime } from '../lib/utils';
import { Button, IconButton } from 'adnia-ui';
import type { AgentRun } from '../../shared/types';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../contexts/ToastContext';

interface TaskRunGroup {
  taskId: string;
  runs: AgentRun[];
}

interface RunHistoryPanelProps {
  onSelectRun?: (taskId: string, runId: string) => void;
}

const statusIcons: Record<AgentRun['status'], React.ReactNode> = {
  completed: <CheckCircle size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
  blocked: <AlertTriangle size={14} className="text-yellow-500" />,
  cancelled: <XCircle size={14} className="text-muted-foreground" />,
  running: <Loader2 size={14} className="text-blue-500 animate-spin" />,
};

// Status labels are now resolved via i18n inside the component

export const RunHistoryPanel: React.FC<RunHistoryPanelProps> = ({ onSelectRun }) => {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const [runGroups, setRunGroups] = useState<TaskRunGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedRun, setSelectedRun] = useState<{ taskId: string; runId: string } | null>(null);
  const [runDetail, setRunDetail] = useState<AgentRun | null>(null);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [showLog, setShowLog] = useState(false);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [showToolCalls, setShowToolCalls] = useState(false);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<number>>(new Set());
  const [showCommands, setShowCommands] = useState(false);
  const [showPatches, setShowPatches] = useState(false);
  const [showAcceptance, setShowAcceptance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentRun['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'task'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await window.dexteria.runs.listAll();
      setRunGroups(groups);

      // Load task titles for display
      const tasks = await window.dexteria.tasks.getAll();
      const titles: Record<string, string> = {};
      for (const task of tasks) {
        titles[task.id] = task.title;
      }
      setTaskTitles(titles);

      // Auto-expand if only one task has runs
      if (groups.length === 1) {
        setExpandedTasks(new Set([groups[0].taskId]));
      }
    } catch (err) {
      console.error('Failed to load run history:', err);
      showError(t('toasts.runHistoryLoadFailed'));
    }
    setLoading(false);
  }, [showError, t]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectRun = async (taskId: string, run: AgentRun) => {
    setSelectedRun({ taskId, runId: run.id });
    setRunDetail(run);
    setShowLog(false);
    setLogContent(null);
    setShowToolCalls(false);
    setExpandedToolCalls(new Set());
    setShowCommands(false);
    setShowPatches(false);
    setShowAcceptance(false);
    onSelectRun?.(taskId, run.id);
  };

  const toggleToolCallExpand = (index: number) => {
    setExpandedToolCalls(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatToolInput = (input: Record<string, unknown>): string => {
    try {
      return JSON.stringify(input, null, 2);
    } catch {
      return String(input);
    }
  };

  const getToolIcon = (toolName: string): React.ReactNode => {
    if (toolName.includes('read') || toolName.includes('list')) {
      return <FileText size={12} className="text-blue-400" />;
    }
    if (toolName.includes('write') || toolName.includes('patch')) {
      return <Code size={12} className="text-green-400" />;
    }
    if (toolName.includes('command') || toolName.includes('run')) {
      return <Terminal size={12} className="text-yellow-400" />;
    }
    return <Wrench size={12} className="text-muted-foreground" />;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getExitCodeClass = (code: number | null): string => {
    if (code === null) return 'text-yellow-400';
    if (code === 0) return 'text-green-400';
    return 'text-red-400';
  };

  const handleViewLog = async () => {
    if (!selectedRun) return;
    setLoadingLog(true);
    try {
      const log = await window.dexteria.runs.getLog(selectedRun.taskId, selectedRun.runId);
      setLogContent(log);
      setShowLog(true);
    } catch (err) {
      console.error('Failed to load log:', err);
      showError(t('toasts.runLogLoadFailed'));
    }
    setLoadingLog(false);
  };

  // Status priority for sorting
  const statusPriority: Record<AgentRun['status'], number> = {
    running: 0,
    failed: 1,
    blocked: 2,
    completed: 3,
    cancelled: 4,
  };

  // Filter and sort runs
  const filteredGroups = runGroups
    .map(group => {
      // Filter by search query (task title)
      const taskTitle = taskTitles[group.taskId] || group.taskId;
      const matchesSearch = searchQuery === '' ||
        taskTitle.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return null;

      // Filter runs by status
      const filteredRuns = statusFilter === 'all'
        ? group.runs
        : group.runs.filter(r => r.status === statusFilter);

      if (filteredRuns.length === 0) return null;

      // Sort runs within each group
      const sortedRuns = [...filteredRuns].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
          comparison = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        } else if (sortBy === 'status') {
          comparison = statusPriority[a.status] - statusPriority[b.status];
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return { ...group, runs: sortedRuns };
    })
    .filter((g): g is TaskRunGroup => g !== null)
    // Sort groups
    .sort((a, b) => {
      if (sortBy === 'task') {
        const titleA = taskTitles[a.taskId] || a.taskId;
        const titleB = taskTitles[b.taskId] || b.taskId;
        const comparison = titleA.localeCompare(titleB);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      // For date/status, sort groups by their most recent run
      const latestA = a.runs[0]?.startedAt || '';
      const latestB = b.runs[0]?.startedAt || '';
      const comparison = latestA.localeCompare(latestB);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalRuns = filteredGroups.reduce((sum, g) => sum + g.runs.length, 0);
  const completedRuns = filteredGroups.reduce(
    (sum, g) => sum + g.runs.filter(r => r.status === 'completed').length,
    0
  );
  const failedRuns = filteredGroups.reduce(
    (sum, g) => sum + g.runs.filter(r => r.status === 'failed').length,
    0
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background/40">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary" />
          <span className="font-medium text-sm">{t('views.runHistory.title')}</span>
          <span className="text-xs text-muted-foreground">
            ({totalRuns} {t('views.runHistory.runs')})
          </span>
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={loadRuns}
          aria-label={t('tooltips.refresh')}
        >
          <RefreshCw size={14} />
        </IconButton>
      </div>

      {/* Stats Summary */}
      {totalRuns > 0 && (
        <div className="flex items-center gap-4 px-3 py-2 border-b border-border bg-muted/20 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-green-500" />
            <span>{completedRuns} {t('views.runHistory.completed')}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle size={12} className="text-red-500" />
            <span>{failedRuns} {t('views.runHistory.failed')}</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/10">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('views.runHistory.searchPlaceholder')}
            className="w-full pl-7 pr-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AgentRun['status'] | 'all')}
            className="text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">{t('views.runHistory.filterAll')}</option>
            <option value="completed">{t('views.runHistory.filterCompleted')}</option>
            <option value="failed">{t('views.runHistory.filterFailed')}</option>
            <option value="blocked">{t('views.runHistory.filterBlocked')}</option>
            <option value="running">{t('views.runHistory.filterRunning')}</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown size={12} className="text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'task')}
            className="text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="date">{t('views.runHistory.sortByDate')}</option>
            <option value="status">{t('views.runHistory.sortByStatus')}</option>
            <option value="task">{t('views.runHistory.sortByTask')}</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="text-xs px-1.5 py-1 bg-background border border-border rounded hover:bg-muted transition-colors"
            title={sortOrder === 'asc' ? t('views.runHistory.sortAsc') : t('views.runHistory.sortDesc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {filteredGroups.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <History size={40} className="mx-auto opacity-30" />
              {runGroups.length === 0 ? (
                <>
                  <p className="text-sm">{t('views.runHistory.noRuns')}</p>
                  <p className="text-xs opacity-70">{t('views.runHistory.noRunsHint')}</p>
                </>
              ) : (
                <>
                  <p className="text-sm">{t('views.runHistory.noResults')}</p>
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('actions.clear')} {t('labels.filter').toLowerCase()}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map(group => (
              <div key={group.taskId}>
                {/* Task Header */}
                <button
                  onClick={() => toggleTaskExpand(group.taskId)}
                  className={cn(
                    'w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors text-left',
                    expandedTasks.has(group.taskId) && 'bg-muted/30'
                  )}
                >
                  <ChevronRight
                    size={14}
                    className={cn(
                      'text-muted-foreground transition-transform',
                      expandedTasks.has(group.taskId) && 'rotate-90'
                    )}
                  />
                  <FileText size={14} className="text-muted-foreground" />
                  <span className="flex-1 font-medium text-sm truncate">
                    {taskTitles[group.taskId] || group.taskId.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.runs.length} {group.runs.length === 1 ? 'run' : 'runs'}
                  </span>
                </button>

                {/* Runs List */}
                {expandedTasks.has(group.taskId) && (
                  <div className="border-t border-border/50 bg-muted/10">
                    {group.runs.map(run => (
                      <button
                        key={run.id}
                        onClick={() => handleSelectRun(group.taskId, run)}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 pl-8 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-b-0',
                          selectedRun?.runId === run.id && 'bg-primary/5 border-l-2 border-l-primary'
                        )}
                      >
                        {/* Status Icon */}
                        <div className="mt-0.5">{statusIcons[run.status]}</div>

                        {/* Run Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-xs text-muted-foreground">
                              {run.id.slice(0, 8)}
                            </span>
                            <span className={cn(
                              'text-xs px-1.5 py-0.5 rounded',
                              run.status === 'completed' && 'bg-green-500/10 text-green-500',
                              run.status === 'failed' && 'bg-red-500/10 text-red-500',
                              run.status === 'blocked' && 'bg-yellow-500/10 text-yellow-500',
                              run.status === 'cancelled' && 'bg-muted text-muted-foreground',
                              run.status === 'running' && 'bg-blue-500/10 text-blue-500'
                            )}>
                              {t(`views.taskRunner.${run.status}`)}
                            </span>
                          </div>

                          {/* Summary or Error */}
                          {run.summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {run.summary}
                            </p>
                          )}
                          {run.error && !run.summary && (
                            <p className="text-xs text-red-400 mt-1 line-clamp-2">
                              {run.error}
                            </p>
                          )}

                          {/* Meta */}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {formatRelativeTime(run.startedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Play size={10} />
                              {run.steps} steps
                            </span>
                            {run.filesModified.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText size={10} />
                                {run.filesModified.length} files
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Run Detail (footer) */}
      {runDetail && (
        <div className="border-t border-border bg-muted/20">
          {/* Tool Calls Viewer */}
          {showToolCalls && runDetail.toolCalls.length > 0 && (
            <div className="border-b border-border">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Wrench size={12} />
                  {t('views.runHistory.toolCallsTitle')} ({runDetail.toolCalls.length})
                </span>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToolCalls(false)}
                  aria-label={t('actions.close')}
                >
                  <X size={12} />
                </IconButton>
              </div>
              <div className="max-h-64 overflow-auto bg-background/80">
                {runDetail.toolCalls.map((call, index) => (
                  <div key={index} className="border-b border-border/30 last:border-b-0">
                    <button
                      onClick={() => toggleToolCallExpand(index)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
                    >
                      {expandedToolCalls.has(index) ? (
                        <ChevronDown size={12} className="text-muted-foreground" />
                      ) : (
                        <ChevronRight size={12} className="text-muted-foreground" />
                      )}
                      {getToolIcon(call.name)}
                      <span className="flex-1 font-mono text-xs truncate">{call.name}</span>
                      <span className="text-xs text-muted-foreground">{call.durationMs}ms</span>
                    </button>
                    {expandedToolCalls.has(index) && (
                      <div className="px-3 pb-2 pl-8 space-y-2">
                        {/* Input */}
                        <div>
                          <span className="text-xs text-muted-foreground">{t('views.runHistory.toolInput')}:</span>
                          <pre className="mt-1 p-2 text-xs font-mono bg-muted/30 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                            {formatToolInput(call.input)}
                          </pre>
                        </div>
                        {/* Output Summary */}
                        {call.outputSummary && (
                          <div>
                            <span className="text-xs text-muted-foreground">{t('views.runHistory.toolOutput')}:</span>
                            <p className="mt-1 text-xs text-foreground/80">{call.outputSummary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commands Viewer */}
          {showCommands && runDetail.commands.length > 0 && (
            <div className="border-b border-border">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Terminal size={12} />
                  {t('views.runHistory.commandsTitle')} ({runDetail.commands.length})
                </span>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCommands(false)}
                  aria-label={t('actions.close')}
                >
                  <X size={12} />
                </IconButton>
              </div>
              <div className="max-h-48 overflow-auto bg-background/80">
                {runDetail.commands.map((cmd, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 border-b border-border/30 last:border-b-0 hover:bg-muted/30"
                  >
                    <Terminal size={12} className="text-yellow-400 shrink-0" />
                    <code className="flex-1 font-mono text-xs truncate" title={cmd.command}>
                      {cmd.command}
                    </code>
                    <span className={cn("text-xs font-mono", getExitCodeClass(cmd.exitCode))}>
                      {cmd.exitCode === null ? 'INT' : `exit ${cmd.exitCode}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(cmd.durationMs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patches Viewer */}
          {showPatches && runDetail.patches.length > 0 && (
            <div className="border-b border-border">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <span className="text-xs font-medium flex items-center gap-1">
                  <FileDiff size={12} />
                  {t('views.runHistory.patchesTitle')} ({runDetail.patches.length})
                </span>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPatches(false)}
                  aria-label={t('actions.close')}
                >
                  <X size={12} />
                </IconButton>
              </div>
              <div className="max-h-48 overflow-auto bg-background/80">
                {runDetail.patches.map((patch, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 border-b border-border/30 last:border-b-0 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <FileDiff size={12} className="text-purple-400 shrink-0" />
                      <span className="flex-1 font-mono text-xs truncate" title={patch.path}>
                        {patch.path}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Plus size={10} className="text-green-400" />
                        <span className="text-green-400">{patch.linesAdded}</span>
                        <Minus size={10} className="text-red-400 ml-1" />
                        <span className="text-red-400">{patch.linesRemoved}</span>
                      </span>
                    </div>
                    {patch.diffSummary && (
                      <p className="mt-1 text-xs text-muted-foreground pl-5 truncate">
                        {patch.diffSummary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acceptance Criteria Viewer */}
          {showAcceptance && runDetail.acceptanceResults && runDetail.acceptanceResults.length > 0 && (
            <div className="border-b border-border">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <span className="text-xs font-medium flex items-center gap-1">
                  <ClipboardCheck size={12} />
                  {t('views.runHistory.acceptanceTitle')} ({runDetail.acceptanceResults.length})
                </span>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAcceptance(false)}
                  aria-label={t('actions.close')}
                >
                  <X size={12} />
                </IconButton>
              </div>
              <div className="max-h-48 overflow-auto bg-background/80">
                {runDetail.acceptanceResults.map((result, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 border-b border-border/30 last:border-b-0"
                  >
                    <div className="flex items-start gap-2">
                      {result.passed ? (
                        <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{result.criterion}</p>
                        <p className="text-xs text-muted-foreground mt-1">{result.evidence}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log Viewer */}
          {showLog && logContent !== null && (
            <div className="border-b border-border">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <span className="text-xs font-medium flex items-center gap-1">
                  <ScrollText size={12} />
                  {t('views.runHistory.executionLog')}
                </span>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLog(false)}
                  aria-label={t('actions.close')}
                >
                  <X size={12} />
                </IconButton>
              </div>
              <pre className="p-3 text-xs font-mono overflow-auto max-h-48 bg-background/80 whitespace-pre-wrap">
                {logContent || t('views.runHistory.noLog')}
              </pre>
            </div>
          )}

          {/* Run Details */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">{t('views.runHistory.runDetails')}</span>
              <div className="flex items-center gap-2 flex-wrap">
                {runDetail.toolCalls.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToolCalls(!showToolCalls)}
                    className={cn("h-6 text-xs", showToolCalls && "bg-primary/10")}
                  >
                    <Wrench size={12} />
                    {t('views.runHistory.viewToolCalls')} ({runDetail.toolCalls.length})
                  </Button>
                )}
                {runDetail.commands.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommands(!showCommands)}
                    className={cn("h-6 text-xs", showCommands && "bg-primary/10")}
                  >
                    <Terminal size={12} />
                    {t('views.runHistory.viewCommands')} ({runDetail.commands.length})
                  </Button>
                )}
                {runDetail.patches.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPatches(!showPatches)}
                    className={cn("h-6 text-xs", showPatches && "bg-primary/10")}
                  >
                    <FileDiff size={12} />
                    {t('views.runHistory.viewPatches')} ({runDetail.patches.length})
                  </Button>
                )}
                {runDetail.acceptanceResults && runDetail.acceptanceResults.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAcceptance(!showAcceptance)}
                    className={cn("h-6 text-xs", showAcceptance && "bg-primary/10")}
                  >
                    <ClipboardCheck size={12} />
                    {t('views.runHistory.viewAcceptance')} ({runDetail.acceptanceResults.length})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewLog}
                  disabled={loadingLog}
                  className={cn("h-6 text-xs", showLog && "bg-primary/10")}
                >
                  {loadingLog ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ScrollText size={12} />
                  )}
                  {t('views.runHistory.viewLog')}
                </Button>
                <button
                  onClick={() => {
                    setSelectedRun(null);
                    setRunDetail(null);
                    setShowLog(false);
                    setLogContent(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('actions.close')}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t('views.runHistory.mode')}:</span>{' '}
                <span className="font-mono">{runDetail.mode}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('views.runHistory.steps')}:</span>{' '}
                <span>{runDetail.steps}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('views.runHistory.files')}:</span>{' '}
                <span>{runDetail.filesModified.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('views.runHistory.toolCalls')}:</span>{' '}
                <span>{runDetail.toolCalls.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('views.runHistory.commands')}:</span>{' '}
                <span>{runDetail.commands.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('views.runHistory.patches')}:</span>{' '}
                <span>{runDetail.patches.length}</span>
              </div>
            </div>
            {runDetail.acceptanceResults && runDetail.acceptanceResults.length > 0 && (
              <div className="mt-2 p-2 bg-background/50 rounded text-xs">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground">{t('views.runHistory.acceptanceLabel')}:</span>
                  <span className="text-green-500">
                    {runDetail.acceptanceResults.filter(r => r.passed).length} {t('views.runHistory.passed')}
                  </span>
                  <span className="text-red-500">
                    {runDetail.acceptanceResults.filter(r => !r.passed).length} {t('views.runHistory.failedAC')}
                  </span>
                </div>
              </div>
            )}
            {runDetail.filesModified.length > 0 && (
              <div className="mt-2 p-2 bg-background/50 rounded text-xs max-h-20 overflow-auto">
                <div className="text-muted-foreground mb-1">{t('views.runHistory.modifiedFiles')}:</div>
                {runDetail.filesModified.slice(0, 5).map((file, i) => (
                  <div key={i} className="font-mono truncate">{file}</div>
                ))}
                {runDetail.filesModified.length > 5 && (
                  <div className="text-muted-foreground">
                    +{runDetail.filesModified.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RunHistoryPanel;
