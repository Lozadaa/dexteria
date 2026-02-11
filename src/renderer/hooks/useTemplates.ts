/**
 * useTemplates Hook
 *
 * Provides access to task templates for the renderer.
 */

import { useState, useEffect, useCallback } from 'react';
import type { TaskTemplate } from '../../shared/types';

interface UseTemplatesResult {
  templates: TaskTemplate[];
  categories: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTemplate: (input: Partial<TaskTemplate>) => Promise<TaskTemplate | null>;
  updateTemplate: (id: string, input: Partial<TaskTemplate>) => Promise<TaskTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  applyTemplate: (templateId: string, variables?: Record<string, string>) => Promise<Partial<TaskTemplate> | null>;
  getByCategory: (category: string) => TaskTemplate[];
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allTemplates, allCategories] = await Promise.all([
        window.dexteria.template.getAll(),
        window.dexteria.template.getCategories(),
      ]);

      setTemplates(allTemplates);
      setCategories(allCategories);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTemplate = useCallback(async (input: Partial<TaskTemplate>): Promise<TaskTemplate | null> => {
    try {
      const template = await window.dexteria.template.create(input);
      if (template) {
        await refresh();
      }
      return template;
    } catch (err) {
      console.error('Failed to create template:', err);
      return null;
    }
  }, [refresh]);

  const updateTemplate = useCallback(async (id: string, input: Partial<TaskTemplate>): Promise<TaskTemplate | null> => {
    try {
      const template = await window.dexteria.template.update(id, input);
      if (template) {
        await refresh();
      }
      return template;
    } catch (err) {
      console.error('Failed to update template:', err);
      return null;
    }
  }, [refresh]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const deleted = await window.dexteria.template.delete(id);
      if (deleted) {
        await refresh();
      }
      return deleted;
    } catch (err) {
      console.error('Failed to delete template:', err);
      return false;
    }
  }, [refresh]);

  const applyTemplate = useCallback(async (templateId: string, variables: Record<string, string> = {}): Promise<Partial<TaskTemplate> | null> => {
    try {
      return await window.dexteria.template.apply(templateId, variables);
    } catch (err) {
      console.error('Failed to apply template:', err);
      return null;
    }
  }, []);

  const getByCategory = useCallback((category: string): TaskTemplate[] => {
    return templates.filter(t => t.category === category);
  }, [templates]);

  return {
    templates,
    categories,
    loading,
    error,
    refresh,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    getByCategory,
  };
}
