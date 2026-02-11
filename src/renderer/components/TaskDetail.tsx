import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useActiveTask, useBoard } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';
import { Play, RotateCw, Plus, X, Link, ChevronDown, Search, CheckCircle, XCircle, AlertCircle, Edit2, Trash2, Check, Ban, GripHorizontal, Tag, Calendar, User, Sparkles, Loader2, MoreVertical, Copy, Hash } from 'lucide-react';
import { TaskComments } from './TaskComments';
import { Button, IconButton, Input, Textarea, ScrollArea } from 'adnia-ui';
import { Slot } from './extension/Slot';
import { EPIC_COLORS, type AnalysisResult } from './TaskDetail/index';
import type { RunTaskOptions, AcceptanceCriterionResult, TaskEpic } from '../../shared/types';

import { useTranslation } from '../i18n/useTranslation';
interface TaskDetailProps {
    taskId: string;
    onClose: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onClose }) => {
    const { t } = useTranslation();
    // useActiveTask polls specifically for this task which is good for run updates
    const { task, loading } = useActiveTask(taskId);
    const { tasks, refresh, deleteTask } = useBoard();
    const { mode, triggerPlannerBlock } = useMode();
    const { confirm } = useConfirm();
    const { warning, error: showError } = useToast();
    const [isRunning, setIsRunning] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [showDepDropdown, setShowDepDropdown] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [newCriterion, setNewCriterion] = useState('');
    const [editingCriterionIndex, setEditingCriterionIndex] = useState<number | null>(null);
    const [editingCriterionText, setEditingCriterionText] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [descriptionText, setDescriptionText] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleText, setTitleText] = useState('');
    const [isEditingAgentPlan, setIsEditingAgentPlan] = useState(false);
    const [agentGoalText, setAgentGoalText] = useState('');
    const [agentScopeText, setAgentScopeText] = useState('');

    // Epic and Sprint editing state
    const [isEditingEpic, setIsEditingEpic] = useState(false);
    const [epicName, setEpicName] = useState('');
    const [epicColor, setEpicColor] = useState(EPIC_COLORS[0]);
    const [isEditingSprint, setIsEditingSprint] = useState(false);
    const [sprintText, setSprintText] = useState('');

    // Tags editing state
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [newTagText, setNewTagText] = useState('');

    // Task menu (more options)
    const [showTaskMenu, setShowTaskMenu] = useState(false);
    const taskMenuRef = useRef<HTMLDivElement>(null);

    // Resizable comments panel
    const [commentsPanelHeight, setCommentsPanelHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startYRef.current = e.clientY;
        startHeightRef.current = commentsPanelHeight;
    }, [commentsPanelHeight]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = startYRef.current - e.clientY;
            const newHeight = Math.max(100, Math.min(600, startHeightRef.current + delta));
            setCommentsPanelHeight(newHeight);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Close task menu on click outside
    useEffect(() => {
        if (!showTaskMenu) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (taskMenuRef.current && !taskMenuRef.current.contains(e.target as Node)) {
                setShowTaskMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTaskMenu]);

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">{t('common.loadingTaskDetails')}</div>;
    }

    if (!task) {
        return <div className="p-4 text-center text-muted-foreground">{t('views.taskDetail.notFound')}</div>;
    }

    // Get tasks that can be added as dependencies (exclude self and already added)
    const currentDeps = task.dependsOn || [];
    const availableTasks = tasks.filter(t =>
        t.id !== task.id && !currentDeps.includes(t.id)
    );

    // Get task info by ID
    const getTaskById = (id: string) => tasks.find(t => t.id === id);

    const handleRun = async (runMode: 'manual' | 'auto' = 'manual') => {
        // Check if we're in planner mode
        if (mode === 'planner') {
            triggerPlannerBlock();
            return;
        }

        setIsRunning(true);
        try {
            const options: RunTaskOptions = { mode: runMode };
            await window.dexteria.agent.runTask(task.id, options);
            refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setIsRunning(false);
        }
    };

    // Handler for TaskComments component
    const handleAddCommentFromComponent = async (content: string, type: 'note' | 'instruction') => {
        try {
            await window.dexteria.tasks.addTypedComment(task.id, type, 'user', content);
            refresh();
        } catch (err) {
            console.error(err);
        }
    };

    // Retry task with comment context
    const handleRetryWithContext = async () => {
        // Check if we're in planner mode
        if (mode === 'planner') {
            triggerPlannerBlock();
            return;
        }

        setIsRetrying(true);
        try {
            const options: RunTaskOptions = { mode: 'manual' };
            await window.dexteria.agent.runTask(task.id, options);
            refresh();
        } catch (err) {
            console.error('Retry failed:', err);
        } finally {
            setIsRetrying(false);
        }
    };

    const handleAddDependency = async (depId: string) => {
        try {
            const newDeps = [...currentDeps, depId];
            await window.dexteria.tasks.update(task.id, { dependsOn: newDeps });
            setShowDepDropdown(false);
            refresh();
        } catch (err) {
            console.error('Failed to add dependency:', err);
            showError(t('toasts.taskDependencyFailed'));
        }
    };

    const handleRemoveDependency = async (depId: string) => {
        try {
            const newDeps = currentDeps.filter(d => d !== depId);
            await window.dexteria.tasks.update(task.id, { dependsOn: newDeps });
            refresh();
        } catch (err) {
            console.error('Failed to remove dependency:', err);
            showError(t('toasts.taskDependencyFailed'));
        }
    };

    const handleAddCriterion = async () => {
        if (!newCriterion.trim()) return;
        try {
            const currentCriteria = task.acceptanceCriteria || [];
            await window.dexteria.tasks.update(task.id, {
                acceptanceCriteria: [...currentCriteria, newCriterion.trim()]
            });
            setNewCriterion('');
            refresh();
        } catch (err) {
            console.error('Failed to add criterion:', err);
            showError(t('toasts.taskCriteriaFailed'));
        }
    };

    const handleRemoveCriterion = async (index: number) => {
        try {
            const currentCriteria = task.acceptanceCriteria || [];
            const newCriteria = currentCriteria.filter((_, i) => i !== index);
            await window.dexteria.tasks.update(task.id, {
                acceptanceCriteria: newCriteria
            });
            refresh();
        } catch (err) {
            console.error('Failed to remove criterion:', err);
            showError(t('toasts.taskCriteriaFailed'));
        }
    };

    const handleStartEditCriterion = (index: number) => {
        const currentCriteria = task.acceptanceCriteria || [];
        setEditingCriterionIndex(index);
        setEditingCriterionText(currentCriteria[index]);
    };

    const handleSaveEditCriterion = async () => {
        if (editingCriterionIndex === null || !editingCriterionText.trim()) return;
        try {
            const currentCriteria = task.acceptanceCriteria || [];
            const newCriteria = [...currentCriteria];
            newCriteria[editingCriterionIndex] = editingCriterionText.trim();
            await window.dexteria.tasks.update(task.id, {
                acceptanceCriteria: newCriteria
            });
            setEditingCriterionIndex(null);
            setEditingCriterionText('');
            refresh();
        } catch (err) {
            console.error('Failed to update criterion:', err);
            showError(t('toasts.taskCriteriaFailed'));
        }
    };

    const handleCancelEditCriterion = () => {
        setEditingCriterionIndex(null);
        setEditingCriterionText('');
    };

    // Edit title
    const handleStartEditTitle = () => {
        setTitleText(task.title || '');
        setIsEditingTitle(true);
    };

    const handleSaveTitle = async () => {
        if (!titleText.trim()) return;
        try {
            await window.dexteria.tasks.update(task.id, { title: titleText.trim() });
            setIsEditingTitle(false);
            refresh();
        } catch (err) {
            console.error('Failed to update title:', err);
            showError(t('toasts.taskTitleFailed'));
        }
    };

    // Edit description
    const handleStartEditDescription = () => {
        setDescriptionText(task.description || '');
        setIsEditingDescription(true);
    };

    const handleSaveDescription = async () => {
        try {
            await window.dexteria.tasks.update(task.id, { description: descriptionText.trim() });
            setIsEditingDescription(false);
            refresh();
        } catch (err) {
            console.error('Failed to update description:', err);
            showError(t('toasts.taskDescriptionFailed'));
        }
    };

    // Edit agent plan
    const handleStartEditAgentPlan = () => {
        setAgentGoalText(task.agent?.goal || '');
        setAgentScopeText((task.agent?.scope || []).join('\n'));
        setIsEditingAgentPlan(true);
    };

    const handleSaveAgentPlan = async () => {
        try {
            const scopeArray = agentScopeText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            await window.dexteria.tasks.update(task.id, {
                agent: {
                    ...task.agent,
                    goal: agentGoalText.trim(),
                    scope: scopeArray
                }
            });
            setIsEditingAgentPlan(false);
            refresh();
        } catch (err) {
            console.error('Failed to update agent plan:', err);
            showError(t('toasts.taskAgentPlanFailed'));
        }
    };

    // Edit Epic
    const handleStartEditEpic = () => {
        setEpicName(task.epic?.name || '');
        setEpicColor(task.epic?.color || EPIC_COLORS[0]);
        setIsEditingEpic(true);
    };

    const handleSaveEpic = async () => {
        try {
            const epic: TaskEpic | null = epicName.trim()
                ? { name: epicName.trim(), color: epicColor }
                : null;
            await window.dexteria.tasks.update(task.id, { epic });
            setIsEditingEpic(false);
            refresh();
        } catch (err) {
            console.error('Failed to update epic:', err);
            showError(t('toasts.taskEpicFailed'));
        }
    };

    const handleRemoveEpic = async () => {
        try {
            await window.dexteria.tasks.update(task.id, { epic: null });
            setIsEditingEpic(false);
            refresh();
        } catch (err) {
            console.error('Failed to remove epic:', err);
            showError(t('toasts.taskEpicFailed'));
        }
    };

    // Edit Sprint
    const handleStartEditSprint = () => {
        setSprintText(task.sprint || '');
        setIsEditingSprint(true);
    };

    const handleSaveSprint = async () => {
        try {
            const sprint = sprintText.trim() || null;
            await window.dexteria.tasks.update(task.id, { sprint });
            setIsEditingSprint(false);
            refresh();
        } catch (err) {
            console.error('Failed to update sprint:', err);
            showError(t('toasts.taskSprintFailed'));
        }
    };

    // Edit Tags
    const handleAddTag = async () => {
        const tagToAdd = newTagText.trim().toLowerCase();
        if (!tagToAdd) return;
        try {
            const currentTags = task.tags || [];
            if (currentTags.includes(tagToAdd)) {
                warning(t('views.taskDetail.tagAlreadyExists'));
                setNewTagText('');
                return;
            }
            await window.dexteria.tasks.update(task.id, { tags: [...currentTags, tagToAdd] });
            setNewTagText('');
            refresh();
        } catch (err) {
            console.error('Failed to add tag:', err);
            showError(t('toasts.taskTagFailed'));
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        try {
            const currentTags = task.tags || [];
            await window.dexteria.tasks.update(task.id, { tags: currentTags.filter(t => t !== tagToRemove) });
            refresh();
        } catch (err) {
            console.error('Failed to remove tag:', err);
            showError(t('toasts.taskTagFailed'));
        }
    };

    // Delete task
    const handleDeleteTask = async () => {
        const confirmed = await confirm({
            title: t('views.taskDetail.deleteTask'),
            message: t('views.taskDetail.deleteConfirmMessage'),
            confirmText: t('actions.delete'),
            cancelText: t('actions.cancel'),
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            await deleteTask(task.id);
            onClose();
        } catch (err) {
            console.error('Failed to delete task:', err);
            showError(t('toasts.taskDeleteFailed'));
        }
    };

    // Duplicate task
    const handleDuplicateTask = async () => {
        try {
            // Create new task with same title + "(Copy)"
            const newTask = await window.dexteria.tasks.create(
                `${task.title} (${t('actions.copy')})`,
                'backlog'
            );
            if (!newTask) return;

            // Update with all the original task data
            await window.dexteria.tasks.update(newTask.id, {
                description: task.description,
                acceptanceCriteria: task.acceptanceCriteria,
                priority: task.priority,
                epic: task.epic,
                sprint: task.sprint,
                agent: task.agent,
                humanOnly: task.humanOnly,
                aiReviewable: task.aiReviewable,
                reviewCriteria: task.reviewCriteria,
            });

            refresh();
        } catch (err) {
            console.error('Failed to duplicate task:', err);
            showError(t('toasts.taskDuplicateFailed'));
        }
    };

    // Mark as blocked (updates the runtime status, not the Kanban column status)
    const handleMarkBlocked = async () => {
        try {
            await window.dexteria.tasks.update(task.id, { runtime: { status: 'blocked' } });
            refresh();
        } catch (err) {
            console.error('Failed to mark as blocked:', err);
            showError(t('toasts.taskBlockFailed'));
        }
    };

    const handleAnalyzeState = async () => {
        setAnalysis({ status: 'analyzing' });
        try {
            const result = await window.dexteria.tasks.analyzeState(task.id) as {
                success: boolean;
                summary: string;
                criteria: AcceptanceCriterionResult[];
                suggestedStatus: string;
                error?: string;
            };
            if (result.success) {
                setAnalysis({
                    status: 'complete',
                    summary: result.summary,
                    criteria: result.criteria,
                    suggestedStatus: result.suggestedStatus,
                });
            } else {
                setAnalysis({
                    status: 'error',
                    error: result.error || 'Analysis failed',
                });
            }
        } catch (err) {
            console.error('Failed to analyze task state:', err);
            setAnalysis({
                status: 'error',
                error: err instanceof Error ? err.message : 'Analysis failed',
            });
            showError(t('toasts.taskAnalysisFailed'));
        }
    };

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-2">
                    {isEditingTitle ? (
                        <div className="flex-1 flex gap-2">
                            <Input
                                value={titleText}
                                onChange={(e) => setTitleText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTitle();
                                    if (e.key === 'Escape') setIsEditingTitle(false);
                                }}
                                className="flex-1 text-lg font-semibold"
                                autoFocus
                            />
                            <IconButton variant="ghost" size="sm" onClick={handleSaveTitle} className="text-green-500 hover:bg-green-500/20" aria-label={t('actions.save')}>
                                <Check size={16} />
                            </IconButton>
                            <IconButton variant="ghost" size="sm" onClick={() => setIsEditingTitle(false)} aria-label={t('actions.cancel')}>
                                <X size={16} />
                            </IconButton>
                        </div>
                    ) : (
                        <h2
                            className="text-lg font-semibold leading-tight cursor-pointer hover:text-primary transition-colors group flex items-center gap-2"
                            onClick={handleStartEditTitle}
                            title={t('views.taskDetail.clickToEdit')}
                        >
                            {task.title}
                            <Edit2 size={14} className="opacity-0 group-hover:opacity-50" />
                        </h2>
                    )}
                    {/* More options menu */}
                    <div className="relative" ref={taskMenuRef}>
                        <IconButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTaskMenu(!showTaskMenu)}
                            className="text-muted-foreground hover:text-foreground"
                            title={t('tooltips.moreOptions')}
                        >
                            <MoreVertical size={16} />
                        </IconButton>
                        {showTaskMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]">
                                <button
                                    onClick={() => {
                                        setShowTaskMenu(false);
                                        handleDuplicateTask();
                                    }}
                                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                                >
                                    <Copy size={14} />
                                    {t('views.taskDetail.duplicateTask')}
                                </button>
                                <div className="my-1 border-t border-border" />
                                <button
                                    onClick={() => {
                                        setShowTaskMenu(false);
                                        handleDeleteTask();
                                    }}
                                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted/50 flex items-center gap-2 text-red-400 hover:text-red-300"
                                >
                                    <Trash2 size={14} />
                                    {t('views.taskDetail.deleteTask')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="uppercase tracking-wider opacity-70 font-mono">{task.id ?? 'N/A'}</span>
                    <span>•</span>
                    <span className="capitalize">{task.status ?? 'unknown'}</span>
                    <span>•</span>
                    <span className="capitalize">{task.priority ?? 'medium'} Priority</span>
                </div>

                {/* Epic and Sprint */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {/* Epic */}
                    {isEditingEpic ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border">
                            <Tag size={14} className="text-muted-foreground" />
                            <Input
                                value={epicName}
                                onChange={(e) => setEpicName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEpic();
                                    if (e.key === 'Escape') setIsEditingEpic(false);
                                }}
                                placeholder={t('views.taskDetail.epicNamePlaceholder')}
                                className="w-32 h-7 text-xs"
                                autoFocus
                            />
                            <div className="flex gap-1">
                                {EPIC_COLORS.map(color => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-5 h-5 rounded-full border-2 transition-all",
                                            epicColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setEpicColor(color)}
                                    />
                                ))}
                            </div>
                            <IconButton variant="ghost" size="xs" onClick={handleSaveEpic} className="text-green-500 hover:bg-green-500/20" aria-label={t('actions.save')}>
                                <Check size={14} />
                            </IconButton>
                            {task.epic && (
                                <IconButton variant="ghost" size="xs" onClick={handleRemoveEpic} className="text-red-500 hover:bg-red-500/20" aria-label={t('actions.delete')}>
                                    <Trash2 size={14} />
                                </IconButton>
                            )}
                            <IconButton variant="ghost" size="xs" onClick={() => setIsEditingEpic(false)} aria-label={t('actions.cancel')}>
                                <X size={14} />
                            </IconButton>
                        </div>
                    ) : task.epic ? (
                        <button
                            onClick={handleStartEditEpic}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity"
                            style={{
                                backgroundColor: `${task.epic.color}20`,
                                color: task.epic.color,
                                borderLeft: `3px solid ${task.epic.color}`
                            }}
                        >
                            <Tag size={12} />
                            {task.epic.name}
                        </button>
                    ) : (
                        <button
                            onClick={handleStartEditEpic}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/50 transition-colors border border-dashed border-muted-foreground/30"
                        >
                            <Tag size={12} />
                            {t('views.taskDetail.addEpic')}
                        </button>
                    )}

                    {/* Sprint */}
                    {isEditingSprint ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border">
                            <Calendar size={14} className="text-muted-foreground" />
                            <Input
                                value={sprintText}
                                onChange={(e) => setSprintText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveSprint();
                                    if (e.key === 'Escape') setIsEditingSprint(false);
                                }}
                                placeholder={t('views.taskDetail.sprintPlaceholder')}
                                className="w-32 h-7 text-xs"
                                autoFocus
                            />
                            <IconButton variant="ghost" size="xs" onClick={handleSaveSprint} className="text-green-500 hover:bg-green-500/20" aria-label={t('actions.save')}>
                                <Check size={14} />
                            </IconButton>
                            <IconButton variant="ghost" size="xs" onClick={() => setIsEditingSprint(false)} aria-label={t('actions.cancel')}>
                                <X size={14} />
                            </IconButton>
                        </div>
                    ) : task.sprint ? (
                        <button
                            onClick={handleStartEditSprint}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <Calendar size={12} />
                            {task.sprint}
                        </button>
                    ) : (
                        <button
                            onClick={handleStartEditSprint}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/50 transition-colors border border-dashed border-muted-foreground/30"
                        >
                            <Calendar size={12} />
                            {t('views.taskDetail.addSprint')}
                        </button>
                    )}
                </div>

                {/* Tags section */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Hash size={14} className="text-muted-foreground" />
                    {/* Existing tags */}
                    {(task.tags || []).map((tag) => (
                        <span
                            key={tag}
                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground group/tag"
                        >
                            {tag}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                className="opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-opacity"
                                aria-label={t('views.taskDetail.removeTag')}
                            >
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                    {/* Add tag input */}
                    {isEditingTags ? (
                        <div className="flex items-center gap-1">
                            <Input
                                value={newTagText}
                                onChange={(e) => setNewTagText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTag();
                                    if (e.key === 'Escape') {
                                        setIsEditingTags(false);
                                        setNewTagText('');
                                    }
                                }}
                                placeholder={t('views.taskDetail.tagPlaceholder')}
                                className="w-24 h-6 text-xs"
                                autoFocus
                            />
                            <IconButton variant="ghost" size="xs" onClick={handleAddTag} className="text-green-500 hover:bg-green-500/20" aria-label={t('actions.add')}>
                                <Check size={12} />
                            </IconButton>
                            <IconButton variant="ghost" size="xs" onClick={() => { setIsEditingTags(false); setNewTagText(''); }} aria-label={t('actions.cancel')}>
                                <X size={12} />
                            </IconButton>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditingTags(true)}
                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full text-muted-foreground hover:bg-muted/40 transition-colors border border-dashed border-muted-foreground/30"
                        >
                            <Plus size={10} />
                            {t('views.taskDetail.addTag')}
                        </button>
                    )}
                </div>

                {/* Human-Only and AI-Reviewable options */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {/* Human-Only checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={task.humanOnly || false}
                            onChange={async (e) => {
                                try {
                                    await window.dexteria.tasks.update(task.id, { humanOnly: e.target.checked });
                                    refresh();
                                } catch (err) {
                                    console.error('Failed to update humanOnly:', err);
                                }
                            }}
                            className="w-4 h-4 rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500/50 cursor-pointer"
                        />
                        <span className={cn(
                            "flex items-center gap-1.5 text-xs transition-colors",
                            task.humanOnly ? "text-amber-400" : "text-muted-foreground group-hover:text-amber-400/70"
                        )}>
                            <User size={14} />
                            Human-Only
                        </span>
                    </label>

                    {/* AI-Reviewable checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={task.aiReviewable || false}
                            onChange={async (e) => {
                                try {
                                    await window.dexteria.tasks.update(task.id, { aiReviewable: e.target.checked });
                                    refresh();
                                } catch (err) {
                                    console.error('Failed to update aiReviewable:', err);
                                }
                            }}
                            className="w-4 h-4 rounded border-purple-500/50 bg-transparent text-purple-500 focus:ring-purple-500/50 cursor-pointer"
                        />
                        <span className={cn(
                            "flex items-center gap-1.5 text-xs transition-colors",
                            task.aiReviewable ? "text-purple-400" : "text-muted-foreground group-hover:text-purple-400/70"
                        )}>
                            <Sparkles size={14} />
                            AI-Reviewable
                        </span>
                    </label>

                    {/* AI Processing indicator */}
                    {task.aiProcessing && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-400 animate-pulse">
                            <Loader2 size={14} className="animate-spin" />
                            AI is reviewing...
                        </span>
                    )}
                </div>

                {/* AI Review Result */}
                {task.aiReview && (
                    <div className={cn(
                        "mt-3 p-3 rounded-lg border",
                        task.aiReview.passed
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-red-500/10 border-red-500/30"
                    )}>
                        <div className="flex items-center gap-2 mb-2">
                            {task.aiReview.passed ? (
                                <CheckCircle size={16} className="text-green-500" />
                            ) : (
                                <XCircle size={16} className="text-red-500" />
                            )}
                            <span className={cn(
                                "text-sm font-medium",
                                task.aiReview.passed ? "text-green-400" : "text-red-400"
                            )}>
                                {task.aiReview.passed ? t('views.taskDetail.aiReviewPassed') : t('views.taskDetail.aiReviewNeedsAttention')}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(task.aiReview.reviewedAt).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-sm text-foreground/80">{task.aiReview.feedback}</p>
                        {task.aiReview.checklist && task.aiReview.checklist.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {task.aiReview.checklist.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                        {item.passed ? (
                                            <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />
                                        ) : (
                                            <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                        )}
                                        <span className={item.passed ? "text-green-300" : "text-red-300"}>
                                            {item.criterion}
                                            {item.note && <span className="text-muted-foreground ml-1">- {item.note}</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Clear AI Review button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs"
                            onClick={async () => {
                                try {
                                    await window.dexteria.tasks.update(task.id, { aiReview: null });
                                    refresh();
                                } catch (err) {
                                    console.error('Failed to clear AI review:', err);
                                }
                            }}
                        >
                            <X size={12} />
                            {t('views.taskDetail.clearReview')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Content Scroller */}
            <ScrollArea className="flex-1 p-4 space-y-6">

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={() => handleRun('manual')}
                        disabled={isRunning || task.runtime?.status === 'running'}
                        size="sm"
                    >
                        {isRunning || task.runtime?.status === 'running' ? <RotateCw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {t('views.taskDetail.runTask')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleAnalyzeState}
                        disabled={analysis?.status === 'analyzing'}
                        size="sm"
                    >
                        {analysis?.status === 'analyzing' ? <RotateCw className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                        {t('views.taskDetail.analyzeState')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleMarkBlocked}
                        size="sm"
                        className="hover:bg-yellow-500/20 hover:border-yellow-500/50"
                    >
                        <Ban className="w-4 h-4" />
                        {t('views.taskDetail.markBlocked')}
                    </Button>
                </div>

                {/* Analysis Results */}
                {analysis && (
                    <div className={cn(
                        "p-3 rounded-lg border",
                        analysis.status === 'analyzing' && "bg-blue-500/10 border-blue-500/20",
                        analysis.status === 'complete' && "bg-muted/10 border-border",
                        analysis.status === 'error' && "bg-red-500/10 border-red-500/20"
                    )}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                {analysis.status === 'analyzing' && <RotateCw className="w-3 h-3 animate-spin" />}
                                {analysis.status === 'complete' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                {analysis.status === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                                {t('views.taskDetail.stateAnalysis')}
                            </h3>
                            <IconButton variant="ghost" size="xs" onClick={() => setAnalysis(null)} aria-label={t('actions.close')}>
                                <X size={14} />
                            </IconButton>
                        </div>

                        {analysis.status === 'analyzing' && (
                            <div className="text-sm text-muted-foreground">
                                {t('views.taskDetail.analyzingTask')}
                            </div>
                        )}

                        {analysis.status === 'error' && (
                            <div className="text-sm text-red-400">
                                {analysis.error}
                            </div>
                        )}

                        {analysis.status === 'complete' && (
                            <div className="space-y-3">
                                {analysis.summary && (
                                    <div className="text-sm">{analysis.summary}</div>
                                )}

                                {analysis.suggestedStatus && analysis.suggestedStatus !== task.status && (
                                    <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                                        <AlertCircle size={14} className="text-yellow-500 shrink-0" />
                                        <span className="text-sm">
                                            {t('views.taskDetail.suggestedStatus')} <strong className="capitalize">{analysis.suggestedStatus}</strong>
                                            {' '}({t('views.taskDetail.currentStatus')} <span className="capitalize">{task.status}</span>)
                                        </span>
                                    </div>
                                )}

                                {analysis.criteria && analysis.criteria.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-muted-foreground">{t('views.taskDetail.acceptanceCriteriaCheck')}</div>
                                        {analysis.criteria.map((c, i) => (
                                            <div key={i} className={cn(
                                                "flex gap-2 text-sm p-2 rounded border",
                                                c.passed ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                                            )}>
                                                {c.passed ? (
                                                    <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                                                ) : (
                                                    <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                                )}
                                                <div className="flex-1">
                                                    <div className={cn(c.passed ? "text-green-300" : "text-red-300")}>
                                                        {c.criterion}
                                                    </div>
                                                    {c.evidence && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {c.evidence}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Description */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('views.taskDetail.description')}</h3>
                        {!isEditingDescription && (
                            <IconButton
                                variant="ghost"
                                size="xs"
                                onClick={handleStartEditDescription}
                                title={t('views.taskDetail.clickToEdit')}
                            >
                                <Edit2 size={12} />
                            </IconButton>
                        )}
                    </div>
                    {isEditingDescription ? (
                        <div className="space-y-2">
                            <Textarea
                                value={descriptionText}
                                onChange={(e) => setDescriptionText(e.target.value)}
                                className="w-full min-h-[100px] resize-y"
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(false)}>
                                    {t('actions.cancel')}
                                </Button>
                                <Button size="sm" onClick={handleSaveDescription}>
                                    {t('actions.save')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 bg-muted/10 p-3 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={handleStartEditDescription}
                            title={t('views.taskDetail.clickToEdit')}
                        >
                            {task.description || t('views.taskDetail.noDescriptionClick')}
                        </div>
                    )}
                </div>

                {/* Dependencies */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('views.taskDetail.dependencies')}
                        </h3>
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDepDropdown(!showDepDropdown)}
                                disabled={availableTasks.length === 0}
                                className="text-xs"
                                title={availableTasks.length === 0 ? t('views.taskDetail.noTasksForDeps') : undefined}
                            >
                                <Plus size={12} />
                                Add
                                <ChevronDown size={12} />
                            </Button>

                            {/* Dropdown */}
                            {showDepDropdown && availableTasks.length > 0 && (
                                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {availableTasks.map(t => (
                                        <Button
                                            key={t.id}
                                            variant="ghost"
                                            onClick={() => handleAddDependency(t.id)}
                                            className="w-full justify-start rounded-none"
                                        >
                                            <span className="text-muted-foreground font-mono text-xs">{t.id}</span>
                                            <span className="truncate">{t.title}</span>
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {currentDeps.length === 0 ? (
                        <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border">
                            {t('views.taskDetail.noDependencies')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {currentDeps.map(depId => {
                                const depTask = getTaskById(depId);
                                return (
                                    <div
                                        key={depId}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/10 border border-border group"
                                    >
                                        <Link size={14} className="text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm truncate">
                                                {depTask?.title || depId}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span className="font-mono">{depId}</span>
                                                {depTask && (
                                                    <>
                                                        <span>•</span>
                                                        <span className={cn(
                                                            "capitalize",
                                                            depTask.status === 'done' && "text-green-500"
                                                        )}>
                                                            {depTask.status}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <IconButton
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => handleRemoveDependency(depId)}
                                            className="opacity-0 group-hover:opacity-100"
                                            title={t('actions.remove')}
                                        >
                                            <X size={14} />
                                        </IconButton>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Acceptance Criteria */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('views.taskDetail.acceptanceCriteria')}</h3>
                        {task.aiReview?.checklist && task.aiReview.checklist.length > 0 && (
                            <span className={cn(
                                "text-xs font-mono px-1.5 py-0.5 rounded",
                                task.aiReview.checklist.filter(c => c.passed).length === task.aiReview.checklist.length
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {task.aiReview.checklist.filter(c => c.passed).length}/{task.aiReview.checklist.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {(task.acceptanceCriteria || []).length === 0 ? (
                            <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border">
                                {t('views.taskDetail.noAcceptanceCriteria')}
                            </div>
                        ) : (
                            (task.acceptanceCriteria || []).map((ac, i) => (
                                <div key={i} className="flex gap-2 text-sm p-2 rounded bg-muted/5 border border-border group">
                                    <span className="font-mono text-muted-foreground opacity-50 shrink-0">{i + 1}.</span>
                                    {editingCriterionIndex === i ? (
                                        <div className="flex-1 flex gap-2">
                                            <Input
                                                value={editingCriterionText}
                                                onChange={(e) => setEditingCriterionText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEditCriterion();
                                                    if (e.key === 'Escape') handleCancelEditCriterion();
                                                }}
                                                className="flex-1"
                                                autoFocus
                                            />
                                            <IconButton
                                                variant="ghost"
                                                size="xs"
                                                onClick={handleSaveEditCriterion}
                                                className="text-green-500 hover:bg-green-500/20"
                                                title={t('actions.save')}
                                                aria-label={t('actions.save')}
                                            >
                                                <Check size={14} />
                                            </IconButton>
                                            <IconButton
                                                variant="ghost"
                                                size="xs"
                                                onClick={handleCancelEditCriterion}
                                                title={t('actions.cancel')}
                                                aria-label={t('actions.cancel')}
                                            >
                                                <X size={14} />
                                            </IconButton>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="flex-1">{ac}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <IconButton
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() => handleStartEditCriterion(i)}
                                                    title={t('actions.edit')}
                                                    aria-label={t('actions.edit')}
                                                >
                                                    <Edit2 size={12} />
                                                </IconButton>
                                                <IconButton
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() => handleRemoveCriterion(i)}
                                                    className="hover:bg-red-500/20 hover:text-red-500"
                                                    title={t('actions.remove')}
                                                    aria-label={t('actions.remove')}
                                                >
                                                    <Trash2 size={12} />
                                                </IconButton>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}

                        {/* Add new criterion */}
                        <div className="flex gap-2">
                            <Input
                                value={newCriterion}
                                onChange={(e) => setNewCriterion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newCriterion.trim()) handleAddCriterion();
                                }}
                                placeholder={t('placeholders.addAcceptanceCriterion')}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleAddCriterion}
                                disabled={!newCriterion.trim()}
                                size="sm"
                            >
                                <Plus size={14} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* AI Review Criteria - shown when AI-Reviewable is enabled */}
                {task.aiReviewable && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-purple-400" />
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">{t('views.taskDetail.aiReviewCriteria')}</h3>
                        </div>
                        <Textarea
                            value={task.reviewCriteria || ''}
                            onChange={async (e) => {
                                try {
                                    await window.dexteria.tasks.update(task.id, { reviewCriteria: e.target.value });
                                    refresh();
                                } catch (err) {
                                    console.error('Failed to update reviewCriteria:', err);
                                }
                            }}
                            placeholder={t('taskDetail.aiReviewPlaceholder')}
                            className="w-full min-h-[80px] resize-y bg-purple-500/5 border-purple-500/30 focus:border-purple-500/50"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            The AI will use these criteria when auto-reviewing the task upon moving to Review.
                        </p>
                    </div>
                )}

                {/* Agent Config */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('views.taskDetail.agentPlan')}</h3>
                        {!isEditingAgentPlan && (
                            <IconButton
                                variant="ghost"
                                size="xs"
                                onClick={handleStartEditAgentPlan}
                                title={t('views.taskDetail.clickToEdit')}
                            >
                                <Edit2 size={12} />
                            </IconButton>
                        )}
                    </div>
                    {isEditingAgentPlan ? (
                        <div className="space-y-3 bg-muted/10 p-3 rounded border border-border">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">{t('views.taskDetail.goal')}</label>
                                <Input
                                    value={agentGoalText}
                                    onChange={(e) => setAgentGoalText(e.target.value)}
                                    placeholder={t('placeholders.agentGoal')}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">{t('views.taskDetail.scope')}</label>
                                <Textarea
                                    value={agentScopeText}
                                    onChange={(e) => setAgentScopeText(e.target.value)}
                                    className="min-h-[80px] resize-y"
                                    placeholder={t('placeholders.agentScope')}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingAgentPlan(false)}>
                                    {t('actions.cancel')}
                                </Button>
                                <Button size="sm" onClick={handleSaveAgentPlan}>
                                    {t('actions.save')}
                                </Button>
                            </div>
                        </div>
                    ) : task.agent ? (
                        <div
                            className="text-xs space-y-1 text-muted-foreground bg-muted/10 p-3 rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={handleStartEditAgentPlan}
                            title={t('views.taskDetail.clickToEdit')}
                        >
                            <div><strong className="text-foreground">{t('views.taskDetail.goal')}:</strong> {task.agent.goal ?? t('views.taskDetail.noGoalSet')}</div>
                            {task.agent.scope && task.agent.scope.length > 0 && (
                                <div className="mt-2">
                                    <strong className="text-foreground">{t('views.taskDetail.scopeLabel')}:</strong>
                                    <ul className="list-disc list-inside mt-1 pl-1">
                                        {task.agent.scope.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            className="text-sm text-muted-foreground bg-muted/10 p-3 rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={handleStartEditAgentPlan}
                            title={t('views.taskDetail.clickToAddPlan')}
                        >
                            {t('views.taskDetail.noAgentPlan')}
                        </div>
                    )}
                </div>

                {/* Plugin slot for task detail sidebar/footer */}
                <Slot
                    id="task-detail:sidebar"
                    context={{ taskId: task.id, task }}
                    className="space-y-4"
                />

            </ScrollArea>

            {/* Plugin slot for task detail footer (above comments) */}
            <Slot
                id="task-detail:footer"
                context={{ taskId: task.id, task }}
                className="border-t border-border p-4"
            />

            {/* Comments Section - Resizable panel */}
            <div
                className="border-t border-border flex-shrink-0 overflow-hidden flex flex-col"
                style={{ height: commentsPanelHeight }}
            >
                {/* Resize handle */}
                <div
                    onMouseDown={handleResizeStart}
                    className={cn(
                        "h-2 flex items-center justify-center cursor-ns-resize hover:bg-primary/10 transition-colors group",
                        isResizing && "bg-primary/20"
                    )}
                >
                    <GripHorizontal
                        size={14}
                        className={cn(
                            "text-muted-foreground/30 group-hover:text-muted-foreground transition-colors",
                            isResizing && "text-primary"
                        )}
                    />
                </div>
                <div className="flex-1 overflow-hidden">
                    <TaskComments
                        task={task}
                        onAddComment={handleAddCommentFromComponent}
                        onRetryWithContext={handleRetryWithContext}
                        isRetrying={isRetrying}
                    />
                </div>
            </div>
        </div>
    );
};
