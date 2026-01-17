import React, { useState, useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import { Badge, Button } from 'adnia-ui';
import { GripVertical, AlertCircle, CheckCircle, Clock, Ban, Trash2, Loader2, StopCircle, Play } from 'lucide-react';
import { DoneTimeChip } from './DoneTimeChip';
import type { Task } from '../../shared/types';

interface TaskCardProps {
    task: Task;
    onClick: (task: Task) => void;
    onDelete?: (task: Task) => void;
    onStop?: (task: Task) => void;
    onRun?: (task: Task) => void;
    isActive?: boolean;
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDelete, onStop, onRun, isActive }) => {
    const [isStopping, setIsStopping] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { type: 'Task', task }
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

    const isRunning = task.runtime?.status === 'running';

    return (
        <>
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(task)}
            onContextMenu={handleContextMenu}
            className={cn(
                "group relative flex flex-col gap-2 p-3 rounded-lg border bg-card/50 backdrop-blur-sm shadow-sm cursor-grab active:cursor-grabbing",
                "transition-all duration-200 ease-out hover:bg-card/70 hover:shadow-md hover:-translate-y-0.5",
                "animate-fade-in-up animate-fill-both",
                isActive && "ring-2 ring-primary border-primary",
                isRunning && "ring-2 ring-green-500/50 border-green-500/50 bg-green-500/5 animate-glow-pulse",
                "border-white/5"
            )}
        >
            {/* Running indicator overlay with stop button */}
            {isRunning && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Badge className="bg-green-500/20 border-green-500/30 text-green-400 text-[10px] px-2 py-1">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        {isStopping ? 'Stopping...' : 'Running'}
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
                            title="Stop execution"
                        >
                            <StopCircle className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            )}

            <div className="flex items-start justify-between gap-2">
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

            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div title={`Priority: ${task.priority}`}>
                        {PriorityIcons[task.priority]}
                    </div>
                    <span className="uppercase tracking-wider text-[10px] opacity-70 font-mono">{task.id}</span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Delete button - appears on hover */}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500"
                            onClick={handleDelete}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Delete task"
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
                        Ejecutar tarea
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="ghost"
                        className="w-full justify-start rounded-none h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={handleDelete}
                    >
                        <Trash2 size={14} className="mr-2" />
                        Borrar
                    </Button>
                )}
            </div>
        )}
        </>
    );
};
