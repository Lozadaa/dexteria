import type { Skill } from '../../../../shared/types/skill';
import { frontendDesignSkill } from './frontend-design';
import { apiDesignSkill } from './api-design';
import { testingSkill } from './testing';
import { devopsSkill } from './devops';

export const BUNDLED_SKILLS: Skill[] = [
  frontendDesignSkill,
  apiDesignSkill,
  testingSkill,
  devopsSkill,
];
