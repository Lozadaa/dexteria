import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, Terminal, AlertCircle, CheckCircle, XCircle, Loader2, ListTodo, Clock } from 'lucide-react';
import { useRunner } from '../../hooks/useRunner';
import { useBoard } from '../../hooks/useData';
import { useMode } from '../../contexts/ModeContext';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { Task } from '../../../shared/types';

export const TaskRunner: React.FC = () => {
    const {
        currentTask,
        currentRun,
        log,
        streamingContent,
        streamingTaskId,
        streamingTaskTitle,
        isRunning,
        wasCancelled,
        error,
        handlePlay,
        handlePause,
        handleStop,
        canPlay,
        canPause,
        canStop,
    } = useRunner();

    // Use streaming content if available, otherwise fall back to log
    const displayContent = streamingContent || log;

    // Use streaming task info or fall back to currentTask
    const displayTaskTitle = streamingTaskTitle || currentTask?.title || 'Task';
    const displayTaskId = streamingTaskId || currentTask?.id;
    const { tasks, refresh } = useBoard();
    const { mode, triggerPlannerBlock } = useMode();
    const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when log updates
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    // Get pending tasks (backlog and doing)
    const pendingTasks = tasks.filter(t => t.status === 'backlog' || t.status === 'doing');
    const recentlyDone = tasks
        .filter(t => t.status === 'done' && t.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, 3);

    const handleRunTask = async (task: Task) => {
        if (mode === 'planner') {
            triggerPlannerBlock();
            return;
        }
        setRunningTaskId(task.id);
        try {
            await window.dexteria.agent.runTask(task.id, { mode: 'manual' });
            refresh();
        } catch (err) {
            console.error('Failed to run task:', err);
        } finally {
            setRunningTaskId(null);
        }
    };

    // If no task is running and no streaming, show pending tasks
    if (!currentTask && !isRunning && !streamingContent) {
        return (
            <div className="h-full flex flex-col bg-background/40">
                {/* Header */}
                <div className="p-3 border-b border-border flex items-center gap-2">
                    <Terminal size={16} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Task Runner</span>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {pendingTasks.length === 0 && recentlyDone.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center space-y-2">
                                <ListTodo size={40} className="mx-auto opacity-30" />
                                <p className="text-sm">No pending tasks</p>
                                <p className="text-xs opacity-70">Create tasks from the board or chat</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Pending Tasks */}
                            {pendingTasks.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                        <ListTodo size={12} />
                                        Ready to Run ({pendingTasks.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {pendingTasks.slice(0, 5).map(task => (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-colors group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{task.title}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span className="font-mono">{task.id.substring(0, 8)}</span>
                                                        <span>•</span>
                                                        <span className={cn(
                                                            "capitalize",
                                                            task.status === 'doing' && "text-blue-400"
                                                        )}>{task.status}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRunTask(task)}
                                                    disabled={runningTaskId === task.id}
                                                    className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                    title="Run task"
                                                >
                                                    {runningTaskId === task.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Play size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                        {pendingTasks.length > 5 && (
                                            <p className="text-xs text-muted-foreground text-center">
                                                +{pendingTasks.length - 5} more tasks
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Recently Completed */}
                            {recentlyDone.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                        <Clock size={12} />
                                        Recently Completed
                                    </h3>
                                    <div className="space-y-1">
                                        {recentlyDone.map(task => (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground"
                                            >
                                                <CheckCircle size={14} className="text-green-500 shrink-0" />
                                                <span className="truncate flex-1">{task.title}</span>
                                                <span className="text-xs opacity-70 shrink-0">
                                                    {formatRelativeTime(task.completedAt!)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Calculate progress
    const progress = currentRun?.steps ? Math.min((currentRun.steps / 20) * 100, 100) : 0;

    return (
        <div className="h-full flex flex-col bg-background/40 backdrop-blur-md">
            {/* Header with task info and controls */}
            <div className="flex-shrink-0 border-b border-border bg-background/50">
                {/* Task Info */}
                <div className="p-3 border-b border-border/50">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {/* Status Icon */}
                                {isRunning && (
                                    <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />
                                )}
                                {currentRun?.status === 'completed' && (
                                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                                )}
                                {currentRun?.status === 'failed' && (
                                    <XCircle size={16} className="text-red-500 shrink-0" />
                                )}
                                {currentRun?.status === 'blocked' && (
                                    <AlertCircle size={16} className="text-yellow-500 shrink-0" />
                                )}

                                <h3 className="font-semibold text-sm truncate">
                                    {displayTaskTitle}
                                </h3>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-mono">{displayTaskId?.substring(0, 8)}</span>
                                {currentRun && (
                                    <>
                                        <span>•</span>
                                        <span className="capitalize">{currentRun.status}</span>
                                        <span>•</span>
                                        <span>{currentRun.steps} steps</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={handlePlay}
                                disabled={!canPlay}
                                className={cn(
                                    "p-2 rounded transition-colors",
                                    canPlay
                                        ? "hover:bg-green-500/20 text-green-500 hover:text-green-400"
                                        : "opacity-30 cursor-not-allowed text-muted-foreground"
                                )}
                                title="Run task"
                            >
                                <Play size={16} />
                            </button>

                            <button
                                onClick={handlePause}
                                disabled={!canPause}
                                className={cn(
                                    "p-2 rounded transition-colors",
                                    canPause
                                        ? "hover:bg-yellow-500/20 text-yellow-500 hover:text-yellow-400"
                                        : "opacity-30 cursor-not-allowed text-muted-foreground"
                                )}
                                title="Pause execution"
                            >
                                <Pause size={16} />
                            </button>

                            <button
                                onClick={handleStop}
                                disabled={!canStop}
                                className={cn(
                                    "p-2 rounded transition-colors",
                                    canStop
                                        ? "hover:bg-red-500/20 text-red-500 hover:text-red-400"
                                        : "opacity-30 cursor-not-allowed text-muted-foreground"
                                )}
                                title="Stop execution"
                            >
                                <Square size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {isRunning && (
                    <div className="px-3 py-2 bg-background/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span className="ml-auto">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20">
                        <div className="flex items-start gap-2 text-sm text-red-400">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-medium">Execution Error</div>
                                <div className="text-xs opacity-90 mt-0.5">{error}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Log Output */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                    <div className="p-2 border-b border-border/30 flex items-center justify-between bg-black/20">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Terminal size={12} />
                            <span>Output</span>
                        </div>
                        {currentRun && (
                            <span className="text-xs text-muted-foreground font-mono">
                                Run {currentRun.id.substring(0, 8)}
                            </span>
                        )}
                    </div>

                    <div className={cn(
                        "flex-1 overflow-auto p-3 font-mono text-xs",
                        wasCancelled ? "bg-red-950/40" : "bg-black/40"
                    )}>
                        {displayContent ? (
                            <div className="space-y-0.5">
                                <pre className={cn(
                                    "whitespace-pre-wrap break-all leading-relaxed",
                                    wasCancelled ? "text-red-400/90" : "text-green-400/90"
                                )}>
                                    {displayContent}
                                </pre>
                                {/* Loading indicator when still streaming */}
                                {isRunning && streamingContent && !wasCancelled && (
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-green-500/20">
                                        <span className="flex gap-0.5">
                                            <span className="w-1.5 h-1.5 bg-green-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-green-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-green-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                    </div>
                                )}
                                <div ref={logEndRef} />
                            </div>
                        ) : isRunning ? (
                            <div className="text-muted-foreground italic flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Starting agent...
                            </div>
                        ) : (
                            <div className="text-muted-foreground italic opacity-50">
                                No output yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
