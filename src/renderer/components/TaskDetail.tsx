import React, { useState } from 'react';
import { useActiveTask, useBoard } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { cn } from '../lib/utils';
import { Play, RotateCw, Plus, X, Link, ChevronDown, Search, CheckCircle, XCircle, AlertCircle, Edit2, Trash2, Check, AlertTriangle, Ban } from 'lucide-react';
import { TaskComments } from './TaskComments';
import type { Task, RunTaskOptions, AcceptanceCriterionResult } from '../../shared/types';

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
                            <input
                                type="text"
                                value={titleText}
                                onChange={(e) => setTitleText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTitle();
                                    if (e.key === 'Escape') setIsEditingTitle(false);
                                }}
                                className="flex-1 text-lg font-semibold bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                            />
                            <button onClick={handleSaveTitle} className="p-1 hover:bg-green-500/20 rounded text-green-500">
                                <Check size={16} />
                            </button>
                            <button onClick={() => setIsEditingTitle(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                <X size={16} />
                            </button>
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
                    <button
                        onClick={handleDeleteTask}
                        className="p-1.5 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete task"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="uppercase tracking-wider opacity-70 font-mono">{task.id ?? 'N/A'}</span>
                    <span>•</span>
                    <span className="capitalize">{task.status ?? 'unknown'}</span>
                    <span>•</span>
                    <span className="capitalize">{task.priority ?? 'medium'} Priority</span>
                </div>
            </div>

            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => handleRun('manual')}
                        disabled={isRunning || task.runtime?.status === 'running'}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {isRunning || task.runtime?.status === 'running' ? <RotateCw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                        Run Task
                    </button>
                    <button
                        onClick={handleAnalyzeState}
                        disabled={analysis?.status === 'analyzing'}
                        className="flex items-center gap-2 px-3 py-1.5 border border-border hover:bg-muted text-sm font-medium rounded transition-colors disabled:opacity-50"
                    >
                        {analysis?.status === 'analyzing' ? <RotateCw className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                        Analyze State
                    </button>
                    <button
                        onClick={handleMarkBlocked}
                        className="flex items-center gap-2 px-3 py-1.5 border border-border hover:bg-yellow-500/20 hover:border-yellow-500/50 text-sm font-medium rounded transition-colors cursor-pointer"
                    >
                        <Ban className="w-4 h-4" />
                        Mark Blocked
                    </button>
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
                            <button
                                onClick={() => setAnalysis(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={14} />
                            </button>
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
                            <button
                                onClick={handleStartEditDescription}
                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Edit description"
                            >
                                <Edit2 size={12} />
                            </button>
                        )}
                    </div>
                    {isEditingDescription ? (
                        <div className="space-y-2">
                            <textarea
                                value={descriptionText}
                                onChange={(e) => setDescriptionText(e.target.value)}
                                className="w-full min-h-[100px] bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setIsEditingDescription(false)}
                                    className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveDescription}
                                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                                >
                                    Save
                                </button>
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
                            <button
                                onClick={() => setShowDepDropdown(!showDepDropdown)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                disabled={availableTasks.length === 0}
                            >
                                <Plus size={12} />
                                Add
                                <ChevronDown size={12} />
                            </button>

                            {/* Dropdown */}
                            {showDepDropdown && availableTasks.length > 0 && (
                                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {availableTasks.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleAddDependency(t.id)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-muted-foreground font-mono text-xs">{t.id}</span>
                                            <span className="truncate">{t.title}</span>
                                        </button>
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
                                        <button
                                            onClick={() => handleRemoveDependency(depId)}
                                            className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove dependency"
                                        >
                                            <X size={14} className="text-muted-foreground" />
                                        </button>
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
                                            <input
                                                type="text"
                                                value={editingCriterionText}
                                                onChange={(e) => setEditingCriterionText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEditCriterion();
                                                    if (e.key === 'Escape') handleCancelEditCriterion();
                                                }}
                                                className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleSaveEditCriterion}
                                                className="p-1 hover:bg-green-500/20 rounded text-green-500"
                                                title="Save"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={handleCancelEditCriterion}
                                                className="p-1 hover:bg-muted rounded text-muted-foreground"
                                                title="Cancel"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="flex-1">{ac}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleStartEditCriterion(i)}
                                                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveCriterion(i)}
                                                    className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-500"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}

                        {/* Add new criterion */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCriterion}
                                onChange={(e) => setNewCriterion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddCriterion();
                                }}
                                placeholder="Add acceptance criterion..."
                                className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                                onClick={handleAddCriterion}
                                disabled={!newCriterion.trim()}
                                className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Agent Config */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Plan</h3>
                        {!isEditingAgentPlan && (
                            <button
                                onClick={handleStartEditAgentPlan}
                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Edit agent plan"
                            >
                                <Edit2 size={12} />
                            </button>
                        )}
                    </div>
                    {isEditingAgentPlan ? (
                        <div className="space-y-3 bg-muted/10 p-3 rounded border border-border">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Goal</label>
                                <input
                                    type="text"
                                    value={agentGoalText}
                                    onChange={(e) => setAgentGoalText(e.target.value)}
                                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="What should the agent accomplish?"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Scope (one per line)</label>
                                <textarea
                                    value={agentScopeText}
                                    onChange={(e) => setAgentScopeText(e.target.value)}
                                    className="w-full min-h-[80px] bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                                    placeholder="Files or areas the agent should focus on..."
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setIsEditingAgentPlan(false)}
                                    className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAgentPlan}
                                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                                >
                                    Save
                                </button>
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

            </div>

            {/* Comments Section - Uses new TaskComments component */}
            <div className="border-t border-border flex-shrink-0 max-h-[40%] overflow-hidden flex flex-col">
                <TaskComments
                    task={task}
                    onAddComment={handleAddCommentFromComponent}
                    onRetryWithContext={handleRetryWithContext}
                    isRetrying={isRetrying}
                />
            </div>
        </div>
    );
};
