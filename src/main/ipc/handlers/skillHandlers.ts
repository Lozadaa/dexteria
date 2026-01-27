/**
 * Skill IPC Handlers
 *
 * Handles skill:* IPC channels for the renderer process.
 */

import { ipcMain } from 'electron';
import { getSkillRegistry } from '../../agent/skills/SkillRegistry';
import type { Skill } from '../../../shared/types/skill';

export function registerSkillHandlers(): void {
  ipcMain.handle('skill:getAll', () => {
    const registry = getSkillRegistry();
    if (!registry) return [];
    return registry.getAll();
  });

  ipcMain.handle('skill:get', (_event, skillId: string) => {
    const registry = getSkillRegistry();
    if (!registry) return null;
    return registry.get(skillId);
  });

  ipcMain.handle('skill:enable', (_event, skillId: string) => {
    const registry = getSkillRegistry();
    if (!registry) return { success: false, error: 'Registry not initialized' };
    return { success: registry.enable(skillId) };
  });

  ipcMain.handle('skill:disable', (_event, skillId: string) => {
    const registry = getSkillRegistry();
    if (!registry) return { success: false, error: 'Registry not initialized' };
    return { success: registry.disable(skillId) };
  });

  ipcMain.handle('skill:install', (_event, skill: Skill) => {
    const registry = getSkillRegistry();
    if (!registry) return { success: false, error: 'Registry not initialized' };
    return { success: registry.install(skill) };
  });

  ipcMain.handle('skill:remove', (_event, skillId: string) => {
    const registry = getSkillRegistry();
    if (!registry) return { success: false, error: 'Registry not initialized' };
    return { success: registry.remove(skillId) };
  });

  ipcMain.handle('skill:import', (_event, json: string) => {
    const registry = getSkillRegistry();
    if (!registry) return { success: false, error: 'Registry not initialized' };
    const result = registry.import(json);
    if ('error' in result) return { success: false, error: result.error };
    return { success: true, skill: result.skill };
  });

  ipcMain.handle('skill:export', (_event, skillId: string) => {
    const registry = getSkillRegistry();
    if (!registry) return null;
    return registry.export(skillId);
  });
}
