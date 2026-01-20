/**
 * Jira Import Engine
 *
 * Handles importing issues from Jira and transforming them to Dexteria tasks.
 */

const { PRIORITY_MAPPING, DEFAULT_STATUS_MAPPING } = require('./constants');

class ImportEngine {
  constructor(jiraClient, storage, log) {
    this.jiraClient = jiraClient;
    this.storage = storage;
    this.log = log;
  }

  /**
   * Preview import - returns issues that would be imported
   */
  async previewImport(options = {}) {
    const config = await this.storage.get('config') || {};
    const {
      projectKey = config.projectKey,
      jqlFilter = config.jqlFilter || '',
      includeExisting = false
    } = options;

    if (!projectKey) {
      throw new Error('No Jira project configured');
    }

    // Fetch issues from Jira
    const issues = await this.jiraClient.getProjectIssues(projectKey, jqlFilter);

    // Get existing mappings
    const mappings = await this.storage.get('mappings') || {};
    const existingJiraKeys = new Set(
      Object.values(mappings).map(m => m.jiraKey)
    );

    // Categorize issues
    const newIssues = [];
    const existingIssues = [];

    for (const issue of issues) {
      if (existingJiraKeys.has(issue.key)) {
        existingIssues.push(issue);
      } else {
        newIssues.push(issue);
      }
    }

    return {
      total: issues.length,
      new: newIssues,
      existing: existingIssues,
      toImport: includeExisting ? issues : newIssues
    };
  }

  /**
   * Import issues as Dexteria tasks
   * Returns the task data to be created (actual creation done by main.js)
   */
  async importIssues(options = {}) {
    const preview = await this.previewImport(options);
    const config = await this.storage.get('config') || {};
    const statusMapping = config.statusMapping || [];

    const tasksToCreate = preview.toImport.map(issue =>
      this.transformToTask(issue, statusMapping)
    );

    return {
      total: preview.total,
      imported: tasksToCreate.length,
      skipped: preview.existing.length,
      tasks: tasksToCreate,
      issues: preview.toImport
    };
  }

  /**
   * Transform a Jira issue to a Dexteria task
   */
  transformToTask(issue, statusMapping = []) {
    // Map Jira status to Dexteria column
    let status = 'backlog';

    // First try explicit mapping
    const statusMap = statusMapping.find(m =>
      m.jiraStatusId === issue.status.id ||
      m.jiraStatusName === issue.status.name
    );

    if (statusMap) {
      status = statusMap.dexteriaColumn;
    } else {
      // Fall back to category-based mapping
      status = DEFAULT_STATUS_MAPPING[issue.status.category] || 'backlog';
    }

    // Map priority
    const priority = PRIORITY_MAPPING[issue.priority?.name] || 'medium';

    // Build task object
    return {
      title: `[${issue.key}] ${issue.summary}`,
      description: this.buildDescription(issue),
      status,
      priority,
      tags: [...(issue.labels || []), 'jira'],
      acceptanceCriteria: [],
      metadata: {
        jiraKey: issue.key,
        jiraId: issue.id,
        jiraStatus: issue.status.name,
        jiraType: issue.issueType?.name,
        importedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Build a rich description from issue data
   */
  buildDescription(issue) {
    const parts = [];

    // Original description
    if (issue.description) {
      parts.push(issue.description);
    }

    // Metadata section
    parts.push('\n---');
    parts.push(`**Jira:** ${issue.key}`);

    if (issue.issueType?.name) {
      parts.push(`**Type:** ${issue.issueType.name}`);
    }

    if (issue.assignee?.name) {
      parts.push(`**Assignee:** ${issue.assignee.name}`);
    }

    if (issue.status?.name) {
      parts.push(`**Original Status:** ${issue.status.name}`);
    }

    return parts.join('\n');
  }

  /**
   * Save mapping between a Dexteria task and Jira issue
   */
  async saveMapping(taskId, issue) {
    const mappings = await this.storage.get('mappings') || {};

    mappings[taskId] = {
      jiraKey: issue.key,
      jiraId: issue.id,
      jiraStatus: issue.status?.name,
      lastSynced: Date.now(),
      syncDirection: 'both'
    };

    await this.storage.set('mappings', mappings);
    this.log.info(`Mapped task ${taskId} -> ${issue.key}`);
  }

  /**
   * Get mapping for a task
   */
  async getMapping(taskId) {
    const mappings = await this.storage.get('mappings') || {};
    return mappings[taskId] || null;
  }

  /**
   * Remove mapping for a task
   */
  async removeMapping(taskId) {
    const mappings = await this.storage.get('mappings') || {};
    const mapping = mappings[taskId];

    if (mapping) {
      delete mappings[taskId];
      await this.storage.set('mappings', mappings);
      this.log.info(`Removed mapping for task ${taskId}`);
    }

    return mapping;
  }

  /**
   * Get all mappings
   */
  async getAllMappings() {
    return await this.storage.get('mappings') || {};
  }

  /**
   * Get suggested status mapping based on project statuses
   */
  async getSuggestedStatusMapping(projectKey) {
    const statuses = await this.jiraClient.getProjectStatuses(projectKey);

    return statuses.map(status => {
      let dexteriaColumn = 'backlog';

      // Map based on category
      if (status.category === 'done') {
        dexteriaColumn = 'done';
      } else if (status.category === 'indeterminate') {
        // Try to guess based on name
        const name = status.name.toLowerCase();
        if (name.includes('review') || name.includes('test') || name.includes('qa')) {
          dexteriaColumn = 'review';
        } else if (name.includes('progress') || name.includes('doing') || name.includes('dev')) {
          dexteriaColumn = 'doing';
        } else if (name.includes('todo') || name.includes('to do') || name.includes('ready')) {
          dexteriaColumn = 'todo';
        } else {
          dexteriaColumn = 'doing';
        }
      } else {
        // 'new' category
        const name = status.name.toLowerCase();
        if (name.includes('todo') || name.includes('to do') || name.includes('selected')) {
          dexteriaColumn = 'todo';
        }
      }

      return {
        jiraStatusId: status.id,
        jiraStatusName: status.name,
        jiraCategory: status.category,
        dexteriaColumn
      };
    });
  }
}

module.exports = { ImportEngine };
