import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Maximize2, Minimize2 } from 'lucide-react';
import { useAgentState } from '../hooks/useData';

export const LogViewer: React.FC = () => {
    const [log, setLog] = useState<string>('');
    const { state } = useAgentState();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Poll for logs of current task run
    useEffect(() => {
        if (!state?.currentTaskId) return;

        // We'll just tail the log for now.
        // Ideally we need runId. If state has lastRunId use that.
        // Store's getPendingTasks returns tasks, but we need active run.
        // Let's assume we can get log by taskId for "latest run" or just mock it for now.
        // Or fetch `state.currentRunId` if available (it wasn't in AgentState interface I wrote).
        // I added `activeChatId`, `currentTaskId`. 
        // I should have added `currentRunId` to AgentState. However, I can fetch `tasks:get(currentTaskId)` to get `runtime.lastRunId`.

        let interval: NodeJS.Timeout;

        const fetchLog = async () => {
            // simplified: get log for current task
            if (state.currentTaskId) {
                // Try to get active run
                try {
                    const run = await window.dexteria.agent.getCurrentRun();
                    if (run) {
                        const l = await window.dexteria.runs.tailLog(run.taskId, run.id, 100);
                        if (l) setLog(l);
                    }
                } catch (e) { console.error(e); }
            }
        };

        interval = setInterval(fetchLog, 1000);
        return () => clearInterval(interval);

    }, [state?.currentTaskId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    return (
        <div className="h-full flex flex-col font-mono text-xs">
            <div className="p-2 border-b border-white/5 flex items-center justify-between text-muted-foreground bg-black/20">
                <div className="flex items-center gap-2">
                    <Terminal size={12} />
                    <span>Output</span>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1 text-green-400 bg-black/40">
                {log ? (
                    <pre className="whitespace-pre-wrap break-all">{log}</pre>
                ) : (
                    <div className="text-muted-foreground opacity-50 italic">No output...</div>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
