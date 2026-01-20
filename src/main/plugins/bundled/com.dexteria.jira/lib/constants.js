/**
 * Jira API Constants
 */

// Atlassian OAuth URLs
const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com/authorize';
const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const ATLASSIAN_API_URL = 'https://api.atlassian.com';

// OAuth scopes needed for Jira integration
const OAUTH_SCOPES = [
  'read:jira-work',      // Read projects and issues
  'read:jira-user',      // Read user info
  'write:jira-work',     // Update issues (for sync)
  'offline_access'       // Refresh tokens
];

// Default status mapping (Jira category -> Dexteria column)
const DEFAULT_STATUS_MAPPING = {
  'new': 'backlog',
  'indeterminate': 'doing',
  'done': 'done'
};

// Jira priority to Dexteria priority mapping
const PRIORITY_MAPPING = {
  'Highest': 'critical',
  'High': 'high',
  'Medium': 'medium',
  'Low': 'low',
  'Lowest': 'low'
};

module.exports = {
  ATLASSIAN_AUTH_URL,
  ATLASSIAN_TOKEN_URL,
  ATLASSIAN_API_URL,
  OAUTH_SCOPES,
  DEFAULT_STATUS_MAPPING,
  PRIORITY_MAPPING
};
