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
import { useTemplates } from '../hooks/useTemplates';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { TaskCard } from './TaskCard';
import { BoardSkeleton } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { Button, IconButton, Input } from 'adnia-ui';
import type { Task, Column as ColumnType, TaskStatus } from '../../shared/types';
import { Plus, LayoutGrid, MessageSquare, Search, X, Filter, Tag, FileText, CheckSquare, Trash2, Move } from 'lucide-react';
import { t } from '../i18n/t';
import { cn } from '../lib/utils';

// --- Column Component ---
interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    allTasks: Task[];  // All tasks for dependency checking
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
    templates?: { id: string; name: string; category?: string }[];
    selectedTemplateId?: string;
    onTemplateChange?: (templateId: string) => void;
    // Bulk selection props
    isSelectionMode?: boolean;
    selectedTaskIds?: Set<string>;
    onSelectionChange?: (task: Task, selected: boolean) => void;
}

const Column: React.FC<ColumnProps> = ({
    column,
    tasks,
    allTasks,
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
    draggedTask,
    templates,
    selectedTemplateId,
    onTemplateChange,
    isSelectionMode,
    selectedTaskIds,
    onSelectionChange,
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
                    title={t('tooltips.newTask')}
                    aria-label={t('tooltips.newTask')}
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
                            placeholder={t('placeholders.taskName')}
                            className="h-8 text-sm bg-background border-white/10"
                            autoFocus
                        />
                        {/* Template selector */}
                        {templates && templates.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <FileText className={cn(
                                    "w-3.5 h-3.5 flex-shrink-0",
                                    selectedTemplateId ? "text-primary" : "text-muted-foreground"
                                )} />
                                <select
                                    value={selectedTemplateId || ''}
                                    onChange={(e) => onTemplateChange?.(e.target.value)}
                                    className={cn(
                                        "flex-1 h-7 px-2 pr-6 text-xs rounded-md cursor-pointer transition-colors truncate",
                                        "bg-background border border-border hover:border-primary/50",
                                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                                        "appearance-none bg-no-repeat bg-right",
                                        selectedTemplateId && "border-primary/50 bg-primary/5"
                                    )}
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                        backgroundPosition: 'right 0.4rem center'
                                    }}
                                    title={t('tooltips.selectTemplate')}
                                >
                                    <option value="">{t('views.kanban.noTemplate')}</option>
                                    {templates.map(tmpl => (
                                        <option key={tmpl.id} value={tmpl.id}>
                                            {tmpl.category ? `[${tmpl.category}] ` : ''}{tmpl.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex gap-2 mt-2">
                            <Button
                                onClick={onSubmitNewTask}
                                disabled={!newTaskTitle.trim()}
                                size="xs"
                                className="flex-1"
                            >
                                {t('actions.create')}
                            </Button>
                            <Button
                                variant="muted"
                                size="xs"
                                onClick={onCancelCreate}
                            >
                                {t('actions.cancel')}
                            </Button>
                        </div>
                    </div>
                )}

                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        allTasks={allTasks}
                        onClick={onTaskClick}
                        onDelete={onTaskDelete}
                        onStop={onTaskStop}
                        onRun={onTaskRun}
                        isActive={activeTaskId === task.id}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedTaskIds?.has(task.id)}
                        onSelectionChange={onSelectionChange}
                    />
                ))}

                {/* Drop placeholder - shows ghost of dragged card */}
                {showDropIndicator && draggedTask && (
                    <div className="p-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 opacity-60 animate-pulse">
                        <div className="text-sm font-medium text-primary/70 truncate">
                            {draggedTask.title}
                        </div>
                        <div className="text-xs text-primary/50 mt-1">
                            {t('views.kanban.dragToMove')}
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
    const { templates } = useTemplates();
    const { confirm } = useConfirm();
    const { success, info, error: showError } = useToast();
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');

    // Bulk selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    const handleSelectionChange = (task: Task, selected: boolean) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (selected) {
                next.add(task.id);
            } else {
                next.delete(task.id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        const allIds = filteredTasks.map(t => t.id);
        setSelectedTaskIds(new Set(allIds));
    };

    const handleDeselectAll = () => {
        setSelectedTaskIds(new Set());
    };

    const handleExitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedTaskIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedTaskIds.size === 0) return;

        const confirmed = await confirm({
            title: t('views.kanban.bulkDeleteTitle'),
            message: t('views.kanban.bulkDeleteMessage', { count: selectedTaskIds.size }),
            confirmLabel: t('actions.delete'),
            variant: 'danger',
        });

        if (confirmed) {
            for (const taskId of selectedTaskIds) {
                await deleteTask(taskId);
            }
            success(t('toasts.tasksDeleted', { count: selectedTaskIds.size }));
            handleExitSelectionMode();
            refresh();
        }
    };

    const handleBulkMove = async (targetStatus: TaskStatus) => {
        if (selectedTaskIds.size === 0) return;

        for (const taskId of selectedTaskIds) {
            await moveTask(taskId, targetStatus);
        }
        success(t('toasts.tasksMoved', { count: selectedTaskIds.size }));
        handleExitSelectionMode();
        refresh();
    };

    const handleCreateTask = (columnId: string) => {
        setIsCreating(true);
        setCreatingColumnId(columnId);
        setNewTaskTitle('');
        setSelectedTemplateId('');
    };

    const handleCancelCreate = () => {
        setIsCreating(false);
        setCreatingColumnId(null);
        setNewTaskTitle('');
        setSelectedTemplateId('');
    };

    const handleSubmitNewTask = async () => {
        if (!newTaskTitle.trim() || !creatingColumnId) return;

        try {
            const task = await createTask(newTaskTitle.trim(), creatingColumnId);

            // If a template was selected, apply its fields to the new task
            if (selectedTemplateId && task) {
                const template = templates.find(t => t.id === selectedTemplateId);
                if (template) {
                    const patch: Record<string, unknown> = {};
                    if (template.descriptionTemplate) patch.description = template.descriptionTemplate;
                    if (template.priority) patch.priority = template.priority;
                    if (template.acceptanceCriteria?.length) patch.acceptanceCriteria = template.acceptanceCriteria;
                    if (template.tags?.length) patch.tags = template.tags;
                    if (template.epic) patch.epic = template.epic;
                    if (template.humanOnly !== undefined) patch.humanOnly = template.humanOnly;
                    if (template.aiReviewable !== undefined) patch.aiReviewable = template.aiReviewable;
                    if (template.reviewCriteria) patch.reviewCriteria = template.reviewCriteria;

                    if (Object.keys(patch).length > 0) {
                        await window.dexteria.tasks.update(task.id, patch);
                        await refresh();
                    }
                }
            }

            // Show success toast
            success(t('toasts.taskCreated'));
            handleCancelCreate();
        } catch (err) {
            console.error('Failed to create task:', err);
            showError(t('toasts.taskCreateFailed'));
        }
    };

    const handleDeleteTask = async (task: Task) => {
        const confirmed = await confirm({
            title: t('dialogs.deleteTask.title'),
            message: t('dialogs.deleteTask.message', { title: task.title }),
            confirmText: t('actions.delete'),
            cancelText: t('actions.cancel'),
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            await deleteTask(task.id);
            success(t('toasts.taskDeleted'));
        } catch (err) {
            console.error('Failed to delete task:', err);
            showError(t('toasts.taskDeleteFailed'));
        }
    };

    const handleStopTask = async (_task: Task) => {
        try {
            await window.dexteria.agent.cancel();
            refresh();
        } catch (err) {
            console.error('Failed to stop task:', err);
            showError(t('toasts.taskStopFailed'));
        }
    };

    const handleRunTask = async (task: Task) => {
        try {
            // Show info toast that execution started
            info(t('toasts.taskExecutionStarted', { title: task.title }));
            await window.dexteria.agent.runTask(task.id, { mode: 'manual' });
            refresh();
        } catch (err) {
            console.error('Failed to run task:', err);
            showError(t('toasts.taskExecutionFailed'));
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
            const task = event.active.data.current.task as Task;
            // Prevent dragging tasks that are currently running
            if (task.runtime?.status === 'running') {
                return;
            }
            setActiveDragTask(task);
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
                success(t('toasts.taskMoved'));
            }
        }
        // Dropped on another Task (reorder) - Simplified for now, just takes status of target
        else if (over.data.current?.type === 'Task') {
            const overTask = over.data.current.task as Task;
            if (task.status !== overTask.status) {
                moveTask(taskId, overTask.status);
                success(t('toasts.taskMoved'));
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
        return <div className="p-8 text-center text-muted-foreground">{t('views.kanban.noBoardData')}</div>;
    }

    // Default columns if board is empty or structure is different
    const columns = board.columns && board.columns.length > 0
        ? board.columns
        : [
            { id: 'todo', title: 'To Do', taskIds: [] },
            { id: 'doing', title: 'In Progress', taskIds: [] },
            { id: 'done', title: 'Done', taskIds: [] }
        ];

    // Check if board is completely empty (no tasks at all)
    const isEmptyBoard = tasks.length === 0;

    // Collect all unique tags from tasks for the filter dropdown
    const allTags = Array.from(new Set(tasks.flatMap(t => t.tags || []))).sort();

    // Apply search and filter to tasks
    const filteredTasks = tasks.filter(task => {
        // Search filter (title, id, or tags)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = task.title.toLowerCase().includes(query);
            const matchesId = task.id.toLowerCase().includes(query);
            const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(query));
            if (!matchesTitle && !matchesId && !matchesTags) return false;
        }
        // Priority filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
        // Tag filter
        if (tagFilter !== 'all' && !task.tags?.includes(tagFilter)) return false;
        return true;
    });

    const hasActiveFilters = searchQuery.trim() !== '' || priorityFilter !== 'all' || tagFilter !== 'all';
    const clearFilters = () => {
        setSearchQuery('');
        setPriorityFilter('all');
        setTagFilter('all');
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full w-full flex flex-col">
                {/* Search and Filter Bar */}
                {!isEmptyBoard && (
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-background/50 backdrop-blur-sm">
                        {/* Bulk selection toggle - prominent position at start */}
                        <Button
                            variant={isSelectionMode ? "default" : "outline"}
                            size="xs"
                            onClick={() => isSelectionMode ? handleExitSelectionMode() : setIsSelectionMode(true)}
                            className={cn(
                                "text-xs h-8 px-3 gap-1.5 shrink-0",
                                isSelectionMode && "bg-primary text-primary-foreground"
                            )}
                            title={t('views.kanban.selectMultiple')}
                        >
                            <CheckSquare className="w-4 h-4" />
                            {isSelectionMode ? t('views.kanban.exitSelect') : t('views.kanban.select')}
                        </Button>

                        {/* Search input */}
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('views.kanban.searchPlaceholder')}
                                className="pl-8 h-8 text-sm bg-muted/20 border-white/10"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        {/* Priority filter */}
                        <div className="flex items-center gap-1.5">
                            <Filter className={cn(
                                "w-4 h-4",
                                priorityFilter !== 'all' ? "text-primary" : "text-muted-foreground"
                            )} />
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className={cn(
                                    "h-8 px-3 pr-7 text-xs rounded-md cursor-pointer transition-colors",
                                    "bg-background border border-border hover:border-primary/50",
                                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                                    "appearance-none bg-no-repeat bg-right",
                                    priorityFilter !== 'all' && "border-primary/50 bg-primary/5"
                                )}
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                    backgroundPosition: 'right 0.5rem center'
                                }}
                            >
                                <option value="all">{t('views.kanban.allPriorities')}</option>
                                <option value="critical">{t('views.kanban.priorityCritical')}</option>
                                <option value="high">{t('views.kanban.priorityHigh')}</option>
                                <option value="medium">{t('views.kanban.priorityMedium')}</option>
                                <option value="low">{t('views.kanban.priorityLow')}</option>
                            </select>
                        </div>
                        {/* Tag filter - only show if there are tags */}
                        {allTags.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Tag className={cn(
                                    "w-4 h-4",
                                    tagFilter !== 'all' ? "text-primary" : "text-muted-foreground"
                                )} />
                                <select
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    className={cn(
                                        "h-8 px-3 pr-7 text-xs rounded-md cursor-pointer transition-colors",
                                        "bg-background border border-border hover:border-primary/50",
                                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                                        "appearance-none bg-no-repeat bg-right",
                                        tagFilter !== 'all' && "border-primary/50 bg-primary/5"
                                    )}
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                        backgroundPosition: 'right 0.5rem center'
                                    }}
                                >
                                    <option value="all">{t('views.kanban.allTags')}</option>
                                    {allTags.map(tag => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {/* Clear filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={clearFilters}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3 mr-1" />
                                {t('views.kanban.clearFilters')}
                            </Button>
                        )}
                        {/* Filter count */}
                        {hasActiveFilters && (
                            <span className="text-xs text-muted-foreground">
                                {filteredTasks.length} / {tasks.length}
                            </span>
                        )}

                        {/* Bulk selection actions - only when in selection mode */}
                        {isSelectionMode && (
                            <>
                                <div className="w-px h-6 bg-border mx-1" />
                                <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5">
                                    <span className="text-xs font-semibold text-primary">
                                        {selectedTaskIds.size} {t('views.kanban.selected')}
                                    </span>
                                    <div className="w-px h-4 bg-primary/20" />
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={handleSelectAll}
                                        className="text-xs h-6 px-2 text-primary hover:bg-primary/20"
                                        disabled={selectedTaskIds.size === filteredTasks.length}
                                    >
                                        {t('views.kanban.selectAll')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={handleDeselectAll}
                                        className="text-xs h-6 px-2 text-primary hover:bg-primary/20"
                                        disabled={selectedTaskIds.size === 0}
                                    >
                                        {t('views.kanban.deselectAll')}
                                    </Button>
                                    {selectedTaskIds.size > 0 && (
                                        <>
                                            <div className="w-px h-4 bg-primary/20" />
                                            {/* Move dropdown */}
                                            <div className="relative group/move">
                                                <Button
                                                    variant="soft"
                                                    size="xs"
                                                    className="text-xs h-6 px-2 gap-1"
                                                >
                                                    <Move className="w-3 h-3" />
                                                    {t('views.kanban.moveTo')}
                                                </Button>
                                                <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl opacity-0 invisible group-hover/move:opacity-100 group-hover/move:visible transition-all duration-150 z-[100] min-w-[140px] py-1">
                                                    {board.columns.map(col => (
                                                        <button
                                                            key={col.id}
                                                            onClick={() => handleBulkMove(col.id as TaskStatus)}
                                                            className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                                                        >
                                                            {col.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Delete */}
                                            <Button
                                                variant="danger-soft"
                                                size="xs"
                                                onClick={handleBulkDelete}
                                                className="text-xs h-6 px-2 gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                {t('actions.delete')}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
                <div className="flex-1 flex gap-4 overflow-x-auto p-4 relative">
                {/* Empty board onboarding overlay */}
                {isEmptyBoard && !isCreating && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="text-center p-8 bg-background/90 backdrop-blur-md rounded-2xl border border-primary/20 shadow-2xl pointer-events-auto max-w-lg">
                            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <LayoutGrid size={32} className="text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('views.kanban.emptyBoardTitle')}</h3>
                            <p className="text-muted-foreground mb-6">
                                {t('views.kanban.emptyBoardSubtitle')}
                            </p>

                            {/* Two action options */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                                <Button
                                    onClick={() => handleCreateTask('todo')}
                                    className="gap-2"
                                >
                                    <Plus size={16} />
                                    {t('views.kanban.createFirstTask')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        // Focus on chat panel - emit event or use docking context
                                        const chatTab = document.querySelector('[data-view-id="chat"]');
                                        if (chatTab) (chatTab as HTMLElement).click();
                                    }}
                                    className="gap-2"
                                >
                                    <MessageSquare size={16} />
                                    {t('views.kanban.askAIForHelp')}
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                {t('views.kanban.getStartedTip')}
                            </p>
                        </div>
                    </div>
                )}
                {columns.map((col: any, index: number) => {
                    // Filter tasks for this column (using filteredTasks for search/filter)
                    let colTasks = filteredTasks.filter(t => t.status === col.id);

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
                                allTasks={tasks}
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
                                templates={templates}
                                selectedTemplateId={selectedTemplateId}
                                onTemplateChange={setSelectedTemplateId}
                                isSelectionMode={isSelectionMode}
                                selectedTaskIds={selectedTaskIds}
                                onSelectionChange={handleSelectionChange}
                            />
                        </div>
                    );
                })}
                </div>
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
