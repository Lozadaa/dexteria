import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useActiveTask, useBoard } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { cn } from '../lib/utils';
import { Play, RotateCw, Plus, X, Link, ChevronDown, Search, CheckCircle, XCircle, AlertCircle, Edit2, Trash2, Check, AlertTriangle, Ban, GripHorizontal, Tag, Calendar } from 'lucide-react';
import { TaskComments } from './TaskComments';
import { Button, IconButton, Input, Textarea, ScrollArea } from 'adnia-ui';
import { Slot } from './extension/Slot';
import type { RunTaskOptions, AcceptanceCriterionResult, TaskEpic } from '../../shared/types';

// Predefined epic colors
const EPIC_COLORS = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#6366f1', // indigo
];

interface AnalysisResult {
    status: 'analyzing' | 'complete' | 'error';
    summary?: string;
    criteria?: AcceptanceCriterionResult[];
    suggestedStatus?: string;
    error?: string;
}

interface TaskDetailProps {
    taskId: string;
    onClose: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onClose }) => {
    // useActiveTask polls specifically for this task which is good for run updates
    const { task, loading } = useActiveTask(taskId);
    const { tasks, refresh, deleteTask } = useBoard();
    const { mode, triggerPlannerBlock } = useMode();
    const { confirm } = useConfirm();
    const [isRunning, setIsRunning] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [comment, setComment] = useState('');
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

    // Resizable comments panel
    const [commentsPanelHeight, setCommentsPanelHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
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

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Loading task details...</div>;
    }

    if (!task) {
        return <div className="p-4 text-center text-muted-foreground">Task not found</div>;
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

    const handleAddComment = async (type: 'note' | 'instruction' = 'note') => {
        if (!comment.trim()) return;
        try {
            await window.dexteria.tasks.addTypedComment(task.id, type, 'user', comment);
            setComment('');
            refresh();
        } catch (err) {
            console.error(err);
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

    // Check if task has failures
    const hasFailures = (task.comments || []).some(c => c.type === 'failure');
    const latestFailure = hasFailures
        ? (task.comments || []).filter(c => c.type === 'failure').pop()
        : null;

    const handleAddDependency = async (depId: string) => {
        try {
            const newDeps = [...currentDeps, depId];
            await window.dexteria.tasks.update(task.id, { dependsOn: newDeps });
            setShowDepDropdown(false);
            refresh();
        } catch (err) {
            console.error('Failed to add dependency:', err);
        }
    };

    const handleRemoveDependency = async (depId: string) => {
        try {
            const newDeps = currentDeps.filter(d => d !== depId);
            await window.dexteria.tasks.update(task.id, { dependsOn: newDeps });
            refresh();
        } catch (err) {
            console.error('Failed to remove dependency:', err);
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
        }
    };

    const handleRemoveEpic = async () => {
        try {
            await window.dexteria.tasks.update(task.id, { epic: null });
            setIsEditingEpic(false);
            refresh();
        } catch (err) {
            console.error('Failed to remove epic:', err);
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
        }
    };

    // Delete task
    const handleDeleteTask = async () => {
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
            onClose();
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    // Mark as blocked
    const handleMarkBlocked = async () => {
        try {
            await window.dexteria.tasks.update(task.id, { status: 'blocked' as any });
            refresh();
        } catch (err) {
            console.error('Failed to mark as blocked:', err);
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
                            <IconButton variant="ghost" size="sm" onClick={handleSaveTitle} className="text-green-500 hover:bg-green-500/20">
                                <Check size={16} />
                            </IconButton>
                            <IconButton variant="ghost" size="sm" onClick={() => setIsEditingTitle(false)}>
                                <X size={16} />
                            </IconButton>
                        </div>
                    ) : (
                        <h2
                            className="text-lg font-semibold leading-tight cursor-pointer hover:text-primary transition-colors group flex items-center gap-2"
                            onClick={handleStartEditTitle}
                            title="Click to edit"
                        >
                            {task.title}
                            <Edit2 size={14} className="opacity-0 group-hover:opacity-50" />
                        </h2>
                    )}
                    <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteTask}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-500/20"
                        title="Delete task"
                    >
                        <Trash2 size={16} />
                    </IconButton>
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
                                placeholder="Epic name..."
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
                            <IconButton variant="ghost" size="xs" onClick={handleSaveEpic} className="text-green-500 hover:bg-green-500/20">
                                <Check size={14} />
                            </IconButton>
                            {task.epic && (
                                <IconButton variant="ghost" size="xs" onClick={handleRemoveEpic} className="text-red-500 hover:bg-red-500/20">
                                    <Trash2 size={14} />
                                </IconButton>
                            )}
                            <IconButton variant="ghost" size="xs" onClick={() => setIsEditingEpic(false)}>
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
                            Add Epic
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
                                placeholder="Sprint (e.g., Sprint 1)"
                                className="w-32 h-7 text-xs"
                                autoFocus
                            />
                            <IconButton variant="ghost" size="xs" onClick={handleSaveSprint} className="text-green-500 hover:bg-green-500/20">
                                <Check size={14} />
                            </IconButton>
                            <IconButton variant="ghost" size="xs" onClick={() => setIsEditingSprint(false)}>
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
                            Add Sprint
                        </button>
                    )}
                </div>
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
                        Run Task
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleAnalyzeState}
                        disabled={analysis?.status === 'analyzing'}
                        size="sm"
                    >
                        {analysis?.status === 'analyzing' ? <RotateCw className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                        Analyze State
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleMarkBlocked}
                        size="sm"
                        className="hover:bg-yellow-500/20 hover:border-yellow-500/50"
                    >
                        <Ban className="w-4 h-4" />
                        Mark Blocked
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
                                State Analysis
                            </h3>
                            <IconButton variant="ghost" size="xs" onClick={() => setAnalysis(null)}>
                                <X size={14} />
                            </IconButton>
                        </div>

                        {analysis.status === 'analyzing' && (
                            <div className="text-sm text-muted-foreground">
                                Analyzing task against current codebase...
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
                                            Suggested status: <strong className="capitalize">{analysis.suggestedStatus}</strong>
                                            {' '}(current: <span className="capitalize">{task.status}</span>)
                                        </span>
                                    </div>
                                )}

                                {analysis.criteria && analysis.criteria.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-muted-foreground">Acceptance Criteria Check:</div>
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
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
                        {!isEditingDescription && (
                            <IconButton
                                variant="ghost"
                                size="xs"
                                onClick={handleStartEditDescription}
                                title="Edit description"
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
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSaveDescription}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 bg-muted/10 p-3 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={handleStartEditDescription}
                            title="Click to edit"
                        >
                            {task.description || 'No description - click to add'}
                        </div>
                    )}
                </div>

                {/* Dependencies */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Dependencies
                        </h3>
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDepDropdown(!showDepDropdown)}
                                disabled={availableTasks.length === 0}
                                className="text-xs"
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
                            No dependencies
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
                                            title="Remove dependency"
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
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Acceptance Criteria</h3>
                    <div className="space-y-2">
                        {(task.acceptanceCriteria || []).length === 0 ? (
                            <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border">
                                No acceptance criteria defined
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
                                                title="Save"
                                            >
                                                <Check size={14} />
                                            </IconButton>
                                            <IconButton
                                                variant="ghost"
                                                size="xs"
                                                onClick={handleCancelEditCriterion}
                                                title="Cancel"
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
                                                    title="Edit"
                                                >
                                                    <Edit2 size={12} />
                                                </IconButton>
                                                <IconButton
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() => handleRemoveCriterion(i)}
                                                    className="hover:bg-red-500/20 hover:text-red-500"
                                                    title="Remove"
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
                                    if (e.key === 'Enter') handleAddCriterion();
                                }}
                                placeholder="Add acceptance criterion..."
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

                {/* Agent Config */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Plan</h3>
                        {!isEditingAgentPlan && (
                            <IconButton
                                variant="ghost"
                                size="xs"
                                onClick={handleStartEditAgentPlan}
                                title="Edit agent plan"
                            >
                                <Edit2 size={12} />
                            </IconButton>
                        )}
                    </div>
                    {isEditingAgentPlan ? (
                        <div className="space-y-3 bg-muted/10 p-3 rounded border border-border">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Goal</label>
                                <Input
                                    value={agentGoalText}
                                    onChange={(e) => setAgentGoalText(e.target.value)}
                                    placeholder="What should the agent accomplish?"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Scope (one per line)</label>
                                <Textarea
                                    value={agentScopeText}
                                    onChange={(e) => setAgentScopeText(e.target.value)}
                                    className="min-h-[80px] resize-y"
                                    placeholder="Files or areas the agent should focus on..."
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingAgentPlan(false)}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSaveAgentPlan}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : task.agent ? (
                        <div
                            className="text-xs space-y-1 text-muted-foreground bg-muted/10 p-3 rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={handleStartEditAgentPlan}
                            title="Click to edit"
                        >
                            <div><strong className="text-foreground">Goal:</strong> {task.agent.goal ?? 'No goal set'}</div>
                            {task.agent.scope && task.agent.scope.length > 0 && (
                                <div className="mt-2">
                                    <strong className="text-foreground">Scope:</strong>
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
                            title="Click to add agent plan"
                        >
                            No agent plan - click to add
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
