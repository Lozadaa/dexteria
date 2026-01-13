/**
 * Shared State and Utilities for IPC Handlers
 *
 * Contains shared state variables and utility functions used across all handler modules.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { LocalKanbanStore, initStore, getStore as getLocalStore } from '../../services/LocalKanbanStore';
import { AgentRuntime } from '../../agent/AgentRuntime';
import { Runner } from '../../agent/tools/Runner';
import { AgentProvider, MockAgentProvider } from '../../agent/AgentProvider';
import { AnthropicProvider } from '../../agent/providers/AnthropicProvider';
import { ClaudeCodeProvider } from '../../agent/providers/ClaudeCodeProvider';
import { initRalphEngine } from '../../agent/RalphEngine';
import type { RecentProject, HandlerState } from './types';

// Shared state
const state: HandlerState = {
  store: null,
  runtime: null,
  runner: null,
  agentProvider: null,
  projectRoot: null,
};

// Recent projects file path
const RECENT_PROJECTS_FILE = path.join(app.getPath('userData'), 'recent-projects.json');

/**
 * Check if a project is currently open.
 */
export function hasProject(): boolean {
  return state.projectRoot !== null && state.store !== null;
}

/**
 * Get the current store instance.
 */
export function getStore(): LocalKanbanStore {
  return getLocalStore();
}

/**
 * Get the current project root.
 */
export function getProjectRoot(): string | null {
  return state.projectRoot;
}

/**
 * Set the project root.
 */
export function setProjectRoot(root: string | null): void {
  state.projectRoot = root;
}

/**
 * Get the current store from state.
 */
export function getStateStore(): LocalKanbanStore | null {
  return state.store;
}

/**
 * Set the store in state.
 */
export function setStore(store: LocalKanbanStore | null): void {
  state.store = store;
}

/**
 * Get the current runtime.
 */
export function getRuntime(): AgentRuntime | null {
  return state.runtime;
}

/**
 * Set the runtime.
 */
export function setRuntime(runtime: AgentRuntime | null): void {
  state.runtime = runtime;
}

/**
 * Get the current runner.
 */
export function getRunner(): Runner | null {
  return state.runner;
}

/**
 * Set the runner.
 */
export function setRunner(runner: Runner | null): void {
  state.runner = runner;
}

/**
 * Get the current agent provider.
 */
export function getAgentProvider(): AgentProvider | null {
  return state.agentProvider;
}

/**
 * Set the agent provider.
 */
export function setAgentProvider(provider: AgentProvider | null): void {
  state.agentProvider = provider;
}

/**
 * Initialize or get the agent provider based on configuration.
 * Default: ClaudeCodeProvider (uses Claude Code CLI)
 */
export function getOrCreateProvider(): AgentProvider {
  if (state.agentProvider && state.agentProvider.isReady()) {
    return state.agentProvider;
  }

  // Default to Claude Code provider (uses existing Claude Code authentication)
  const claudeCodeProvider = new ClaudeCodeProvider({
    workingDirectory: state.projectRoot || process.cwd(),
  });

  if (claudeCodeProvider.isReady()) {
    state.agentProvider = claudeCodeProvider;
    console.log('Using Claude Code provider');
    return state.agentProvider;
  }

  // Fallback to Anthropic if API key is set
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    state.agentProvider = new AnthropicProvider({ apiKey: anthropicKey });
    console.log('Using Anthropic provider (API key found)');
    return state.agentProvider;
  }

  // Last resort: Mock provider
  state.agentProvider = new MockAgentProvider();
  console.log('Using Mock provider (Claude Code not available, no API key)');
  return state.agentProvider;
}

/**
 * Load recent projects from disk.
 */
export function loadRecentProjects(): RecentProject[] {
  try {
    if (fs.existsSync(RECENT_PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(RECENT_PROJECTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load recent projects:', err);
  }
  return [];
}

/**
 * Save recent projects to disk.
 */
export function saveRecentProjects(projects: RecentProject[]): void {
  try {
    fs.writeFileSync(RECENT_PROJECTS_FILE, JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error('Failed to save recent projects:', err);
  }
}

/**
 * Add a project to recent projects list.
 */
export function addToRecentProjects(projectPath: string): void {
  const projects = loadRecentProjects();
  const name = path.basename(projectPath);
  const now = new Date().toISOString();

  // Remove if already exists
  const filtered = projects.filter(p => p.path !== projectPath);

  // Add at the beginning
  filtered.unshift({ path: projectPath, name, lastOpened: now });

  // Keep only 10 recent
  saveRecentProjects(filtered.slice(0, 10));
}

/**
 * Initialize project-related state.
 */
export function initializeProjectState(root: string): void {
  state.projectRoot = root;
  state.store = initStore(root);
  const policy = state.store.getPolicy();

  // Initialize runner
  state.runner = new Runner(root, policy, state.store);

  // Initialize provider (will use Claude Code by default)
  state.agentProvider = getOrCreateProvider();

  // Initialize Ralph engine with provider (only if ClaudeCodeProvider)
  initRalphEngine({
    projectRoot: root,
    store: state.store,
    provider: state.agentProvider instanceof ClaudeCodeProvider ? state.agentProvider : undefined,
  });
}

/**
 * Clear project-related state.
 */
export function clearProjectState(): void {
  state.store = null;
  state.projectRoot = null;
  state.runner = null;
}

// Re-export provider classes for type checking
export { ClaudeCodeProvider, AnthropicProvider, MockAgentProvider };
