/**
 * SkillMatcher
 *
 * Matches task descriptions against skill keywords to determine
 * which skills should be activated for a given task.
 */

import type { Skill, SkillMatch } from '../../../shared/types/skill';

export class SkillMatcher {
  /**
   * Match a text (task description + title) against available skills.
   * Returns skills sorted by confidence (highest first).
   */
  static match(text: string, skills: Skill[]): SkillMatch[] {
    const normalizedText = text.toLowerCase();
    const words = new Set(normalizedText.split(/\W+/).filter(w => w.length > 1));

    const matches: SkillMatch[] = [];

    for (const skill of skills) {
      if (!skill.enabled) continue;

      let matchedKeywords = 0;
      let totalWeight = 0;

      for (const keyword of skill.keywords) {
        const kw = keyword.toLowerCase();
        // Multi-word keywords check substring match
        if (kw.includes(' ')) {
          if (normalizedText.includes(kw)) {
            matchedKeywords++;
            totalWeight += 2; // Multi-word matches are stronger
          }
        } else if (words.has(kw)) {
          matchedKeywords++;
          totalWeight += 1;
        }
      }

      if (matchedKeywords === 0) continue;

      // Also boost if category name appears in text
      if (normalizedText.includes(skill.category)) {
        totalWeight += 1;
      }

      // Confidence: ratio of matched keywords weighted, capped at 100
      const maxPossibleWeight = skill.keywords.length;
      const confidence = Math.min(100, Math.round((totalWeight / Math.max(maxPossibleWeight, 1)) * 100));

      if (confidence >= 50) {
        matches.push({ skillId: skill.id, confidence });
      }
    }

    // Sort by confidence descending, then priority
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
}
