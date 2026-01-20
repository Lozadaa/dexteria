/**
 * Jira Integration Plugin for Dexteria
 *
 * Provides bidirectional sync between Dexteria tasks and Jira issues.
 * Uses OAuth 2.0 (3LO) for authentication with Jira Cloud.
 */

const { AuthManager } = require('./lib/AuthManager');
const { JiraClient } = require('./lib/JiraClient');
const { ImportEngine } = require('./lib/ImportEngine');
const { SyncEngine } = require('./lib/SyncEngine');

let authManager = null;
let jiraClient = null;
let importEngine = null;
let syncEngine = null;
let pluginContext = null;

/**
 * Plugin activation entry point
 */
async function activate(context) {
  const { storage, log, hooks, api, ui } = context;
  pluginContext = context;

  log.info('Jira plugin activating...');

  // Initialize managers
  authManager = new AuthManager(storage, log);
  jiraClient = new JiraClient(authManager, storage, log);
  importEngine = new ImportEngine(jiraClient, storage, log);
  syncEngine = new SyncEngine(jiraClient, importEngine, storage, log);

  // Register task movement hook for syncing to Jira
  hooks.on('task:afterMove', async (ctx) => {
    const { task, fromColumn, toColumn } = ctx;
    if (fromColumn === toColumn) return;

    const config = await storage.get('config') || {};
    if (!config.syncEnabled) return;

    try {
      const result = await syncEngine.syncTaskToJira(task.id, {
        ...task,
        status: toColumn
      });

      if (result.synced) {
        log.info(`Synced task ${task.id} to Jira: ${result.jiraKey}`);
      } else if (result.reason === 'not-linked') {
        // Task not linked to Jira, ignore
      } else {
        log.warn(`Could not sync task ${task.id}: ${result.reason}`);
      }
    } catch (err) {
      log.error(`Error syncing task ${task.id}: ${err.message}`);
    }
  });

  // Register context menu items for tasks
  ui.registerContextMenuItem(
    {
      id: 'link-to-jira',
      label: 'Link to Jira Issue',
      icon: 'link',
      location: 'task',
      order: 100,
    },
    async (ctx) => {
      log.info(`Link to Jira requested for task: ${ctx.task?.id}`);
      // This will be handled by the UI
    }
  );

  ui.registerContextMenuItem(
    {
      id: 'view-in-jira',
      label: 'View in Jira',
      icon: 'external-link',
      location: 'task',
      order: 101,
    },
    async (ctx) => {
      const taskId = ctx.task?.id;
      if (!taskId) return;

      const mapping = await importEngine.getMapping(taskId);
      if (mapping) {
        const connection = await authManager.getConnectionInfo();
        if (connection?.siteUrl) {
          const url = `${connection.siteUrl}/browse/${mapping.jiraKey}`;
          log.info(`Opening Jira issue: ${url}`);
          // Request to open URL will be handled by renderer
        }
      } else {
        log.warn('Task is not linked to a Jira issue');
      }
    }
  );

  ui.registerContextMenuItem(
    {
      id: 'unlink-from-jira',
      label: 'Unlink from Jira',
      icon: 'unlink',
      location: 'task',
      order: 102,
    },
    async (ctx) => {
      const taskId = ctx.task?.id;
      if (!taskId) return;

      await importEngine.removeMapping(taskId);
      log.info(`Unlinked task ${taskId} from Jira`);
    }
  );

  // Start auto-sync if enabled
  const config = await storage.get('config') || {};
  if (config.autoSync) {
    await syncEngine.startAutoSync();
  }

  log.info('Jira plugin activated');
}

/**
 * Plugin deactivation
 */
async function deactivate() {
  if (pluginContext) {
    pluginContext.log.info('Jira plugin deactivating...');
  }

  // Stop auto-sync
  if (syncEngine) {
    syncEngine.stopAutoSync();
  }

  // Unregister context menu items
  if (pluginContext?.ui) {
    pluginContext.ui.unregisterContextMenuItem('link-to-jira');
    pluginContext.ui.unregisterContextMenuItem('view-in-jira');
    pluginContext.ui.unregisterContextMenuItem('unlink-from-jira');
  }

  if (pluginContext) {
    pluginContext.log.info('Jira plugin deactivated');
  }
}

/**
 * Plugin API - exposed to the application
 */
