/**
 * Skill Types
 *
 * Types for the AI Agent Skills system.
 * Skills are domain-expertise modules injected into the agent's system prompt.
 */

export type SkillCategory = 'frontend' | 'backend' | 'devops' | 'testing' | 'general';
export type SkillSource = 'bundled' | 'community' | 'custom';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  keywords: string[];
  promptContent: string;
  version: string;
  source: SkillSource;
  enabled: boolean;
  priority: number;
}

export interface SkillMatch {
  skillId: string;
  confidence: number;
}

export interface SkillsFile {
  version: number;
  installed: Array<{
    id: string;
    enabled: boolean;
    source: SkillSource;
  }>;
}
