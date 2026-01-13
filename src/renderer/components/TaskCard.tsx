import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import { GripVertical, AlertCircle, CheckCircle, Clock, Ban, Trash2 } from 'lucide-react';
import { DoneTimeChip } from './DoneTimeChip';
import type { Task } from '../../shared/types';

interface TaskCardProps {
    task: Task;
    onClick: (task: Task) => void;
    onDelete?: (task: Task) => void;
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDelete, isActive }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { type: 'Task', task }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete?.(task);
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
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(task)}
            className={cn(
                "group relative flex flex-col gap-2 p-3 rounded-lg border bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:bg-card/70 hover:shadow-md cursor-grab active:cursor-grabbing",
                isActive && "ring-2 ring-primary border-primary",
                "border-white/5"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium leading-tight line-clamp-2 text-card-foreground flex-1">
                    {task.title}
                </span>
                <div className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <button
                            onClick={handleDelete}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all"
                            title="Delete task"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}

                    {/* Show completion time for done tasks */}
                    {task.status === 'done' && task.completedAt ? (
                        <DoneTimeChip completedAt={task.completedAt} />
                    ) : (
                        <div
                            className={cn(
                                "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border bg-muted/30",
                                task.status === 'blocked' && "bg-red-500/10 text-red-400 border-red-500/20",
                                task.status === 'doing' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                            )}
                        >
                            {StatusIcons[task.status] || StatusIcons.todo}
                            <span className="capitalize">{task.status}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
