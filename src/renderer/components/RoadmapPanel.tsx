/**
 * RoadmapPanel
 *
 * Visual roadmap view showing tasks grouped by Epic and Sprint.
 * Designed for non-technical users to understand project timeline.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useBoard } from '../hooks/useData';
import { useLayoutStore } from '../docking';
import { ScrollArea, Badge, Card } from 'adnia-ui';
import {
  Calendar,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Target,
  Layers,
  Filter,
} from 'lucide-react';
import type { Task, TaskEpic } from '../../shared/types';

// ============================================================================
// Types
// ============================================================================

interface EpicGroup {
  epic: TaskEpic | null;
  tasks: Task[];
  progress: number;
}

interface SprintGroup {
  sprint: string;
  epics: EpicGroup[];
  totalTasks: number;
  completedTasks: number;
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusIcon(status: string) {
  switch (status) {
    case 'done':
      return <CheckCircle2 size={14} className="text-green-500" />;
    case 'doing':
      return <Clock size={14} className="text-blue-500 animate-pulse" />;
    case 'review':
      return <AlertCircle size={14} className="text-yellow-500" />;
    default:
      return <Circle size={14} className="text-muted-foreground" />;
  }
}

function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

// ============================================================================
// Components
// ============================================================================

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: string;
}

function ProgressBar({ progress, color = '#3b82f6', height = 'h-2' }: ProgressBarProps) {
  return (
    <div className={`${height} bg-muted/30 rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: string;
}

function StatsCard({ icon, label, value, total, color }: StatsCardProps) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex-1 min-w-[120px] bg-muted/20 rounded-lg p-3 border border-border/30">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color }}>{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
        <span className="text-xs text-muted-foreground">/ {total}</span>
      </div>
      <div className="mt-2">
        <ProgressBar progress={percent} color={color} height="h-1" />
      </div>
    </div>
  );
}

interface OverallProgressProps {
  stats: {
    done: number;
    doing: number;
    review: number;
    todo: number;
    backlog: number;
    total: number;
  };
}

function OverallProgress({ stats }: OverallProgressProps) {
  const { t } = useTranslation();
  const { done, doing, review, total } = stats;
  const pending = stats.todo + stats.backlog;

  if (total === 0) return null;

  const donePercent = (done / total) * 100;
  const doingPercent = (doing / total) * 100;
  const reviewPercent = (review / total) * 100;
  const overallPercent = Math.round(donePercent);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('views.roadmap.overallProgress')}</span>
        <span className="text-sm font-bold text-primary">{overallPercent}%</span>
      </div>
      <div className="h-3 bg-muted/30 rounded-full overflow-hidden flex">
        {donePercent > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${donePercent}%`, backgroundColor: '#22c55e' }}
            title={`${t('views.roadmap.completed')}: ${done}`}
          />
        )}
        {doingPercent > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${doingPercent}%`, backgroundColor: '#3b82f6' }}
            title={`${t('views.roadmap.inProgress')}: ${doing}`}
          />
        )}
        {reviewPercent > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${reviewPercent}%`, backgroundColor: '#eab308' }}
            title={`${t('views.roadmap.inReview')}: ${review}`}
          />
        )}
        {/* Remaining is implicit (gray background) */}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span>{done} {t('views.roadmap.completed').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
          <span>{doing} {t('views.roadmap.inProgress').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#eab308' }} />
          <span>{review} {t('views.roadmap.inReview').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted" />
          <span>{pending} {t('views.roadmap.pending').toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}

interface EpicCardProps {
  epic: TaskEpic | null;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onTaskClick: (task: Task) => void;
}

function EpicCard({ epic, tasks, isExpanded, onToggle, onTaskClick }: EpicCardProps) {
  const { t } = useTranslation();
  const progress = calculateProgress(tasks);
  const epicName = epic?.name || t('views.roadmap.noEpic');
  const epicColor = epic?.color || '#6b7280';

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: epicColor }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
          )}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: epicColor }}
          />
          <span className="font-medium truncate">{epicName}</span>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {tasks.length} {t('views.roadmap.tasks')}
          </Badge>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-muted-foreground">{progress}%</span>
          <div className="w-20">
            <ProgressBar progress={progress} color={epicColor} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border/50 bg-muted/10">
          {tasks.map((task) => (
            <button
              type="button"
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="w-full flex items-center gap-3 px-4 py-2 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors text-left"
            >
              {getStatusIcon(task.status)}
              <span className="text-sm flex-1 truncate">{task.title}</span>
              <Badge
                variant={
                  task.priority === 'critical'
                    ? 'destructive'
                    : task.priority === 'high'
                    ? 'default'
                    : 'outline'
                }
                className="text-xs"
              >
                {task.priority}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

interface SprintLaneProps {
  sprint: SprintGroup;
  expandedEpics: Set<string>;
  onToggleEpic: (epicKey: string) => void;
  onTaskClick: (task: Task) => void;
}

function SprintLane({ sprint, expandedEpics, onToggleEpic, onTaskClick }: SprintLaneProps) {
  const { t } = useTranslation();
  const progress = sprint.totalTasks > 0
    ? Math.round((sprint.completedTasks / sprint.totalTasks) * 100)
    : 0;

  return (
    <div className="min-w-[300px] flex-shrink-0">
      {/* Sprint Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-primary" />
            <h3 className="font-semibold">{sprint.sprint}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {sprint.completedTasks}/{sprint.totalTasks}
          </Badge>
        </div>
        <ProgressBar progress={progress} />
      </div>

      {/* Epic Cards */}
      <div className="p-3 space-y-3">
        {sprint.epics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('views.roadmap.noTasksInSprint')}
          </div>
        ) : (
          sprint.epics.map((epicGroup) => {
            const epicKey = `${sprint.sprint}-${epicGroup.epic?.name || 'no-epic'}`;
            return (
              <EpicCard
                key={epicKey}
                epic={epicGroup.epic}
                tasks={epicGroup.tasks}
                isExpanded={expandedEpics.has(epicKey)}
                onToggle={() => onToggleEpic(epicKey)}
                onTaskClick={onTaskClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RoadmapPanel() {
  const { t } = useTranslation();
  const { tasks, loading, error } = useBoard();
  const openView = useLayoutStore((s) => s.openView);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [filterEpic, setFilterEpic] = useState<string | null>(null);

  const handleTaskClick = (task: Task) => {
    openView('taskDetail', { taskId: task.id, taskTitle: task.title });
  };

  // Group tasks by Sprint, then by Epic
  const backlogLabel = t('views.roadmap.backlog');
  const sprintGroups = useMemo(() => {
    if (!tasks) return [];

    // Get unique sprints, sorted
    const sprints = [...new Set(tasks.map((task) => task.sprint || backlogLabel))].sort();

    // Filter by epic if selected
    const filteredTasks = filterEpic
      ? tasks.filter((task) => task.epic?.name === filterEpic)
      : tasks;

    return sprints.map((sprint): SprintGroup => {
      const sprintTasks = filteredTasks.filter((task) => (task.sprint || backlogLabel) === sprint);

      // Group by epic
      const epicMap = new Map<string, EpicGroup>();

      sprintTasks.forEach((task) => {
        const epicName = task.epic?.name || '';
        if (!epicMap.has(epicName)) {
          epicMap.set(epicName, {
            epic: task.epic || null,
            tasks: [],
            progress: 0,
          });
        }
        epicMap.get(epicName)!.tasks.push(task);
      });

      // Calculate progress for each epic
      epicMap.forEach((group) => {
        group.progress = calculateProgress(group.tasks);
      });

      const epics = Array.from(epicMap.values()).sort((a, b) =>
        (a.epic?.name || '').localeCompare(b.epic?.name || '')
      );

      return {
        sprint,
        epics,
        totalTasks: sprintTasks.length,
        completedTasks: sprintTasks.filter((t) => t.status === 'done').length,
      };
    });
  }, [tasks, filterEpic, backlogLabel]);

  // Get unique epics for filter
  const uniqueEpics = useMemo(() => {
    if (!tasks) return [];
    const epics = new Map<string, TaskEpic>();
    tasks.forEach((task) => {
      if (task.epic) epics.set(task.epic.name, task.epic);
    });
    return Array.from(epics.values());
  }, [tasks]);

  // Calculate stats for visual display
  const stats = useMemo(() => {
    if (!tasks) return { done: 0, doing: 0, review: 0, todo: 0, backlog: 0, total: 0 };
    return {
      done: tasks.filter((task) => task.status === 'done').length,
      doing: tasks.filter((task) => task.status === 'doing').length,
      review: tasks.filter((task) => task.status === 'review').length,
      todo: tasks.filter((task) => task.status === 'todo').length,
      backlog: tasks.filter((task) => task.status === 'backlog').length,
      total: tasks.length,
    };
  }, [tasks]);

  // Check if we only have backlog (no real sprints)
  const hasOnlyBacklog = useMemo(() => {
    if (!tasks) return true;
    return tasks.every((task) => !task.sprint);
  }, [tasks]);

  const handleToggleEpic = (epicKey: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicKey)) {
        next.delete(epicKey);
      } else {
        next.add(epicKey);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('labels.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('views.roadmap.title')}</h2>
            <Badge variant="outline" className="text-xs">
              {tasks?.length || 0} {t('views.roadmap.totalTasks')}
            </Badge>
            {hasOnlyBacklog && tasks && tasks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t('views.roadmap.noSprintsHint')}
              </Badge>
            )}
          </div>

          {/* Epic Filter */}
          {uniqueEpics.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <select
                value={filterEpic || ''}
                onChange={(e) => setFilterEpic(e.target.value || null)}
                className="text-sm bg-muted/30 border border-border/50 rounded px-2 py-1"
              >
                <option value="">{t('views.roadmap.allEpics')}</option>
                {uniqueEpics.map((epic) => (
                  <option key={epic.name} value={epic.name}>
                    {epic.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Overall Progress Bar */}
        {tasks && tasks.length > 0 && (
          <OverallProgress stats={stats} />
        )}

        {/* Visual Stats */}
        {tasks && tasks.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            <StatsCard
              icon={<CheckCircle2 size={16} />}
              label={t('views.roadmap.completed')}
              value={stats.done}
              total={stats.total}
              color="#22c55e"
            />
            <StatsCard
              icon={<Clock size={16} />}
              label={t('views.roadmap.inProgress')}
              value={stats.doing}
              total={stats.total}
              color="#3b82f6"
            />
            <StatsCard
              icon={<AlertCircle size={16} />}
              label={t('views.roadmap.inReview')}
              value={stats.review}
              total={stats.total}
              color="#eab308"
            />
            <StatsCard
              icon={<Circle size={16} />}
              label={t('views.roadmap.pending')}
              value={stats.todo + stats.backlog}
              total={stats.total}
              color="#6b7280"
            />
          </div>
        )}
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1" orientation="horizontal">
        <div className="flex gap-4 p-4 min-h-full">
          {sprintGroups.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Layers size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('views.roadmap.emptyTitle')}</p>
              <p className="text-sm">{t('views.roadmap.emptySubtitle')}</p>
            </div>
          ) : (
            sprintGroups.map((sprint) => (
              <SprintLane
                key={sprint.sprint}
                sprint={sprint}
                expandedEpics={expandedEpics}
                onToggleEpic={handleToggleEpic}
                onTaskClick={handleTaskClick}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
