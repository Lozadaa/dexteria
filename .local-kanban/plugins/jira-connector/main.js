/**
 * Jira Connector Plugin
 *
 * Connects Dexteria with Jira Cloud to import and sync tasks.
 * Uses Jira REST API v3.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
 */

const https = require('https');
const { URL } = require('url');

/**
 * Jira API Client
 */
class JiraClient {
  constructor(domain, email, apiToken) {
    this.domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${this.domain}`;
    this.auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  /**
   * Make an authenticated request to Jira API
   * @param {string} method - HTTP method
   * @param {string} path - API path (e.g., /rest/api/3/issue)
   * @param {object} body - Request body (optional)
   * @returns {Promise<object>} Response data
   */
  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch (e) {
              resolve({ raw: data });
            }
          } else {
            let errorMessage = `HTTP ${res.statusCode}`;
            try {
              const errorData = JSON.parse(data);
              if (errorData.errorMessages) {
                errorMessage = errorData.errorMessages.join(', ');
              } else if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch (e) {
              errorMessage = data || errorMessage;
            }
            reject(new Error(`Jira API Error: ${errorMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Test connection to Jira
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async testConnection() {
    try {
      const user = await this.request('GET', '/rest/api/3/myself');
      return {
        success: true,
        user: {
          accountId: user.accountId,
          displayName: user.displayName,
          emailAddress: user.emailAddress,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all projects
   * @returns {Promise<Array>}
   */
  async getProjects() {
    const response = await this.request('GET', '/rest/api/3/project');
    return response.map(project => ({
      id: project.id,
      key: project.key,
      name: project.name,
    }));
  }

  /**
   * Search issues using JQL
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/
   * @param {string} jql - JQL query
   * @param {number} startAt - Start index
   * @param {number} maxResults - Max results (default 50)
   * @returns {Promise<{issues: Array, total: number}>}
   */
  async searchIssues(jql, startAt = 0, maxResults = 50) {
    const params = new URLSearchParams({
      jql,
      startAt: startAt.toString(),
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,priority,assignee,reporter,issuetype,created,updated,labels,project',
    });

    const response = await this.request('GET', `/rest/api/3/search?${params.toString()}`);

    return {
      issues: response.issues.map(issue => this.transformIssue(issue)),
      total: response.total,
      startAt: response.startAt,
      maxResults: response.maxResults,
    };
  }

  /**
   * Get a single issue
   * @param {string} issueKeyOrId - Issue key (e.g., PROJ-123) or ID
   * @returns {Promise<object>}
   */
  async getIssue(issueKeyOrId) {
    const response = await this.request('GET', `/rest/api/3/issue/${issueKeyOrId}`);
    return this.transformIssue(response);
  }

  /**
   * Get available transitions for an issue
   * @param {string} issueKeyOrId - Issue key or ID
   * @returns {Promise<Array>}
   */
  async getTransitions(issueKeyOrId) {
    const response = await this.request('GET', `/rest/api/3/issue/${issueKeyOrId}/transitions`);
    return response.transitions.map(t => ({
      id: t.id,
      name: t.name,
      to: t.to ? t.to.name : null,
    }));
  }

  /**
   * Transition an issue to a new status
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
   * @param {string} issueKeyOrId - Issue key or ID
   * @param {string} transitionId - Transition ID
   * @returns {Promise<void>}
   */
  async transitionIssue(issueKeyOrId, transitionId) {
    await this.request('POST', `/rest/api/3/issue/${issueKeyOrId}/transitions`, {
      transition: { id: transitionId },
    });
  }

  /**
   * Transform Jira issue to Dexteria-compatible format
   * @param {object} issue - Raw Jira issue
   * @returns {object} Transformed issue
   */
  transformIssue(issue) {
    const fields = issue.fields || {};

    // Extract description text from Atlassian Document Format
    let description = '';
    if (fields.description && fields.description.content) {
      description = this.extractTextFromADF(fields.description);
    }

    // Map Jira status to Dexteria status
    const statusMapping = {
      'To Do': 'todo',
      'Open': 'backlog',
      'In Progress': 'doing',
      'In Review': 'review',
      'Done': 'done',
      'Closed': 'done',
      'Resolved': 'done',
    };

    const jiraStatus = fields.status?.name || 'To Do';
    const dexteriaStatus = statusMapping[jiraStatus] || 'backlog';

    // Map Jira priority to Dexteria priority
    const priorityMapping = {
      'Highest': 'critical',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Lowest': 'low',
    };

    const jiraPriority = fields.priority?.name || 'Medium';
    const dexteriaPriority = priorityMapping[jiraPriority] || 'medium';

    return {
      jiraKey: issue.key,
      jiraId: issue.id,
      jiraUrl: `https://${this.domain}/browse/${issue.key}`,
      summary: fields.summary || 'Untitled',
      description: description,
      status: dexteriaStatus,
      jiraStatus: jiraStatus,
      priority: dexteriaPriority,
      jiraPriority: jiraPriority,
      issueType: fields.issuetype?.name || 'Task',
      project: {
        key: fields.project?.key,
        name: fields.project?.name,
      },
      assignee: fields.assignee ? {
        accountId: fields.assignee.accountId,
        displayName: fields.assignee.displayName,
      } : null,
      reporter: fields.reporter ? {
        accountId: fields.reporter.accountId,
        displayName: fields.reporter.displayName,
      } : null,
      labels: fields.labels || [],
      created: fields.created,
      updated: fields.updated,
    };
  }

  /**
   * Extract plain text from Atlassian Document Format
   * @param {object} adf - ADF document
   * @returns {string} Plain text
   */
  extractTextFromADF(adf) {
    if (!adf || !adf.content) return '';

    const extractText = (node) => {
      if (!node) return '';

      if (node.type === 'text') {
        return node.text || '';
      }

      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('');
      }

      return '';
    };

    return adf.content.map(node => {
      const text = extractText(node);
      // Add newline after paragraphs
      if (node.type === 'paragraph') {
        return text + '\n';
      }
      return text;
    }).join('').trim();
  }
}

// Plugin state
let context = null;
let client = null;

/**
 * Get the Jira client, creating it if necessary
 */
async function getClient() {
  if (client) return client;

  const settings = await context.storage.get('settings') || {};

  if (!settings.domain || !settings.email || !settings.apiToken) {
    throw new Error('Jira connection not configured. Please configure in plugin settings.');
  }

  client = new JiraClient(settings.domain, settings.email, settings.apiToken);
  return client;
}

/**
 * Import issues from Jira
 * @param {object} options - Import options
 * @returns {Promise<{imported: number, errors: string[]}>}
 */
async function importIssues(options = {}) {
  const jira = await getClient();
  const settings = await context.storage.get('settings') || {};

  // Build JQL query
  let jql = options.jql || '';

  if (!jql) {
    const parts = [];

    // Filter by project
    const project = options.project || settings.defaultProject;
    if (project) {
      parts.push(`project = "${project}"`);
    }

    // Filter by assignee if setting enabled
    if (settings.importAssignedOnly) {
      parts.push('assignee = currentUser()');
    }

    // Default to non-resolved issues
    if (!options.includeResolved) {
      parts.push('resolution = Unresolved');
    }

    jql = parts.join(' AND ');
  }

  if (!jql) {
    throw new Error('No JQL query provided and no default project configured');
  }

  context.log.info(`Searching Jira with JQL: ${jql}`);

  const result = await jira.searchIssues(jql, 0, options.maxResults || 50);
  const imported = [];
  const errors = [];

  // Store mapping of Jira keys to task IDs
  const mapping = await context.storage.get('jira-task-mapping') || {};

  for (const issue of result.issues) {
    try {
      // Check if already imported
      if (mapping[issue.jiraKey]) {
        context.log.debug(`Issue ${issue.jiraKey} already imported as task ${mapping[issue.jiraKey]}`);
        continue;
      }

      // Create task via IPC (we'll need to implement this)
      // For now, store the issue data for later use
      const taskData = {
        jiraKey: issue.jiraKey,
        jiraId: issue.jiraId,
        jiraUrl: issue.jiraUrl,
        title: `[${issue.jiraKey}] ${issue.summary}`,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        metadata: {
          jira: {
            key: issue.jiraKey,
            id: issue.jiraId,
            url: issue.jiraUrl,
            project: issue.project,
            issueType: issue.issueType,
            assignee: issue.assignee,
            labels: issue.labels,
          },
        },
      };

      imported.push(taskData);

      context.log.info(`Prepared import for ${issue.jiraKey}: ${issue.summary}`);
    } catch (err) {
      errors.push(`${issue.jiraKey}: ${err.message}`);
      context.log.error(`Failed to import ${issue.jiraKey}: ${err.message}`);
    }
  }

  // Store imported issues for batch creation
  await context.storage.set('pending-imports', imported);

  return {
    total: result.total,
    prepared: imported.length,
    errors,
  };
}

/**
 * Activate the plugin
 * @param {object} ctx - Plugin context
 */
async function activate(ctx) {
  context = ctx;
  context.log.info('Jira Connector plugin activating...');

  // Register a custom tab for Jira import UI
  context.ui.registerTab({
    id: 'jira-import',
    label: 'Jira',
    icon: 'cloud-download',
    position: 'right',
    order: 10,
    component: `
      <div style="padding: 16px; font-family: system-ui, sans-serif; color: #e0e0e0;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px;">Jira Connector</h2>

        <div id="jira-status" style="padding: 12px; border-radius: 8px; background: #1e1e1e; margin-bottom: 16px;">
          <span style="color: #888;">Checking connection...</span>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #888;">JQL Query</label>
          <input
            type="text"
            id="jql-input"
            placeholder="e.g., project = PROJ AND status != Done"
            style="width: 100%; padding: 8px 12px; border: 1px solid #333; border-radius: 6px; background: #1e1e1e; color: #e0e0e0; font-size: 14px;"
          />
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #888;">Max Results</label>
          <input
            type="number"
            id="max-results"
            value="50"
            min="1"
            max="100"
            style="width: 100px; padding: 8px 12px; border: 1px solid #333; border-radius: 6px; background: #1e1e1e; color: #e0e0e0; font-size: 14px;"
          />
        </div>

        <button
          id="search-btn"
          style="padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-right: 8px;"
        >
          Search Issues
        </button>

        <button
          id="import-btn"
          style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          disabled
        >
          Import Selected
        </button>

        <div id="results" style="margin-top: 16px;"></div>
      </div>
    `,
    componentType: 'html',
  });

  // Register context menu item for tasks
  context.ui.registerContextMenuItem({
    id: 'link-to-jira',
    label: 'Link to Jira Issue',
    icon: 'link',
    location: 'task',
    order: 100,
  }, async (taskContext) => {
    context.log.info('Link to Jira requested for task:', taskContext);
    // This would open a dialog to link the task to a Jira issue
  });

  // Listen for task updates to potentially sync back to Jira
  context.hooks.on('task:afterUpdate', async (ctx) => {
    const mapping = await context.storage.get('jira-task-mapping') || {};

    // Find if this task is linked to a Jira issue
    const jiraKey = Object.keys(mapping).find(key => mapping[key] === ctx.taskId);

    if (jiraKey && ctx.patch.status) {
      context.log.info(`Task ${ctx.taskId} updated, may sync status to Jira ${jiraKey}`);
      // Could implement automatic status sync here
    }
  });

  context.log.info('Jira Connector plugin activated');
}

/**
 * Deactivate the plugin
 */
async function deactivate() {
  context.log.info('Jira Connector plugin deactivating...');
  client = null;
  context = null;
}

// Export plugin interface
module.exports = {
  activate,
  deactivate,

  // Expose API for direct calls from main process
  api: {
    testConnection: async () => {
      const jira = await getClient();
      return jira.testConnection();
    },

    getProjects: async () => {
      const jira = await getClient();
      return jira.getProjects();
    },

    searchIssues: async (jql, startAt, maxResults) => {
      const jira = await getClient();
      return jira.searchIssues(jql, startAt, maxResults);
    },

    getIssue: async (issueKey) => {
      const jira = await getClient();
      return jira.getIssue(issueKey);
    },

    importIssues,

    configure: async (settings) => {
      await context.storage.set('settings', settings);
      // Reset client to use new settings
      client = null;
    },

    getSettings: async () => {
      return context.storage.get('settings') || {};
    },
  },
};
