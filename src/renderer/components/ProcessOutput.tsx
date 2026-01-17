import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, IconButton } from 'adnia-ui';

interface ProcessOutputProps {
    type: 'run' | 'build';
    title: string;
}

interface ProcessStatus {
    type: string;
    running: boolean;
    pid?: number;
    runId?: string;
    startedAt?: string;
    command?: string;
}

export const ProcessOutput: React.FC<ProcessOutputProps> = ({ type, title }) => {
    const [output, setOutput] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState<ProcessStatus | null>(null);
    const outputEndRef = useRef<HTMLDivElement>(null);

    // Subscribe to output events
    useEffect(() => {
        const cleanup = window.dexteria?.project?.onOutput?.((data) => {
            if (data.type === type) {
                setOutput(prev => prev + data.data);
            }
        });
        return () => cleanup?.();
    }, [type]);

    // Subscribe to status events
    useEffect(() => {
        const cleanup = window.dexteria?.project?.onStatusUpdate?.((statusData: unknown) => {
            const s = statusData as ProcessStatus;
            if (s.type === type) {
                setIsRunning(s.running);
                setStatus(s);
                if (s.running) {
                    // Clear output when new process starts
                    setOutput('');
                }
            }
        });

        // Get initial status
        window.dexteria?.project?.getProcessStatus?.(type).then((s: unknown) => {
            const status = s as ProcessStatus;
            setIsRunning(status?.running || false);
            setStatus(status);
        });

        return () => cleanup?.();
    }, [type]);

    // Auto-scroll to bottom
    useEffect(() => {
        outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);

    const handleStart = async () => {
        try {
            if (type === 'run') {
                await window.dexteria.project.startRun();
            } else {
                await window.dexteria.project.startBuild();
            }
        } catch (err) {
            console.error(`Failed to start ${type}:`, err);
        }
    };

    const handleStop = async () => {
        try {
            if (type === 'run') {
                await window.dexteria.project.stopRun();
            } else {
                await window.dexteria.project.stopBuild();
            }
        } catch (err) {
            console.error(`Failed to stop ${type}:`, err);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background/40">
            {/* Controls bar */}
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <IconButton
                        variant={!isRunning ? "success" : "ghost"}
                        size="sm"
                        onClick={handleStart}
                        disabled={isRunning}
                        title={`Start ${type}`}
                    >
                        <Play size={14} />
                    </IconButton>
                    <IconButton
                        variant={isRunning ? "danger" : "ghost"}
                        size="sm"
                        onClick={handleStop}
                        disabled={!isRunning}
                        title={`Stop ${type}`}
                    >
                        <Square size={14} />
                    </IconButton>
                </div>
                {isRunning && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <Loader2 size={12} className="animate-spin" />
                        Running
                    </span>
                )}
            </div>

            {/* Command info */}
            {status?.command && (
                <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border/50 bg-muted/10">
                    <code>{status.command}</code>
                </div>
            )}

            {/* Output */}
            <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-black/40">
                {output ? (
                    <pre className="whitespace-pre-wrap break-all leading-relaxed text-green-400/90">
                        {output}
                        <div ref={outputEndRef} />
                    </pre>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground opacity-50">
                        <div className="text-center space-y-2">
                            <Terminal size={32} className="mx-auto opacity-30" />
                            <p className="text-sm">No output yet</p>
                            <p className="text-xs">Click Play to start the {type} process</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
