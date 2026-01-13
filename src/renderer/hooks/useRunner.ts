import { useState, useEffect, useCallback } from 'react';
import type { Task, AgentRun } from '../../shared/types';

const POLL_INTERVAL = 1000; // Poll every second for active runs

export interface RunnerState {
    currentTask: Task | null;
    currentRun: AgentRun | null;
    log: string;
    streamingContent: string;
    streamingTaskId: string | null;
    streamingTaskTitle: string | null;
    isRunning: boolean;
    wasCancelled: boolean;
    error: string | null;
    canPlay: boolean;
    canPause: boolean;
    canStop: boolean;
}

export function useRunner() {
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
    const [log, setLog] = useState<string>('');
    const [streamingContent, setStreamingContent] = useState<string>('');
    const [streamingTaskId, setStreamingTaskId] = useState<string | null>(null);
    const [streamingTaskTitle, setStreamingTaskTitle] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [wasCancelled, setWasCancelled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch current run and task
    const fetchRunState = useCallback(async () => {
        try {
            // Check if agent is running
            const running = await window.dexteria.agent.isRunning();
            setIsRunning(running);

            if (running) {
                // Get current run
                const run = await window.dexteria.agent.getCurrentRun() as AgentRun | null;

                if (run) {
                    setCurrentRun(run);

                    // Get task details
                    const task = await window.dexteria.tasks.get(run.taskId) as Task;
                    setCurrentTask(task);

                    // Get log output
                    try {
                        const logContent = await window.dexteria.runs.tailLog(run.taskId, run.id, 200);
                        if (logContent) {
                            setLog(logContent);
                        }
                    } catch (err) {
                        console.error('Failed to fetch log:', err);
                    }

                    // Set error if run failed
                    if (run.status === 'failed' && run.error) {
                        setError(run.error);
                    } else {
                        setError(null);
                    }
                } else {
                    // No current run but running? Clear state
                    setCurrentRun(null);
                    setCurrentTask(null);
                    setLog('');
                    setError(null);
                }
            } else {
                // Not running - check if we have a recently completed run to display
                if (currentRun && currentRun.status === 'running') {
                    // Run just completed, fetch final state
                    try {
                        const metadata = await window.dexteria.runs.getMetadata(
                            currentRun.taskId,
                            currentRun.id
                        ) as AgentRun | null;

                        if (metadata) {
                            setCurrentRun(metadata);

                            // Get final log
                            const logContent = await window.dexteria.runs.getLog(
                                currentRun.taskId,
                                currentRun.id
                            );
                            if (logContent) {
                                setLog(logContent);
                            }

                            // Set error if failed
                            if (metadata.status === 'failed' && metadata.error) {
                                setError(metadata.error);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to fetch completed run:', err);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch run state:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch run state');
        }
    }, [currentRun]);

    // Poll for updates
    useEffect(() => {
        fetchRunState();
        const interval = setInterval(fetchRunState, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchRunState]);

    // Listen for streaming updates
    useEffect(() => {
        const cleanup = window.dexteria?.agent?.onStreamUpdate?.((data) => {
            console.log('[Runner] Stream update:', data.taskId, 'done:', data.done, 'cancelled:', data.cancelled, 'len:', data.content.length);
            setStreamingContent(data.content);
            setStreamingTaskId(data.taskId);
            if (data.taskTitle) {
                setStreamingTaskTitle(data.taskTitle);
            }
            setIsRunning(!data.done);
            setWasCancelled(data.cancelled || false);
            if (data.done) {
                // Streaming complete - clear after a delay so user can see final state
                setTimeout(() => {
                    setStreamingTaskId(null);
                    setStreamingTaskTitle(null);
                    setWasCancelled(false);
                }, 5000);
            }
        });
        return () => cleanup?.();
    }, []);

    // Control handlers
    const handlePlay = useCallback(async () => {
        if (!currentTask) return;

        try {
            setError(null);
            const result = await window.dexteria.agent.runTask(currentTask.id, { mode: 'manual' });

            if (!result.success) {
                setError(result.error || 'Failed to start task');
            }
        } catch (err) {
            console.error('Failed to run task:', err);
            setError(err instanceof Error ? err.message : 'Failed to run task');
        }
    }, [currentTask]);

    const handlePause = useCallback(async () => {
        try {
            await window.dexteria.ralph.pause();
        } catch (err) {
            console.error('Failed to pause:', err);
            setError(err instanceof Error ? err.message : 'Failed to pause');
        }
    }, []);

    const handleStop = useCallback(async () => {
        try {
            await window.dexteria.agent.cancel();
            setIsRunning(false);
        } catch (err) {
            console.error('Failed to stop:', err);
            setError(err instanceof Error ? err.message : 'Failed to stop');
        }
    }, []);

    // Determine control availability
    const canPlay = !isRunning && currentTask !== null;
    const canPause = isRunning; // Note: Pause might not be fully implemented yet
    const canStop = isRunning;

    return {
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
        refresh: fetchRunState,
    };
}
