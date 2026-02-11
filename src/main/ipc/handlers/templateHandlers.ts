/**
 * Template Handlers
 *
 * IPC handlers for task template management operations.
 */

import { ipcMain } from 'electron';
import { getTemplateService, initTemplateService, TemplateCreateInput, TemplateUpdateInput } from '../../services/TemplateService';
import type { TaskTemplate } from '../../../shared/types';

let currentProjectRoot: string | null = null;

/**
 * Set the project root for template operations
 */
export function setTemplateProjectRoot(projectRoot: string): void {
  currentProjectRoot = projectRoot;
}

/**
 * Get the template service for the current project
 */
function getService() {
  if (!currentProjectRoot) {
    console.warn('[TemplateHandlers] No project root set');
    return null;
  }
  return getTemplateService(currentProjectRoot);
}

/**
 * Register all template-related IPC handlers
 */
export function registerTemplateHandlers(): void {
  // Initialize template service for a project
  ipcMain.handle('template:init', async (_, projectRoot: string): Promise<boolean> => {
    try {
      currentProjectRoot = projectRoot;
      await initTemplateService(projectRoot);
      console.log('[TemplateHandlers] Template service initialized');
      return true;
    } catch (error) {
      console.error('[TemplateHandlers] Failed to initialize:', error);
      return false;
    }
  });

  // Get all templates
  ipcMain.handle('template:getAll', async (): Promise<TaskTemplate[]> => {
    const service = getService();
    if (!service) return [];
    return service.getAll();
  });

  // Get template by ID
  ipcMain.handle('template:getById', async (_, id: string): Promise<TaskTemplate | null> => {
    const service = getService();
    if (!service) return null;
    return service.getById(id);
  });

  // Get templates by category
  ipcMain.handle('template:getByCategory', async (_, category: string): Promise<TaskTemplate[]> => {
    const service = getService();
    if (!service) return [];
    return service.getByCategory(category);
  });

  // Get all unique categories
  ipcMain.handle('template:getCategories', async (): Promise<string[]> => {
    const service = getService();
    if (!service) return [];
    return service.getCategories();
  });

  // Create a new template
  ipcMain.handle('template:create', async (_, input: TemplateCreateInput): Promise<TaskTemplate | null> => {
    const service = getService();
    if (!service) return null;

    try {
      const template = await service.create(input);
      console.log(`[TemplateHandlers] Created template: ${template.name}`);
      return template;
    } catch (error) {
      console.error('[TemplateHandlers] Failed to create template:', error);
      return null;
    }
  });

  // Update an existing template
  ipcMain.handle('template:update', async (_, id: string, input: TemplateUpdateInput): Promise<TaskTemplate | null> => {
    const service = getService();
    if (!service) return null;

    try {
      const template = await service.update(id, input);
      if (template) {
        console.log(`[TemplateHandlers] Updated template: ${template.name}`);
      }
      return template;
    } catch (error) {
      console.error('[TemplateHandlers] Failed to update template:', error);
      return null;
    }
  });

  // Delete a template
  ipcMain.handle('template:delete', async (_, id: string): Promise<boolean> => {
    const service = getService();
    if (!service) return false;

    try {
      const deleted = await service.delete(id);
      if (deleted) {
        console.log(`[TemplateHandlers] Deleted template: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error('[TemplateHandlers] Failed to delete template:', error);
      return false;
    }
  });

  // Apply a template with variables
  ipcMain.handle('template:apply', async (_, templateId: string, variables: Record<string, string>): Promise<Partial<TaskTemplate> | null> => {
    const service = getService();
    if (!service) return null;

    try {
      return service.applyTemplate(templateId, variables);
    } catch (error) {
      console.error('[TemplateHandlers] Failed to apply template:', error);
      return null;
    }
  });
}
