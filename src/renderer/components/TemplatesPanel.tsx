/**
 * Templates Panel
 *
 * Panel for managing task templates - create, edit, delete templates
 * that can be used when creating new tasks.
 */

import React, { useState } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { Button, IconButton, Input } from 'adnia-ui';
import { Plus, FileText, Pencil, Trash2, X, Check, FolderOpen } from 'lucide-react';
import { t } from '../i18n/t';
import { cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';
import type { TaskTemplate } from '../../shared/types';

interface TemplateFormData {
    name: string;
    category: string;
    descriptionTemplate: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    acceptanceCriteria: string[];
}

const defaultFormData: TemplateFormData = {
    name: '',
    category: '',
    descriptionTemplate: '',
    priority: 'medium',
    acceptanceCriteria: [],
};

export const TemplatesPanel: React.FC = () => {
    const { templates, loading, createTemplate, updateTemplate, deleteTemplate, refresh } = useTemplates();
    const { success, error: showError } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
    const [newCriterion, setNewCriterion] = useState('');

    const handleCreate = () => {
        setIsCreating(true);
        setEditingId(null);
        setFormData(defaultFormData);
    };

    const handleEdit = (template: TaskTemplate) => {
        setEditingId(template.id);
        setIsCreating(false);
        setFormData({
            name: template.name,
            category: template.category || '',
            descriptionTemplate: template.descriptionTemplate || '',
            priority: template.priority || 'medium',
            acceptanceCriteria: template.acceptanceCriteria || [],
        });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingId(null);
        setFormData(defaultFormData);
        setNewCriterion('');
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return;

        try {
            if (isCreating) {
                await createTemplate({
                    name: formData.name.trim(),
                    category: formData.category.trim() || undefined,
                    descriptionTemplate: formData.descriptionTemplate.trim() || undefined,
                    priority: formData.priority,
                    acceptanceCriteria: formData.acceptanceCriteria.length > 0 ? formData.acceptanceCriteria : undefined,
                });
            } else if (editingId) {
                await updateTemplate(editingId, {
                    name: formData.name.trim(),
                    category: formData.category.trim() || undefined,
                    descriptionTemplate: formData.descriptionTemplate.trim() || undefined,
                    priority: formData.priority,
                    acceptanceCriteria: formData.acceptanceCriteria.length > 0 ? formData.acceptanceCriteria : undefined,
                });
            }
            handleCancel();
            refresh();
            success(t('toasts.templateSaved'));
        } catch (err) {
            console.error('Failed to save template:', err);
            showError(t('toasts.templateSaveFailed'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('views.templates.deleteConfirm'))) return;
        try {
            await deleteTemplate(id);
            refresh();
            success(t('toasts.templateDeleted'));
        } catch (err) {
            console.error('Failed to delete template:', err);
            showError(t('toasts.templateDeleteFailed'));
        }
    };

    const addCriterion = () => {
        if (!newCriterion.trim()) return;
        setFormData(prev => ({
            ...prev,
            acceptanceCriteria: [...prev.acceptanceCriteria, newCriterion.trim()],
        }));
        setNewCriterion('');
    };

    const removeCriterion = (index: number) => {
        setFormData(prev => ({
            ...prev,
            acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
        }));
    };

    const isEditing = isCreating || editingId !== null;

    // Group templates by category
    const groupedTemplates = templates.reduce((acc, template) => {
        const category = template.category || t('views.templates.uncategorized');
        if (!acc[category]) acc[category] = [];
        acc[category].push(template);
        return acc;
    }, {} as Record<string, TaskTemplate[]>);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">{t('views.templates.title')}</h2>
                {!isEditing && (
                    <Button onClick={handleCreate} size="sm" className="gap-1.5">
                        <Plus size={14} />
                        {t('views.templates.new')}
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center text-muted-foreground py-8">
                        {t('common.loading')}
                    </div>
                ) : isEditing ? (
                    /* Edit/Create Form */
                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                {t('views.templates.name')} *
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('views.templates.namePlaceholder')}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                {t('views.templates.category')}
                            </label>
                            <Input
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                placeholder={t('views.templates.categoryPlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                {t('views.templates.description')}
                            </label>
                            <textarea
                                value={formData.descriptionTemplate}
                                onChange={(e) => setFormData(prev => ({ ...prev, descriptionTemplate: e.target.value }))}
                                placeholder={t('views.templates.descriptionPlaceholder')}
                                className="w-full h-24 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                {t('views.templates.priority')}
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
                            >
                                <option value="low">{t('views.kanban.priorityLow')}</option>
                                <option value="medium">{t('views.kanban.priorityMedium')}</option>
                                <option value="high">{t('views.kanban.priorityHigh')}</option>
                                <option value="critical">{t('views.kanban.priorityCritical')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                {t('views.templates.checklist')}
                            </label>
                            <div className="space-y-2">
                                {formData.acceptanceCriteria.map((criterion, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                        <span className="flex-1 px-2 py-1 bg-muted/30 rounded">{criterion}</span>
                                        <IconButton
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => removeCriterion(index)}
                                        >
                                            <X size={12} />
                                        </IconButton>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <Input
                                        value={newCriterion}
                                        onChange={(e) => setNewCriterion(e.target.value)}
                                        placeholder={t('views.templates.addCriterion')}
                                        onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
                                        className="flex-1"
                                    />
                                    <IconButton onClick={addCriterion} disabled={!newCriterion.trim()}>
                                        <Plus size={14} />
                                    </IconButton>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSave} disabled={!formData.name.trim()} className="gap-1.5">
                                <Check size={14} />
                                {t('actions.save')}
                            </Button>
                            <Button variant="outline" onClick={handleCancel}>
                                {t('actions.cancel')}
                            </Button>
                        </div>
                    </div>
                ) : templates.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                            <FileText size={28} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">{t('views.templates.emptyTitle')}</h3>
                        <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                            {t('views.templates.emptyDescription')}
                        </p>
                        <Button onClick={handleCreate} className="gap-1.5">
                            <Plus size={14} />
                            {t('views.templates.createFirst')}
                        </Button>
                    </div>
                ) : (
                    /* Templates List */
                    <div className="space-y-4">
                        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                            <div key={category}>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <FolderOpen size={12} />
                                    <span className="uppercase tracking-wider">{category}</span>
                                    <span className="text-muted-foreground/50">({categoryTemplates.length})</span>
                                </div>
                                <div className="space-y-2">
                                    {categoryTemplates.map((template) => (
                                        <div
                                            key={template.id}
                                            className="p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={14} className="text-primary flex-shrink-0" />
                                                        <span className="font-medium truncate">{template.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                        {template.priority && (
                                                            <span className={cn(
                                                                "px-1.5 py-0.5 rounded",
                                                                template.priority === 'critical' && "bg-red-500/20 text-red-400",
                                                                template.priority === 'high' && "bg-orange-500/20 text-orange-400",
                                                                template.priority === 'medium' && "bg-yellow-500/20 text-yellow-400",
                                                                template.priority === 'low' && "bg-green-500/20 text-green-400",
                                                            )}>
                                                                {template.priority}
                                                            </span>
                                                        )}
                                                        {template.acceptanceCriteria && template.acceptanceCriteria.length > 0 && (
                                                            <span>{template.acceptanceCriteria.length} {t('views.templates.criteria')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <IconButton
                                                        variant="ghost"
                                                        size="xs"
                                                        onClick={() => handleEdit(template)}
                                                        title={t('actions.edit')}
                                                    >
                                                        <Pencil size={12} />
                                                    </IconButton>
                                                    <IconButton
                                                        variant="ghost"
                                                        size="xs"
                                                        onClick={() => handleDelete(template.id)}
                                                        title={t('actions.delete')}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 size={12} />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
