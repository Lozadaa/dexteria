import React, { useState, useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import { Badge, Button } from 'adnia-ui';
import { GripVertical, AlertCircle, CheckCircle, Clock, Ban, Trash2, Loader2, StopCircle, Play, User, Sparkles, XCircle, Link, Tag, GitBranch, Square, CheckSquare } from 'lucide-react';
import { DoneTimeChip } from './DoneTimeChip';
import { Slot } from './extension/Slot';
import type { Task } from '../../shared/types';
import { hasUnmetDependencies } from '../../shared/schemas/common';
import { t } from '../i18n/t';

interface TaskCardProps {
    task: Task;
    onClick: (task: Task) => void;
    onDelete?: (task: Task) => void;
    onStop?: (task: Task) => void;
    onRun?: (task: Task) => void;
    isActive?: boolean;
    /** All tasks - used to check if dependencies are met */
    allTasks?: Task[];
    /** Whether bulk selection mode is active */
    isSelectionMode?: boolean;
    /** Whether this task is selected in bulk mode */
    isSelected?: boolean;
    /** Callback when selection changes */
    onSelectionChange?: (task: Task, selected: boolean) => void;
}

const PriorityIcons = {
    low: <div className="h-2 w-2 rounded-full bg-blue-400" />,
    medium: <div className="h-2 w-2 rounded-full bg-yellow-400" />,
    high: <div className="h-2 w-2 rounded-full bg-orange-500" />,
    critical: <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />,
};

const StatusIcons = {
    todo: <AlertCircle className="w-3 h-3" />,
    doing: <Clock className="w-3 h-3 animate-pulse" />,
    review: <CheckCircle className="w-3 h-3" />,
    done: <CheckCircle className="w-3 h-3" />,
    blocked: <Ban className="w-3 h-3 text-red-400" />,
    backlog: <div className="w-3 h-3 rounded-full border border-current opacity-50" />,
};

// Map task status to badge variant
const getStatusBadgeClasses = (status: Task['status']) => {
    switch (status) {
        case 'blocked':
            return "bg-red-500/10 text-red-400 border-red-500/20";
        case 'doing':
            return "bg-blue-500/10 text-blue-400 border-blue-500/20";
        default:
            return "bg-muted/30 border-border";
    }
};

export const TaskCard: React.FC<TaskCardProps> = ({
    task,
    onClick,
    onDelete,
    onStop,
    onRun,
    isActive,
    allTasks,
    isSelectionMode = false,
    isSelected = false,
    onSelectionChange,
}) => {
    const [isStopping, setIsStopping] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Check if task is running (must be before useDraggable to use in disabled prop)
    const isRunning = task.runtime?.status === 'running';

    // Check if task has unmet dependencies
    const isBlocked = allTasks ? hasUnmetDependencies(task, allTasks) : false;
    const unmetDepsCount = allTasks && task.dependsOn
        ? task.dependsOn.filter(depId => {
            const depTask = allTasks.find(t => t.id === depId);
            return !depTask || depTask.status !== 'done';
        }).length
        : 0;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { type: 'Task', task },
        disabled: isRunning, // Prevent dragging while task is running
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    // Close context menu on outside click
    useEffect(() => {
        if (!contextMenu) return;

        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [contextMenu]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu(null);
        onDelete?.(task);
    };

    const handleRun = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu(null);
        onRun?.(task);
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 h-24 bg-muted/20 border border-muted-foreground/20 rounded-lg"
            />
        );
    }

    return (
        <>
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => {
                if (isSelectionMode && onSelectionChange) {
                    onSelectionChange(task, !isSelected);
                } else {
                    onClick(task);
                }
            }}
            onContextMenu={handleContextMenu}
            className={cn(
                "group relative flex flex-col gap-2 p-3 rounded-lg border bg-card/50 backdrop-blur-sm shadow-sm",
                !isSelectionMode && "cursor-grab active:cursor-grabbing",
                isSelectionMode && "cursor-pointer",
                "transition-all duration-200 ease-out hover:bg-card/70 hover:shadow-md hover:-translate-y-0.5",
                "animate-fade-in-up animate-fill-both",
                isActive && "ring-2 ring-primary border-primary",
                isRunning && "ring-2 ring-green-500/50 border-green-500/50 bg-green-500/5 animate-glow-pulse",
                isSelected && "ring-2 ring-primary/70 bg-primary/5",
                "border-white/5"
            )}
        >
            {/* Selection checkbox - inline with content for better spacing */}
            {isSelectionMode && (
                <div
                    className="absolute top-3 left-3 z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectionChange?.(task, !isSelected);
                    }}
                >
                    <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        isSelected
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/50 hover:border-primary bg-background/80"
                    )}>
                        {isSelected && <CheckSquare className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                </div>
            )}
            {/* Running indicator overlay with stop button */}
            {isRunning && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Badge className="bg-green-500/20 border-green-500/30 text-green-400 text-[10px] px-2 py-1">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        {isStopping ? t('labels.stopping') : t('labels.running')}
                    </Badge>
                    {onStop && !isStopping && (
                        <Button
                            variant="danger-soft"
                            size="icon-sm"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setIsStopping(true);
                                onStop(task);
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            title={t('tooltips.stopExecution')}
                        >
                            <StopCircle className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            )}

            {/* Epic label, Human-Only/AI-Reviewable badges, and plugin badges */}
            <div className={cn(
                "flex items-center gap-1.5 -mt-0.5 mb-1 flex-wrap",
                isSelectionMode && "pl-7" // Space for checkbox
            )}>
                {task.epic && (
                    <>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                                backgroundColor: `${task.epic.color}20`,
                                color: task.epic.color,
                                borderLeft: `2px solid ${task.epic.color}`
                            }}
                        >
                            {task.epic.name}
                        </span>
                        {task.sprint && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {task.sprint}
                            </span>
                        )}
                    </>
                )}

                {/* Human-Only badge */}
                {task.humanOnly && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/30"
                        title={t('tooltips.humanOnly')}
                    >
                        <User className="w-3 h-3 mr-0.5" />
                        {t('labels.humanOnly')}
                    </Badge>
                )}

                {/* AI-Reviewable badge */}
                {task.aiReviewable && !task.aiReview && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border-purple-500/30"
                        title={t('tooltips.aiAutoReview')}
                    >
                        <Sparkles className="w-3 h-3 mr-0.5" />
                        {t('labels.aiReview')}
                    </Badge>
                )}

                {/* AI Processing indicator */}
                {task.aiProcessing && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse"
                        title={t('tooltips.aiReviewing')}
                    >
                        <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />
                        {t('labels.reviewing')}
                    </Badge>
                )}

                {/* AI Review result badge */}
                {task.aiReview && (
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[10px] px-1.5 py-0.5",
                            task.aiReview.passed
                                ? "bg-green-500/10 text-green-400 border-green-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                        )}
                        title={task.aiReview.passed ? t('tooltips.aiReviewPassed') : t('tooltips.aiReviewFailed')}
                    >
                        {task.aiReview.passed ? (
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                        ) : (
                            <XCircle className="w-3 h-3 mr-0.5" />
                        )}
                        {task.aiReview.passed ? t('labels.aiPassed') : t('labels.aiFailed')}
                    </Badge>
                )}

                {/* Blocked by dependencies badge */}
                {isBlocked && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400 border-orange-500/30"
                        title={t(unmetDepsCount === 1 ? 'tooltips.blockedByDeps' : 'tooltips.blockedByDeps_plural', { count: unmetDepsCount })}
                    >
                        <Link className="w-3 h-3 mr-0.5" />
                        {t('labels.blocked')} ({unmetDepsCount})
                    </Badge>
                )}

                {/* Plugin slot for task card badges */}
                <Slot
                    id="task-card:badge"
                    context={{ taskId: task.id, task }}
                    inline
                />
            </div>

            <div className={cn(
                "flex items-start justify-between gap-2",
                isSelectionMode && "pl-7" // Space for checkbox
            )}>
                <span className={cn(
                    "text-sm font-medium leading-tight line-clamp-2 text-card-foreground flex-1",
                    isRunning && "pr-20" // Make room for running badge
                )}>
                    {task.title}
                </span>
                <div className={cn(
                    "shrink-0 mt-0.5 transition-opacity",
                    isRunning ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                )}>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                </div>
            </div>

            {/* Tags row - only show if task has tags */}
            {task.tags && task.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap -mb-0.5">
                    <Tag className="w-3 h-3 text-muted-foreground/50" />
                    {task.tags.slice(0, 3).map((tag, idx) => (
                        <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground"
                        >
                            {tag}
                        </span>
                    ))}
                    {task.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground/50">
                            +{task.tags.length - 3}
                        </span>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div title={`${t('labels.priority')}: ${t(`views.kanban.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}`}>
                        {PriorityIcons[task.priority]}
                    </div>
                    <span className="uppercase tracking-wider text-[10px] opacity-70 font-mono">{task.id}</span>
                    {/* Git branch badge */}
                    {task.gitBranch && (
                        <span
                            className={cn(
                                "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-mono",
                                task.gitBranchCheckedOut
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-muted/30 text-muted-foreground"
                            )}
                            title={task.gitBranchCheckedOut ? t('labels.branchCheckedOut') : t('labels.gitBranch')}
                        >
                            <GitBranch className="w-2.5 h-2.5" />
                            {task.gitBranch.length > 12 ? task.gitBranch.slice(0, 12) + '…' : task.gitBranch}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Quick Run button - appears on hover (only if not running and has onRun) */}
                    {onRun && !isRunning && !isBlocked && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-green-500/20 hover:text-green-500"
                            onClick={handleRun}
                            onPointerDown={(e) => e.stopPropagation()}
                            title={t('actions.runTask')}
                        >
                            <Play className="w-3 h-3" />
                        </Button>
                    )}

                    {/* Delete button - appears on hover */}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500"
                            onClick={handleDelete}
                            onPointerDown={(e) => e.stopPropagation()}
                            title={t('tooltips.deleteTask')}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}

                    {/* Show completion time for done tasks */}
                    {task.status === 'done' && task.completedAt ? (
                        <DoneTimeChip completedAt={task.completedAt} />
                    ) : (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] px-1.5 py-0.5 font-normal",
                                getStatusBadgeClasses(task.status)
                            )}
                        >
                            {StatusIcons[task.status] || StatusIcons.todo}
                            <span className="ml-1 capitalize">{task.status}</span>
                        </Badge>
                    )}
                </div>
            </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
            <div
                ref={menuRef}
                className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px] animate-scale-in"
                style={{ left: contextMenu.x, top: contextMenu.y }}
            >
                {onRun && !isRunning && (
                    <Button
                        variant="ghost"
                        className="w-full justify-start rounded-none h-9 px-3"
                        onClick={handleRun}
                    >
                        <Play size={14} className="mr-2 text-green-500" />
                        {t('actions.runTask')}
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="ghost"
                        className="w-full justify-start rounded-none h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={handleDelete}
                    >
                        <Trash2 size={14} className="mr-2" />
                        {t('actions.delete')}
                    </Button>
                )}
            </div>
        )}
        </>
    );
};
