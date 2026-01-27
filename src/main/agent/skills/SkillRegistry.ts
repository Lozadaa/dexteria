/**
 * SkillRegistry
 *
 * Central registry for managing skills: load, install, enable, disable, remove.
 * Persists skill state to .local-kanban/skills.json via LocalKanbanStore.
 */

import type { Skill, SkillsFile } from '../../../shared/types/skill';
import type { LocalKanbanStore } from '../../services/LocalKanbanStore';
import { BUNDLED_SKILLS } from './bundled';

export class SkillRegistry {
  private store: LocalKanbanStore;
  private skills: Map<string, Skill> = new Map();

  constructor(store: LocalKanbanStore) {
    this.store = store;
    this.load();
  }

  /**
   * Load all skills: bundled + persisted state.
   */
  private load(): void {
    const skillsFile = this.store.getSkills();

    // Start with bundled skills
    for (const skill of BUNDLED_SKILLS) {
      // Apply persisted enabled state if exists
      const persisted = skillsFile.installed.find(s => s.id === skill.id);
      this.skills.set(skill.id, {
        ...skill,
        enabled: persisted ? persisted.enabled : skill.enabled,
      });
    }

    // Load custom/community skills from persisted data
    // (Custom skills store their full definition in skills.json)
    const customSkills = (skillsFile as any).customSkills as Skill[] | undefined;
    if (customSkills) {
      for (const skill of customSkills) {
        if (!this.skills.has(skill.id)) {
          const persisted = skillsFile.installed.find(s => s.id === skill.id);
          this.skills.set(skill.id, {
            ...skill,
            enabled: persisted ? persisted.enabled : skill.enabled,
          });
        }
      }
    }
  }

  /**
   * Persist current state to store.
   */
  private persist(): void {
    const installed = Array.from(this.skills.values()).map(s => ({
      id: s.id,
      enabled: s.enabled,
      source: s.source,
    }));

    const customSkills = Array.from(this.skills.values()).filter(
      s => s.source !== 'bundled'
    );

    this.store.saveSkills({
      version: 1,
      installed,
      ...(customSkills.length > 0 ? { customSkills } : {}),
    } as SkillsFile);
  }

  /**
   * Get all registered skills.
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get a skill by ID.
   */
  get(skillId: string): Skill | null {
    return this.skills.get(skillId) || null;
  }

  /**
   * Get only enabled skills.
   */
  getEnabled(): Skill[] {
    return this.getAll().filter(s => s.enabled);
  }

  /**
   * Enable a skill.
   */
  enable(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    skill.enabled = true;
    this.persist();
    return true;
  }

  /**
   * Disable a skill.
   */
  disable(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    skill.enabled = false;
    this.persist();
    return true;
  }

  /**
   * Install a custom/community skill.
   */
  install(skill: Skill): boolean {
    if (this.skills.has(skill.id)) return false;
    this.skills.set(skill.id, { ...skill, enabled: true });
    this.persist();
    return true;
  }

  /**
   * Remove a custom/community skill. Cannot remove bundled skills.
   */
  remove(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill || skill.source === 'bundled') return false;
    this.skills.delete(skillId);
    this.persist();
    return true;
  }

  /**
   * Export a skill as JSON string.
   */
  export(skillId: string): string | null {
    const skill = this.skills.get(skillId);
    if (!skill) return null;
    return JSON.stringify(skill, null, 2);
  }

  /**
   * Import a skill from JSON string.
   * Returns { skill } on success or { error } on failure.
   */
  import(json: string): { skill: Skill } | { error: string } {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return { error: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}` };
    }

    if (!parsed.id || typeof parsed.id !== 'string') {
      return { error: 'Missing required field: id' };
    }
    if (!parsed.name || typeof parsed.name !== 'string') {
      return { error: 'Missing required field: name' };
    }
    if (!parsed.promptContent || typeof parsed.promptContent !== 'string') {
      return { error: 'Missing required field: promptContent' };
    }

    const skill = parsed as unknown as Skill;
    skill.source = 'custom';
    skill.enabled = true;
    if (!skill.version) skill.version = '1.0.0';
    if (!skill.category) skill.category = 'general';
    if (!skill.keywords) skill.keywords = [];
    if (!skill.priority) skill.priority = 5;

    this.skills.set(skill.id, skill);
    this.persist();
    return { skill };
  }
}

// Singleton
let registryInstance: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry | null {
  return registryInstance;
}

export function initSkillRegistry(store: LocalKanbanStore): SkillRegistry {
  registryInstance = new SkillRegistry(store);
  return registryInstance;
}
