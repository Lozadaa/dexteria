import React, { useEffect, useRef } from 'react';
import { Play, Pause, Square, Terminal, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRunner } from '../../hooks/useRunner';
import { cn } from '../../lib/utils';

export const TaskRunner: React.FC = () => {
    const {
        currentTask,
        currentRun,
        log,
        isRunning,
        error,
        handlePlay,
        handlePause,
        handleStop,
        canPlay,
        canPause,
        canStop,
    } = useRunner();

    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when log updates
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    // If no task is running, show idle state
    if (!currentTask && !isRunning) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                    <Terminal size={48} className="mx-auto opacity-30" />
                    <p className="text-sm">No task running</p>
                    <p className="text-xs opacity-70">Run a task to see execution details</p>
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
                                    {currentTask?.title || 'Unknown Task'}
                                </h3>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-mono">{currentTask?.id?.substring(0, 8)}</span>
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

                    <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-black/40">
                        {log ? (
                            <div className="space-y-0.5">
                                <pre className="whitespace-pre-wrap break-all text-green-400/90 leading-relaxed">
                                    {log}
                                </pre>
                                <div ref={logEndRef} />
                            </div>
                        ) : isRunning ? (
                            <div className="text-muted-foreground italic flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Waiting for output...
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
