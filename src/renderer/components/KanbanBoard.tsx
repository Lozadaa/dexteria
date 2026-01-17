import React, { useState } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useBoard } from '../hooks/useData';
import { useConfirm } from '../contexts/ConfirmContext';
import { TaskCard } from './TaskCard';
import { BoardSkeleton } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { Button, IconButton, Input } from 'adnia-ui';
import type { Task, Column as ColumnType, TaskStatus } from '../../shared/types';
import { Plus } from 'lucide-react';

// --- Column Component ---
interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onTaskDelete: (task: Task) => void;
    onTaskStop: (task: Task) => void;
    onTaskRun: (task: Task) => void;
    onCreateTask: (columnId: string) => void;
    activeTaskId?: string;
    isCreating?: boolean;
    creatingColumnId?: string;
    newTaskTitle: string;
    onNewTaskTitleChange: (title: string) => void;
    onSubmitNewTask: () => void;
    onCancelCreate: () => void;
    isDraggingOver?: boolean;
    draggedTask?: Task | null;
}

const Column: React.FC<ColumnProps> = ({
    column,
    tasks,
    onTaskClick,
    onTaskDelete,
    onTaskStop,
    onTaskRun,
    onCreateTask,
    activeTaskId,
    isCreating,
    creatingColumnId,
    newTaskTitle,
    onNewTaskTitleChange,
    onSubmitNewTask,
    onCancelCreate,
    isDraggingOver,
    draggedTask
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: { type: 'Column', column }
    });

    const isCreatingInThisColumn = isCreating && creatingColumnId === column.id;
    const showDropIndicator = (isDraggingOver || isOver) && draggedTask && draggedTask.status !== column.id;

    return (
        <div className={`flex flex-col h-full min-w-[280px] w-[280px] rounded-xl bg-muted/10 border overflow-hidden animate-fade-in-up animate-fill-both transition-all duration-200 ${showDropIndicator ? 'border-primary/50 bg-primary/5' : 'border-white/5'}`}>
            {/* Column Header */}
            <div className="p-3 border-b border-white/5 bg-background/20 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {column.title}
                    </span>
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-muted/30 text-[10px] text-muted-foreground">
                        {tasks.length}
                    </span>
                </div>
                {/* Add button */}
                <IconButton
                    variant="ghost"
                    size="xs"
                    onClick={() => onCreateTask(column.id)}
                    className="opacity-50 hover:opacity-100 hover:bg-white/10"
                    title="Crear nueva tarea"
                >
                    <Plus className="w-3.5 h-3.5" />
                </IconButton>
            </div>

            {/* Tasks Area */}
            <div
                ref={setNodeRef}
                className="flex-1 p-2 overflow-y-auto overflow-x-hidden space-y-2 scrollbar-thin"
            >
                {/* New Task Input Form */}
                {isCreatingInThisColumn && (
                    <div className="p-3 rounded-lg bg-card border border-primary/50 shadow-lg animate-scale-in">
                        <Input
                            value={newTaskTitle}
                            onChange={(e) => onNewTaskTitleChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTaskTitle.trim()) {
                                    onSubmitNewTask();
                                } else if (e.key === 'Escape') {
                                    onCancelCreate();
                                }
                            }}
                            placeholder="Nombre de la tarea..."
                            className="h-8 text-sm bg-background border-white/10"
                            autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                            <Button
                                onClick={onSubmitNewTask}
                                disabled={!newTaskTitle.trim()}
                                size="xs"
                                className="flex-1"
                            >
                                Crear
                            </Button>
                            <Button
                                variant="muted"
                                size="xs"
                                onClick={onCancelCreate}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}

                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onClick={onTaskClick}
                        onDelete={onTaskDelete}
                        onStop={onTaskStop}
                        onRun={onTaskRun}
                        isActive={activeTaskId === task.id}
                    />
                ))}

                {/* Drop placeholder - shows ghost of dragged card */}
                {showDropIndicator && draggedTask && (
                    <div className="p-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 opacity-60 animate-pulse">
                        <div className="text-sm font-medium text-primary/70 truncate">
                            {draggedTask.title}
                        </div>
                        <div className="text-xs text-primary/50 mt-1">
                            Drop here to move
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Kanban Board ---

interface KanbanBoardProps {
    onTaskSelect: (task: Task) => void;
    activeTaskId?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onTaskSelect, activeTaskId }) => {
    const { board, tasks, loading, error, moveTask, createTask, deleteTask, refresh, clearError } = useBoard();
    const { confirm } = useConfirm();
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleCreateTask = (columnId: string) => {
        setIsCreating(true);
        setCreatingColumnId(columnId);
        setNewTaskTitle('');
    };

    const handleCancelCreate = () => {
        setIsCreating(false);
        setCreatingColumnId(null);
        setNewTaskTitle('');
    };

    const handleSubmitNewTask = async () => {
        if (!newTaskTitle.trim() || !creatingColumnId) return;

        try {
            await createTask(newTaskTitle.trim(), creatingColumnId);
            handleCancelCreate();
        } catch (err) {
            console.error('Failed to create task:', err);
        }
    };

    const handleDeleteTask = async (task: Task) => {
        const confirmed = await confirm({
            title: 'Delete Task',
            message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            await deleteTask(task.id);
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    const handleStopTask = async (task: Task) => {
        try {
            await window.dexteria.agent.cancel();
            refresh();
        } catch (err) {
            console.error('Failed to stop task:', err);
        }
    };

    const handleRunTask = async (task: Task) => {
        try {
            await window.dexteria.agent.runTask(task.id, { mode: 'manual' });
            refresh();
        } catch (err) {
            console.error('Failed to run task:', err);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Task') {
            setActiveDragTask(event.active.data.current.task as Task);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const task = tasks.find(t => t.id === taskId);

        if (!task) return;

        // Dropped on a Column
        if (over.data.current?.type === 'Column') {
            const columnId = over.id as TaskStatus;
            if (task.status !== columnId) {
                moveTask(taskId, columnId);
            }
        }
        // Dropped on another Task (reorder) - Simplified for now, just takes status of target
        else if (over.data.current?.type === 'Task') {
            const overTask = over.data.current.task as Task;
            if (task.status !== overTask.status) {
                moveTask(taskId, overTask.status);
            }
            // Reordering within same column not implemented in store yet (just status update)
        }
    };

    // Use instant drop animation to prevent visual snap-back effect
    // The snap-back happens because DragOverlay animates while the state updates
    const dropAnimation: DropAnimation = {
        duration: 0,
        easing: 'linear',
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0',
                },
            },
        }),
    };

    if (loading && !board) {
        return <BoardSkeleton />;
    }

    if (error) {
        return (
            <div className="p-8">
                <ErrorDisplay
                    error={error}
                    variant="banner"
                    onRetry={refresh}
                    onDismiss={clearError}
                />
            </div>
        );
    }

    if (!board) {
        return <div className="p-8 text-center text-muted-foreground">No board data available</div>;
    }

    // Default columns if board is empty or structure is different
    const columns = board.columns && board.columns.length > 0
        ? board.columns
        : [
            { id: 'todo', title: 'To Do', taskIds: [] },
            { id: 'doing', title: 'In Progress', taskIds: [] },
            { id: 'done', title: 'Done', taskIds: [] }
        ];

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full w-full flex gap-4 overflow-x-auto p-4">
                {columns.map((col: any, index: number) => {
                    // Filter tasks for this column
                    let colTasks = tasks.filter(t => t.status === col.id);

                    // Sort tasks based on column type
                    if (col.id === 'done') {
                        // Done column: sort by completedAt descending (most recent first)
                        colTasks = colTasks.sort((a, b) => {
                            const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                            const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                            return bCompleted - aCompleted; // Descending order
                        });
                    } else {
                        // Other columns: sort by order field (ascending)
                        colTasks = colTasks.sort((a, b) => a.order - b.order);
                    }

                    return (
                        <div key={col.id} className={`animate-stagger-${index + 1}`}>
                            <Column
                                column={col}
                                tasks={colTasks}
                                onTaskClick={onTaskSelect}
                                onTaskDelete={handleDeleteTask}
                                onTaskStop={handleStopTask}
                                onTaskRun={handleRunTask}
                                onCreateTask={handleCreateTask}
                                activeTaskId={activeTaskId}
                                isCreating={isCreating}
                                creatingColumnId={creatingColumnId || undefined}
                                newTaskTitle={newTaskTitle}
                                onNewTaskTitleChange={setNewTaskTitle}
                                onSubmitNewTask={handleSubmitNewTask}
                                onCancelCreate={handleCancelCreate}
                                draggedTask={activeDragTask}
                            />
                        </div>
                    );
                })}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeDragTask ? (
                    <div className="rotate-2 cursor-grabbing w-[260px]">
                        <TaskCard task={activeDragTask} onClick={() => { }} isActive />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
