/**
 * DashboardPanel
 *
 * Visual dashboard showing project statistics, progress charts,
 * and key metrics for quick project overview.
 */

import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useBoard } from '../hooks/useData';
import { useLayoutStore } from '../docking';
import { Card, Badge, ScrollArea } from 'adnia-ui';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  TrendingUp,
  Target,
  Zap,
  Calendar,
  ArrowRight,
  Activity,
  Play,
  Square,
  MessageSquare,
  FileEdit,
  GitBranch,
  Terminal,
} from 'lucide-react';
import type { Task, ActivityEntry } from '../../shared/types';
import { cn } from '../lib/utils';
import { formatRelativeTime } from '../lib/timeUtils';

// ============================================================================
// Types
// ============================================================================

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getTasksByStatus(tasks: Task[]) {
  return {
    backlog: tasks.filter((t) => t.status === 'backlog').length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    doing: tasks.filter((t) => t.status === 'doing').length,
    review: tasks.filter((t) => t.status === 'review').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };
}

function getHighPriorityTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'done' && (t.priority === 'critical' || t.priority === 'high'))
    .slice(0, 5);
}

function getRecentlyCompleted(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === 'done' && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5);
}

function getActivityIcon(type: ActivityEntry['type']) {
  switch (type) {
    case 'task_created':
      return <Target size={14} className="text-blue-500" />;
    case 'task_updated':
      return <FileEdit size={14} className="text-yellow-500" />;
    case 'task_deleted':
      return <Square size={14} className="text-red-500" />;
    case 'task_moved':
      return <ArrowRight size={14} className="text-purple-500" />;
    case 'comment_added':
      return <MessageSquare size={14} className="text-cyan-500" />;
    case 'agent_started':
      return <Play size={14} className="text-green-500" />;
    case 'agent_completed':
      return <CheckCircle2 size={14} className="text-green-500" />;
    case 'agent_failed':
      return <AlertCircle size={14} className="text-red-500" />;
    case 'ralph_started':
      return <Play size={14} className="text-indigo-500" />;
    case 'ralph_stopped':
      return <Square size={14} className="text-indigo-500" />;
    case 'command_executed':
      return <Terminal size={14} className="text-gray-500" />;
    case 'file_modified':
      return <FileEdit size={14} className="text-orange-500" />;
    default:
      return <Activity size={14} className="text-muted-foreground" />;
  }
}

function getActivityLabel(type: ActivityEntry['type'], t: (key: string) => string): string {
  const labels: Record<ActivityEntry['type'], string> = {
    task_created: t('views.dashboard.activity.taskCreated'),
    task_updated: t('views.dashboard.activity.taskUpdated'),
    task_deleted: t('views.dashboard.activity.taskDeleted'),
    task_moved: t('views.dashboard.activity.taskMoved'),
    comment_added: t('views.dashboard.activity.commentAdded'),
    agent_started: t('views.dashboard.activity.agentStarted'),
    agent_completed: t('views.dashboard.activity.agentCompleted'),
    agent_failed: t('views.dashboard.activity.agentFailed'),
    ralph_started: t('views.dashboard.activity.ralphStarted'),
    ralph_stopped: t('views.dashboard.activity.ralphStopped'),
    command_executed: t('views.dashboard.activity.commandExecuted'),
    file_modified: t('views.dashboard.activity.fileModified'),
  };
  return labels[type] || type;
}

// ============================================================================
// Components
// ============================================================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function ProgressRing({ progress, size = 120, strokeWidth = 10, label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="text-primary transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{progress}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

interface StatusBarProps {
  stats: ReturnType<typeof getTasksByStatus>;
  total: number;
  labels: {
    done: string;
    review: string;
    doing: string;
    todo: string;
    backlog: string;
  };
}

