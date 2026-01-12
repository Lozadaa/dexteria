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
import type { Task, Column as ColumnType, TaskStatus } from '../../shared/types';
import { Plus } from 'lucide-react';

// --- Column Component ---
interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onTaskDelete: (task: Task) => void;
    onCreateTask: (columnId: string) => void;
    activeTaskId?: string;
    isCreating?: boolean;
    creatingColumnId?: string;
    newTaskTitle: string;
    onNewTaskTitleChange: (title: string) => void;
    onSubmitNewTask: () => void;
    onCancelCreate: () => void;
}

const Column: React.FC<ColumnProps> = ({
    column,
    tasks,
    onTaskClick,
    onTaskDelete,
    onCreateTask,
    activeTaskId,
    isCreating,
    creatingColumnId,
    newTaskTitle,
    onNewTaskTitleChange,
    onSubmitNewTask,
    onCancelCreate
}) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', column }
    });

    const isCreatingInThisColumn = isCreating && creatingColumnId === column.id;

    return (
        <div className="flex flex-col h-full min-w-[280px] w-[280px] rounded-xl bg-muted/10 border border-white/5 overflow-hidden">
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
                <button
                    onClick={() => onCreateTask(column.id)}
                    className="p-1 hover:bg-white/10 rounded opacity-50 hover:opacity-100 transition"
                    title="Crear nueva tarea"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Tasks Area */}
            <div
                ref={setNodeRef}
                className="flex-1 p-2 overflow-y-auto overflow-x-hidden space-y-2 scrollbar-thin"
            >
                {/* New Task Input Form */}
                {isCreatingInThisColumn && (
                    <div className="p-3 rounded-lg bg-card border border-primary/50 shadow-lg">
                        <input
                            type="text"
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
                            className="w-full px-2 py-1.5 text-sm bg-background border border-white/10 rounded focus:outline-none focus:border-primary/50"
                            autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={onSubmitNewTask}
                                disabled={!newTaskTitle.trim()}
                                className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Crear
                            </button>
                            <button
                                onClick={onCancelCreate}
                                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onClick={onTaskClick}
                        onDelete={onTaskDelete}
                        isActive={activeTaskId === task.id}
                    />
                ))}
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
                {columns.map((col: any) => {
                    // Filter tasks for this column.
                    // IMPORTANT: Store might have order in col.taskIds, or we just filter by status.
                    // For simplicity in this iteration, filter by status.
                    const colTasks = tasks.filter(t => t.status === col.id);
                    return (
                        <Column
                            key={col.id}
                            column={col}
                            tasks={colTasks} // Sort by order if available
                            onTaskClick={onTaskSelect}
                            onTaskDelete={handleDeleteTask}
                            onCreateTask={handleCreateTask}
                            activeTaskId={activeTaskId}
                            isCreating={isCreating}
                            creatingColumnId={creatingColumnId || undefined}
                            newTaskTitle={newTaskTitle}
                            onNewTaskTitleChange={setNewTaskTitle}
                            onSubmitNewTask={handleSubmitNewTask}
                            onCancelCreate={handleCancelCreate}
                        />
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
