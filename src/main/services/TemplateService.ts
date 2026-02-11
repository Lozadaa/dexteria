/**
 * Template Service
 *
 * Manages task templates for reusable task structures.
 * Templates are stored per-project in .local-kanban/templates.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { TaskTemplate, TemplatesFile, TaskPriority, TaskEpic } from '../../shared/types';

/**
 * Input for creating a new template
 */
export interface TemplateCreateInput {
  name: string;
  description?: string;
  category?: string;
  titleTemplate?: string;
  descriptionTemplate?: string;
  priority?: TaskPriority;
  acceptanceCriteria?: string[];
  tags?: string[];
  epic?: TaskEpic;
  humanOnly?: boolean;
  aiReviewable?: boolean;
  reviewCriteria?: string;
}

/**
 * Input for updating an existing template
 */
export interface TemplateUpdateInput extends Partial<TemplateCreateInput> {}

export class TemplateService {
  private templatesPath: string;
  private templates: TaskTemplate[] = [];

  constructor(projectRoot: string) {
    this.templatesPath = path.join(projectRoot, '.local-kanban', 'templates.json');
  }

  /**
   * Initialize the template service
   */
  async init(): Promise<void> {
    await this.load();
  }

  /**
   * Load templates from disk
   */
  private async load(): Promise<void> {
    try {
      if (fs.existsSync(this.templatesPath)) {
        const content = fs.readFileSync(this.templatesPath, 'utf-8');
        const data: TemplatesFile = JSON.parse(content);
        this.templates = data.templates || [];
      } else {
        this.templates = [];
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      this.templates = [];
    }
  }

  /**
   * Save templates to disk
   */
  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.templatesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: TemplatesFile = { templates: this.templates };
      fs.writeFileSync(this.templatesPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save templates:', error);
      throw error;
    }
  }

  /**
   * Get all templates
   */
  getAll(): TaskTemplate[] {
    return [...this.templates];
  }

  /**
   * Get templates by category
   */
  getByCategory(category: string): TaskTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  /**
   * Get a template by ID
   */
  getById(id: string): TaskTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  /**
   * Create a new template
   */
  async create(input: TemplateCreateInput): Promise<TaskTemplate> {
    const now = new Date().toISOString();

    const template: TaskTemplate = {
      id: `tmpl-${uuidv4().slice(0, 8)}`,
      name: input.name,
      description: input.description,
      category: input.category,
      titleTemplate: input.titleTemplate,
      descriptionTemplate: input.descriptionTemplate,
      priority: input.priority,
      acceptanceCriteria: input.acceptanceCriteria,
      tags: input.tags,
      epic: input.epic,
      humanOnly: input.humanOnly,
      aiReviewable: input.aiReviewable,
      reviewCriteria: input.reviewCriteria,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.push(template);
    await this.save();

    return template;
  }

  /**
   * Update an existing template
   */
  async update(id: string, input: TemplateUpdateInput): Promise<TaskTemplate | null> {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return null;

    const template = this.templates[index];
    const updated: TaskTemplate = {
      ...template,
      ...input,
      id: template.id, // Preserve ID
      createdAt: template.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    this.templates[index] = updated;
    await this.save();

    return updated;
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<boolean> {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.templates.splice(index, 1);
    await this.save();

    return true;
  }

  /**
   * Get unique categories from all templates
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const template of this.templates) {
      if (template.category) {
        categories.add(template.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Apply a template to create task data
   * Replaces {{placeholders}} in title and description
   */
  applyTemplate(
    templateId: string,
    variables: Record<string, string> = {}
  ): Partial<TaskTemplate> | null {
    const template = this.getById(templateId);
    if (!template) return null;

    // Replace placeholders in title and description
    let title = template.titleTemplate || '';
    let description = template.descriptionTemplate || '';

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      description = description.replace(new RegExp(placeholder, 'g'), value);
    }

    return {
      titleTemplate: title,
      descriptionTemplate: description,
      priority: template.priority,
      acceptanceCriteria: template.acceptanceCriteria ? [...template.acceptanceCriteria] : undefined,
      tags: template.tags ? [...template.tags] : undefined,
      epic: template.epic ? { ...template.epic } : undefined,
      humanOnly: template.humanOnly,
      aiReviewable: template.aiReviewable,
      reviewCriteria: template.reviewCriteria,
    };
  }
}

// Singleton instance per project
let instance: TemplateService | null = null;
let currentProjectRoot: string | null = null;

export function getTemplateService(projectRoot: string): TemplateService {
  if (!instance || currentProjectRoot !== projectRoot) {
    instance = new TemplateService(projectRoot);
    currentProjectRoot = projectRoot;
  }
  return instance;
}

export async function initTemplateService(projectRoot: string): Promise<TemplateService> {
  const service = getTemplateService(projectRoot);
  await service.init();
  return service;
}