function StatusBar({ stats, total, labels }: StatusBarProps) {
  if (total === 0) return null;

  const segments = [
    { count: stats.done, color: 'bg-green-500', label: labels.done },
    { count: stats.review, color: 'bg-yellow-500', label: labels.review },
    { count: stats.doing, color: 'bg-blue-500', label: labels.doing },
    { count: stats.todo, color: 'bg-slate-400', label: labels.todo },
    { count: stats.backlog, color: 'bg-slate-600', label: labels.backlog },
  ];

  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full overflow-hidden flex">
        {segments.map((seg, idx) => {
          const width = (seg.count / total) * 100;
          if (width === 0) return null;
          return (
            <div
              key={idx}
              className={cn(seg.color, 'transition-all duration-300')}
              style={{ width: `${width}%` }}
              title={`${seg.label}: ${seg.count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className={cn('w-2.5 h-2.5 rounded-full', seg.color)} />
            <span className="text-muted-foreground">
              {seg.label}: {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TaskListItemProps {
  task: Task;
  onClick?: () => void;
}

function TaskListItem({ task, onClick }: TaskListItemProps) {
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-400',
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-3"
    >
      <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority] || 'bg-slate-400')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground">{task.id}</p>
      </div>
      <ArrowRight size={14} className="text-muted-foreground" />
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const DashboardPanel: React.FC = () => {
  const { t } = useTranslation();
  const { tasks, loading } = useBoard();
  const { openView } = useLayoutStore();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Load recent activity
  useEffect(() => {
    const loadActivity = async () => {
      try {
        const recentActivity = await window.dexteria.activity.getRecent(15);
        setActivities(recentActivity);
      } catch (error) {
        console.error('Failed to load activity:', error);
      } finally {
        setActivitiesLoading(false);
      }
    };
    loadActivity();
  }, []);

  const stats = useMemo(() => getTasksByStatus(tasks), [tasks]);
  const total = tasks.length;
  const completedPercent = total > 0 ? Math.round((stats.done / total) * 100) : 0;

  const highPriorityTasks = useMemo(() => getHighPriorityTasks(tasks), [tasks]);
  const recentlyCompleted = useMemo(() => getRecentlyCompleted(tasks), [tasks]);

  const statCards: StatCard[] = [
    {
      label: t('views.dashboard.totalTasks'),
      value: total,
      icon: <Target size={20} />,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t('views.dashboard.inProgress'),
      value: stats.doing,
      icon: <Clock size={20} />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: t('views.dashboard.completed'),
      value: stats.done,
      icon: <CheckCircle2 size={20} />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: t('views.dashboard.pending'),
      value: stats.todo + stats.backlog,
      icon: <Circle size={20} />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
    },
  ];

  const handleTaskClick = (task: Task) => {
    openView('taskDetail', { taskId: task.id, taskTitle: task.title });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutDashboard size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t('views.dashboard.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('views.dashboard.subtitle')}</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', card.bgColor, card.color)}>{card.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Ring */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              {t('views.dashboard.overallProgress')}
            </h3>
            <div className="flex items-center justify-center">
              <ProgressRing progress={completedPercent} label={t('views.dashboard.complete')} />
            </div>
          </Card>

          {/* Status Breakdown */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              {t('views.dashboard.statusBreakdown')}
            </h3>
            <StatusBar
              stats={stats}
              total={total}
              labels={{
                done: t('views.kanban.done'),
                review: t('views.kanban.review'),
                doing: t('views.kanban.doing'),
                todo: t('views.kanban.todo'),
                backlog: t('views.kanban.backlog'),
              }}
            />
          </Card>
        </div>

        {/* Task Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Priority Tasks */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-orange-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('views.dashboard.highPriority')}
              </h3>
            </div>
            {highPriorityTasks.length > 0 ? (
              <div className="space-y-2">
                {highPriorityTasks.map((task) => (
                  <TaskListItem key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('views.dashboard.noHighPriority')}
              </p>
            )}
          </Card>

          {/* Recently Completed */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-green-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('views.dashboard.recentlyCompleted')}
              </h3>
            </div>
            {recentlyCompleted.length > 0 ? (
              <div className="space-y-2">
                {recentlyCompleted.map((task) => (
                  <TaskListItem key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('views.dashboard.noCompleted')}
              </p>
            )}
          </Card>
        </div>

        {/* Activity Feed */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('views.dashboard.activityFeed')}
            </h3>
          </div>
          {activitiesLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t('common.loading')}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity, idx) => (
                <div
                  key={`${activity.timestamp}-${idx}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {getActivityLabel(activity.type, t)}
                    </p>
                    {activity.taskId && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.taskId}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('views.dashboard.noActivity')}
            </p>
          )}
        </Card>
      </div>
    </ScrollArea>
  );
};