const api = {
  /**
   * Authentication API
   */
  auth: {
    isConfigured: async () => authManager?.isConfigured() ?? false,
    isConnected: async () => authManager?.isConnected() ?? false,
    getAuthUrl: async () => authManager?.getAuthorizationUrl(),
    completeAuth: async (code, state) => authManager?.exchangeCodeForTokens(code, state),
    getConnectionInfo: async () => authManager?.getConnectionInfo(),
    disconnect: async () => authManager?.disconnect(),
    saveSettings: async (settings) => {
      await pluginContext?.storage.set('settings', settings);
      pluginContext?.log.info('OAuth settings saved');
    },
    getSettings: async () => {
      const settings = await pluginContext?.storage.get('settings') || {};
      return {
        clientId: settings.clientId || '',
        clientSecret: settings.clientSecret ? '********' : '',
        redirectUri: settings.redirectUri || 'http://localhost:19846/callback',
        hasSecret: !!settings.clientSecret,
      };
    },
  },

  /**
   * Projects API
   */
  projects: {
    list: async () => jiraClient?.getProjects() ?? [],
    getStatuses: async (projectKey) => jiraClient?.getProjectStatuses(projectKey) ?? [],
    getSuggestedMapping: async (projectKey) => importEngine?.getSuggestedStatusMapping(projectKey) ?? [],
  },

  /**
   * Import API
   */
  import: {
    preview: async (options) => importEngine?.previewImport(options),
    import: async (options) => {
      if (!importEngine || !pluginContext) {
        throw new Error('Plugin not initialized');
      }

      const result = await importEngine.importIssues(options);
      const createdTasks = [];

      for (let i = 0; i < result.tasks.length; i++) {
        const taskData = result.tasks[i];
        const issue = result.issues[i];

        try {
          // Create the task
          const task = await pluginContext.api.tasks.create(taskData.title, taskData.status);

          // Update with full data
          await pluginContext.api.tasks.update(task.id, {
            description: taskData.description,
            priority: taskData.priority,
            tags: taskData.tags,
            acceptanceCriteria: taskData.acceptanceCriteria,
          });

          // Save mapping
          await importEngine.saveMapping(task.id, issue);

          createdTasks.push(task);
          pluginContext.log.info(`Imported ${issue.key} as task ${task.id}`);
        } catch (err) {
          pluginContext.log.error(`Failed to import ${issue.key}: ${err.message}`);
        }
      }

      return {
        ...result,
        created: createdTasks.length,
      };
    },
  },

  /**
   * Sync API
   */
  sync: {
    checkUpdates: async () => syncEngine?.syncFromJira(),
    applyUpdate: async (taskId, jiraStatus, dexteriaColumn) => {
      if (!pluginContext || !syncEngine) return;
      await pluginContext.api.tasks.move(taskId, dexteriaColumn);
      await syncEngine.applyJiraUpdate(taskId, jiraStatus);
    },
    syncToJira: async (taskId, task) => syncEngine?.syncTaskToJira(taskId, task),
    startAutoSync: async () => syncEngine?.startAutoSync(),
    stopAutoSync: async () => syncEngine?.stopAutoSync(),
    getHistory: async (limit) => syncEngine?.getHistory(limit),
    clearHistory: async () => syncEngine?.clearHistory(),
    getState: async () => syncEngine?.getSyncState(),
  },

  /**
   * Mappings API
   */
  mappings: {
    get: async (taskId) => importEngine?.getMapping(taskId),
    getAll: async () => importEngine?.getAllMappings() ?? {},
    remove: async (taskId) => importEngine?.removeMapping(taskId),
    link: async (taskId, issueKey) => {
      if (!jiraClient || !importEngine) {
        throw new Error('Plugin not initialized');
      }
      const issue = await jiraClient.getIssue(issueKey);
      await importEngine.saveMapping(taskId, issue);
      return issue;
    },
  },

  /**
   * Configuration API
   */
  config: {
    get: async () => {
      const config = await pluginContext?.storage.get('config') || {};
      return {
        projectKey: config.projectKey || null,
        jqlFilter: config.jqlFilter || '',
        syncEnabled: config.syncEnabled || false,
        autoSync: config.autoSync || false,
        syncInterval: config.syncInterval || 5,
        statusMapping: config.statusMapping || [],
      };
    },
    save: async (config) => {
      await pluginContext?.storage.set('config', config);
      pluginContext?.log.info('Configuration saved');

      // Restart auto-sync if setting changed
      syncEngine?.stopAutoSync();
      if (config.autoSync) {
        await syncEngine?.startAutoSync();
      }
    },
    saveStatusMapping: async (mapping) => {
      const config = await pluginContext?.storage.get('config') || {};
      config.statusMapping = mapping;
      await pluginContext?.storage.set('config', config);
      pluginContext?.log.info('Status mapping saved');
    },
  },

  /**
   * Issues API (direct Jira access)
   */
  issues: {
    search: async (jql, options) => jiraClient?.searchIssues(jql, options),
    get: async (issueKey) => jiraClient?.getIssue(issueKey),
    getTransitions: async (issueKey) => jiraClient?.getTransitions(issueKey),
  },
};

module.exports = { activate, deactivate, api };
