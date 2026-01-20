/**
 * Jira API Client
 *
 * Handles all communication with the Jira Cloud REST API.
 * https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
 */

const { ATLASSIAN_API_URL } = require('./constants');

class JiraClient {
  constructor(authManager, storage, log) {
    this.authManager = authManager;
    this.storage = storage;
    this.log = log;
  }

  /**
   * Make an authenticated API request to Jira
   */
  async request(endpoint, options = {}) {
    const connection = await this.storage.get('connection');
    if (!connection?.cloudId) {
      throw new Error('Not connected to Jira');
    }

    const accessToken = await this.authManager.getAccessToken();
    const baseUrl = `${ATLASSIAN_API_URL}/ex/jira/${connection.cloudId}`;

    const url = `${baseUrl}${endpoint}`;
    this.log.debug(`Jira API: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.log.error(`Jira API error: ${response.status} - ${errorText}`);
      throw new Error(`Jira API error: ${response.status} - ${response.statusText}`);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * Get list of accessible projects
   * https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/
   */
  async getProjects() {
    const data = await this.request('/rest/api/3/project/search?maxResults=100');
    return data.values.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: p.avatarUrls?.['48x48'],
      style: p.style
    }));
  }

  /**
   * Get all statuses for a project
   */
  async getProjectStatuses(projectKey) {
    const data = await this.request(`/rest/api/3/project/${projectKey}/statuses`);

    // Flatten statuses from all issue types and deduplicate
    const statusMap = new Map();
    data.forEach(issueType => {
      issueType.statuses.forEach(status => {
        if (!statusMap.has(status.id)) {
          statusMap.set(status.id, {
            id: status.id,
            name: status.name,
            category: status.statusCategory?.key
          });
        }
      });
    });

    return Array.from(statusMap.values());
  }

  /**
   * Search issues using JQL
   * https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/
   */
  async searchIssues(jql, options = {}) {
    const {
      startAt = 0,
      maxResults = 50,
      fields = [
        'summary', 'description', 'status', 'priority',
        'assignee', 'labels', 'created', 'updated', 'issuetype'
      ]
    } = options;

    const data = await this.request('/rest/api/3/search', {
      method: 'POST',
      body: JSON.stringify({
        jql,
        startAt,
        maxResults,
        fields
      })
    });

    return {
      total: data.total,
      startAt: data.startAt,
      maxResults: data.maxResults,
      issues: data.issues.map(issue => this.transformIssue(issue))
    };
  }

  /**
   * Get all issues from a project with pagination
   */
  async getProjectIssues(projectKey, jqlFilter = '') {
    const allIssues = [];
    let startAt = 0;
    const maxResults = 100;

    let jql = `project = "${projectKey}"`;
    if (jqlFilter) {
      jql += ` AND (${jqlFilter})`;
    }
    jql += ' ORDER BY created DESC';

    this.log.info(`Fetching issues with JQL: ${jql}`);

    while (true) {
      const result = await this.searchIssues(jql, { startAt, maxResults });
      allIssues.push(...result.issues);

      this.log.info(`Fetched ${allIssues.length}/${result.total} issues`);

      if (startAt + result.issues.length >= result.total) {
        break;
      }

      startAt += maxResults;
    }

    return allIssues;
  }

  /**
   * Get a single issue by key
   */
  async getIssue(issueKey) {
    const data = await this.request(`/rest/api/3/issue/${issueKey}`);
    return this.transformIssue(data);
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey) {
    const data = await this.request(`/rest/api/3/issue/${issueKey}/transitions`);
    return data.transitions.map(t => ({
      id: t.id,
      name: t.name,
      to: {
        id: t.to.id,
        name: t.to.name,
        category: t.to.statusCategory?.key
      }
    }));
  }

  /**
   * Transition an issue to a new status
   */
  async transitionIssue(issueKey, transitionId) {
    await this.request(`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: { id: transitionId }
      })
    });
    this.log.info(`Transitioned issue ${issueKey}`);
  }

  /**
   * Transform Jira issue to internal format
   */
  transformIssue(issue) {
    return {
      id: issue.id,
      key: issue.key,
      self: issue.self,
      summary: issue.fields.summary,
      description: this.extractDescription(issue.fields.description),
      issueType: {
        id: issue.fields.issuetype?.id,
        name: issue.fields.issuetype?.name,
        iconUrl: issue.fields.issuetype?.iconUrl
      },
      status: {
        id: issue.fields.status?.id,
        name: issue.fields.status?.name,
        category: issue.fields.status?.statusCategory?.key
      },
      priority: {
        id: issue.fields.priority?.id,
        name: issue.fields.priority?.name
      },
      assignee: issue.fields.assignee ? {
        id: issue.fields.assignee.accountId,
        name: issue.fields.assignee.displayName,
        avatarUrl: issue.fields.assignee.avatarUrls?.['48x48']
      } : null,
      labels: issue.fields.labels || [],
      created: issue.fields.created,
      updated: issue.fields.updated
    };
  }

  /**
   * Extract plain text from Atlassian Document Format (ADF)
   */
  extractDescription(adf) {
    if (!adf || !adf.content) return '';

    const extractText = (node) => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.type === 'hardBreak') {
        return '\n';
      }
      if (node.content) {
        return node.content.map(extractText).join('');
      }
      return '';
    };

    const lines = adf.content.map(block => {
      const text = extractText(block);
      // Add newline after paragraphs and other block elements
      return text + (block.type === 'paragraph' ? '\n' : '');
    });

    return lines.join('').trim();
  }
}

module.exports = { JiraClient };
