/**
 * Jira Sync Engine
 *
 * Handles bidirectional synchronization between Dexteria tasks and Jira issues.
 */

class SyncEngine {
  constructor(jiraClient, importEngine, storage, log) {
    this.jiraClient = jiraClient;
    this.importEngine = importEngine;
    this.storage = storage;
    this.log = log;
    this.syncInterval = null;
  }

  /**
   * Start automatic synchronization
   */
  async startAutoSync() {
    const config = await this.storage.get('config') || {};
    if (!config.autoSync) {
      this.log.info('Auto-sync is disabled');
      return;
    }

    const intervalMinutes = config.syncInterval || 5;
    const intervalMs = intervalMinutes * 60 * 1000;

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncFromJira();
      } catch (err) {
        this.log.error(`Auto-sync error: ${err.message}`);
      }
    }, intervalMs);

    this.log.info(`Auto-sync started (every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.log.info('Auto-sync stopped');
    }
  }

  /**
   * Sync a task status change to Jira
   */
  async syncTaskToJira(taskId, task) {
    const mapping = await this.importEngine.getMapping(taskId);
    if (!mapping) {
      return { synced: false, reason: 'not-linked' };
    }

    const config = await this.storage.get('config') || {};
    const statusMapping = config.statusMapping || [];

    // Find the Jira status that corresponds to the task's column
    const targetStatus = statusMapping.find(m =>
      m.dexteriaColumn === task.status
    );

    if (!targetStatus) {
      this.log.warn(`No status mapping found for column: ${task.status}`);
      return { synced: false, reason: 'no-mapping' };
    }

    try {
      // Get available transitions
      const transitions = await this.jiraClient.getTransitions(mapping.jiraKey);

      // Find a transition that leads to our target status
      const transition = transitions.find(t =>
        t.to.id === targetStatus.jiraStatusId ||
        t.to.name === targetStatus.jiraStatusName
      );

      if (!transition) {
        this.log.warn(`No valid transition to ${targetStatus.jiraStatusName} for ${mapping.jiraKey}`);
        return {
          synced: false,
          reason: 'no-transition',
          availableTransitions: transitions.map(t => t.to.name)
        };
      }

      // Execute the transition
      await this.jiraClient.transitionIssue(mapping.jiraKey, transition.id);

      // Update mapping
      const mappings = await this.storage.get('mappings') || {};
      mappings[taskId] = {
        ...mapping,
        jiraStatus: targetStatus.jiraStatusName,
        lastSynced: Date.now()
      };
      await this.storage.set('mappings', mappings);

      // Log to history
      await this.addToHistory({
        type: 'sync-to-jira',
        taskId,
        jiraKey: mapping.jiraKey,
        from: mapping.jiraStatus,
        to: targetStatus.jiraStatusName,
        success: true
      });

      this.log.info(`Synced ${mapping.jiraKey}: ${mapping.jiraStatus} -> ${targetStatus.jiraStatusName}`);
      return { synced: true, jiraKey: mapping.jiraKey };

    } catch (err) {
      this.log.error(`Failed to sync ${mapping.jiraKey}: ${err.message}`);

      await this.addToHistory({
        type: 'sync-to-jira',
        taskId,
        jiraKey: mapping.jiraKey,
        success: false,
        error: err.message
      });

      return { synced: false, reason: err.message };
    }
  }

  /**
   * Check for updates from Jira and return what needs to be updated
   */
  async syncFromJira() {
    const mappings = await this.storage.get('mappings') || {};
    const jiraKeys = Object.values(mappings).map(m => m.jiraKey);

    if (jiraKeys.length === 0) {
      return { updates: [], checked: 0 };
    }

    const config = await this.storage.get('config') || {};
    const statusMapping = config.statusMapping || [];

    // Fetch current state from Jira
    const jql = `key IN (${jiraKeys.map(k => `"${k}"`).join(',')})`;
    const result = await this.jiraClient.searchIssues(jql, { maxResults: jiraKeys.length });

    const updates = [];

    for (const issue of result.issues) {
      // Find the corresponding task mapping
      const [taskId, mapping] = Object.entries(mappings).find(
        ([, m]) => m.jiraKey === issue.key
      ) || [];

      if (!taskId) continue;

      // Check if status changed in Jira
      if (mapping.jiraStatus !== issue.status.name) {
        // Find the Dexteria column for this status
        const statusMap = statusMapping.find(m =>
          m.jiraStatusId === issue.status.id ||
          m.jiraStatusName === issue.status.name
        );

        const dexteriaColumn = statusMap?.dexteriaColumn ||
          this.categoryToColumn(issue.status.category);

        updates.push({
          taskId,
          jiraKey: issue.key,
          previousJiraStatus: mapping.jiraStatus,
          newJiraStatus: issue.status.name,
          suggestedColumn: dexteriaColumn,
          issue
        });
      }
    }

    if (updates.length > 0) {
      this.log.info(`Found ${updates.length} updates from Jira`);
    }

    return {
      updates,
      checked: result.issues.length
    };
  }

  /**
   * Apply updates from Jira (update mappings after task is moved)
   */
  async applyJiraUpdate(taskId, jiraStatus) {
    const mappings = await this.storage.get('mappings') || {};
    if (mappings[taskId]) {
      mappings[taskId].jiraStatus = jiraStatus;
      mappings[taskId].lastSynced = Date.now();
      await this.storage.set('mappings', mappings);
    }
  }

  /**
   * Map Jira status category to Dexteria column
   */
  categoryToColumn(category) {
    const map = {
      'new': 'backlog',
      'indeterminate': 'doing',
      'done': 'done'
    };
    return map[category] || 'backlog';
  }

  /**
   * Add entry to sync history
   */
  async addToHistory(entry) {
    const history = await this.storage.get('syncHistory') || [];

    history.unshift({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry
    });

    // Keep last 100 entries
    if (history.length > 100) {
      history.splice(100);
    }

    await this.storage.set('syncHistory', history);
  }

  /**
   * Get sync history
   */
  async getHistory(limit = 20) {
    const history = await this.storage.get('syncHistory') || [];
    return history.slice(0, limit);
  }

  /**
   * Clear sync history
   */
  async clearHistory() {
    await this.storage.delete('syncHistory');
    this.log.info('Sync history cleared');
  }

  /**
   * Get sync state
   */
  async getSyncState() {
    return await this.storage.get('syncState') || {
      lastSync: null,
      inProgress: false,
      lastError: null
    };
  }

  /**
   * Update sync state
   */
  async updateSyncState(state) {
    const current = await this.getSyncState();
    await this.storage.set('syncState', { ...current, ...state });
  }
}

module.exports = { SyncEngine };
