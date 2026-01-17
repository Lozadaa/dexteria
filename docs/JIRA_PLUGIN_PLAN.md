# Jira Integration Plugin - Implementation Plan

This document outlines the phased implementation plan for a Jira Cloud integration plugin for Dexteria. The plugin will allow users to import tasks from Jira, sync status changes bidirectionally, and maintain traceability between Dexteria tasks and Jira issues.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Foundation & Authentication](#phase-1-foundation--authentication)
4. [Phase 2: Import & Read Operations](#phase-2-import--read-operations)
5. [Phase 3: Bidirectional Sync](#phase-3-bidirectional-sync)
6. [Phase 4: Advanced Features](#phase-4-advanced-features)
7. [API Reference](#api-reference)
8. [Security Considerations](#security-considerations)

---

## Overview

### Goals

1. **Import Jira Issues** - Pull issues from Jira projects into Dexteria's Kanban board
2. **Status Synchronization** - Keep task status in sync between both systems
3. **Traceability** - Maintain clear links between Dexteria tasks and Jira issues
4. **Offline-First** - Work locally with periodic sync to Jira

### Non-Goals (v1)

- Creating new issues in Jira from Dexteria
- Syncing comments bidirectionally
- Handling Jira attachments
- Sprint/Epic management

### Jira API Overview

Based on the [Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/):

| Endpoint | Purpose |
|----------|---------|
| `GET /rest/api/3/search` | Search issues with JQL |
| `GET /rest/api/3/issue/{issueIdOrKey}` | Get single issue |
| `GET /rest/api/3/project` | List accessible projects |
| `GET /rest/api/3/status` | Get all statuses |
| `PUT /rest/api/3/issue/{issueIdOrKey}` | Update issue fields |
| `POST /rest/api/3/issue/{issueIdOrKey}/transitions` | Transition issue status |

### Required OAuth 2.0 Scopes

```
read:jira-work    - Read project and issue data, search issues
read:jira-user    - View user information (assignees, reporters)
write:jira-work   - Update issues (for bidirectional sync)
```

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dexteria Application                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Jira Plugin (Main Process)               │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │ JiraClient   │  │ SyncEngine   │  │ MappingStore │   │    │
│  │  │ (API calls)  │  │ (sync logic) │  │ (task links) │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  │           │               │                │             │    │
│  │           └───────────────┼────────────────┘             │    │
│  │                           │                              │    │
│  │  ┌────────────────────────▼─────────────────────────┐   │    │
│  │  │              Plugin Hooks Integration             │   │    │
│  │  │  • task:afterMove → sync status to Jira          │   │    │
│  │  │  • task:afterUpdate → sync fields to Jira        │   │    │
│  │  │  • board:refresh → check for Jira updates        │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ IPC                               │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Renderer (Settings UI)                      │    │
│  │  • Connection setup     • Project selection             │    │
│  │  • Status mapping       • Sync controls                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │   Jira Cloud API    │
                    │  (*.atlassian.net)  │
                    └─────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Jira      │     │   Plugin     │     │  Dexteria    │
│   Cloud      │     │   Storage    │     │   Tasks      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  1. Fetch Issues   │                    │
       │◄───────────────────│                    │
       │                    │                    │
       │  2. Issue Data     │                    │
       │───────────────────►│                    │
       │                    │                    │
       │                    │  3. Create Tasks   │
       │                    │───────────────────►│
       │                    │                    │
       │                    │  4. Store Mapping  │
       │                    │◄───────────────────│
       │                    │                    │
       │                    │  5. Task Moved     │
       │                    │◄───────────────────│
       │                    │                    │
       │  6. Update Status  │                    │
       │◄───────────────────│                    │
       │                    │                    │
```

### Storage Schema

```typescript
// Plugin storage structure
interface JiraPluginStorage {
  // Connection configuration
  connection: {
    cloudId: string;           // Atlassian Cloud ID
    siteUrl: string;           // https://xxx.atlassian.net
    accessToken: string;       // OAuth access token (encrypted)
    refreshToken: string;      // OAuth refresh token (encrypted)
    tokenExpiry: number;       // Token expiration timestamp
  } | null;

  // Sync configuration
  config: {
    projectKey: string;        // Jira project key (e.g., "PROJ")
    jqlFilter: string;         // Optional JQL filter
    autoSync: boolean;         // Enable auto-sync
    syncInterval: number;      // Sync interval in minutes
    statusMapping: StatusMapping[];
  };

  // Task-Issue mappings
  mappings: {
    [dexteriaTaskId: string]: {
      jiraKey: string;         // e.g., "PROJ-123"
      jiraId: string;          // Jira issue ID
      lastSynced: number;      // Last sync timestamp
      syncDirection: 'jira-to-dexteria' | 'dexteria-to-jira' | 'both';
    };
  };

  // Sync state
  syncState: {
    lastFullSync: number;
    inProgress: boolean;
    lastError: string | null;
  };
}

// Status mapping between systems
interface StatusMapping {
  jiraStatusId: string;
  jiraStatusName: string;
  dexteriaColumn: 'backlog' | 'todo' | 'doing' | 'review' | 'done';
}
```

---

## Phase 1: Foundation & Authentication

### Objectives

- Set up plugin structure and manifest
- Implement OAuth 2.0 authentication with Jira Cloud
- Create settings UI for connection configuration
- Test API connectivity

### Deliverables

#### 1.1 Plugin Structure

```
.local-kanban/plugins/com.dexteria.jira/
├── manifest.json
├── main.js
├── lib/
│   ├── JiraClient.js      # API client
│   ├── AuthManager.js     # OAuth handling
│   └── crypto.js          # Token encryption
└── ui/
    └── settings.html      # Settings panel
```

#### 1.2 manifest.json

```json
{
  "id": "com.dexteria.jira",
  "name": "Jira Integration",
  "version": "1.0.0",
  "author": "Dexteria Team",
  "description": "Import and sync tasks with Jira Cloud",
  "main": "main.js",
  "permissions": {
    "tasks": "full",
    "settings": "write",
    "ui": {
      "tabs": true,
      "contextMenus": true
    }
  },
  "contributes": {
    "tabs": [
      {
        "id": "jira-settings",
        "label": "Jira",
        "icon": "cloud",
        "position": "right"
      }
    ],
    "contextMenus": [
      {
        "location": "task",
        "items": [
          { "id": "jira.link", "label": "Link to Jira Issue", "icon": "link" },
          { "id": "jira.open", "label": "Open in Jira", "icon": "external-link" },
          { "id": "jira.sync", "label": "Sync with Jira", "icon": "refresh-cw" }
        ]
      }
    ],
    "commands": [
      { "id": "jira.connect", "title": "Connect to Jira" },
      { "id": "jira.disconnect", "title": "Disconnect from Jira" },
      { "id": "jira.import", "title": "Import from Jira" },
      { "id": "jira.syncAll", "title": "Sync All Tasks" }
    ]
  }
}
```

#### 1.3 OAuth 2.0 Implementation

```javascript
// lib/AuthManager.js

const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com/authorize';
const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const ATLASSIAN_API_URL = 'https://api.atlassian.com';

// OAuth 2.0 configuration
const OAUTH_CONFIG = {
  clientId: 'YOUR_CLIENT_ID',  // From Atlassian Developer Console
  redirectUri: 'http://localhost:3847/callback',  // Local callback
  scopes: [
    'read:jira-work',
    'read:jira-user',
    'write:jira-work',
    'offline_access'  // For refresh tokens
  ]
};

export class AuthManager {
  constructor(storage, log) {
    this.storage = storage;
    this.log = log;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: OAUTH_CONFIG.clientId,
      scope: OAUTH_CONFIG.scopes.join(' '),
      redirect_uri: OAUTH_CONFIG.redirectUri,
      response_type: 'code',
      prompt: 'consent',
      state: this.generateState()
    });

    return `${ATLASSIAN_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    const response = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: OAUTH_CONFIG.clientId,
        code: code,
        redirect_uri: OAUTH_CONFIG.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokens = await response.json();

    // Get accessible resources (cloud sites)
    const sites = await this.getAccessibleResources(tokens.access_token);

    // Store connection info
    await this.storage.set('connection', {
      accessToken: this.encrypt(tokens.access_token),
      refreshToken: this.encrypt(tokens.refresh_token),
      tokenExpiry: Date.now() + (tokens.expires_in * 1000),
      cloudId: sites[0]?.id,
      siteUrl: sites[0]?.url
    });

    this.log.info(`Connected to Jira: ${sites[0]?.name}`);
    return sites;
  }

  /**
   * Get list of accessible Jira sites
   */
  async getAccessibleResources(accessToken) {
    const response = await fetch(
      `${ATLASSIAN_API_URL}/oauth/token/accessible-resources`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get accessible resources');
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshTokens() {
    const connection = await this.storage.get('connection');
    if (!connection?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: OAUTH_CONFIG.clientId,
        refresh_token: this.decrypt(connection.refreshToken)
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();

    await this.storage.set('connection', {
      ...connection,
      accessToken: this.encrypt(tokens.access_token),
      refreshToken: this.encrypt(tokens.refresh_token),
      tokenExpiry: Date.now() + (tokens.expires_in * 1000)
    });

    this.log.info('Jira tokens refreshed');
    return tokens.access_token;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken() {
    const connection = await this.storage.get('connection');
    if (!connection) {
      throw new Error('Not connected to Jira');
    }

    // Refresh if token expires in less than 5 minutes
    if (connection.tokenExpiry < Date.now() + 300000) {
      return this.refreshTokens();
    }

    return this.decrypt(connection.accessToken);
  }

  /**
   * Check if connected to Jira
   */
  async isConnected() {
    const connection = await this.storage.get('connection');
    return !!connection?.accessToken;
  }

  /**
   * Disconnect from Jira
   */
  async disconnect() {
    await this.storage.delete('connection');
    this.log.info('Disconnected from Jira');
  }

  // Simple encryption (use a proper encryption library in production)
  encrypt(value) {
    return Buffer.from(value).toString('base64');
  }

  decrypt(value) {
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  generateState() {
    return Math.random().toString(36).substring(2, 15);
  }
}
```

#### 1.4 Main Entry Point (Phase 1)

```javascript
// main.js - Phase 1 implementation

import { AuthManager } from './lib/AuthManager.js';
import { JiraClient } from './lib/JiraClient.js';

let authManager = null;
let jiraClient = null;

export async function activate(context) {
  const { log, storage, hooks, ui } = context;

  log.info('Jira Integration plugin activating...');

  // Initialize managers
  authManager = new AuthManager(storage, log);
  jiraClient = new JiraClient(authManager, storage, log);

  // Register context menu handlers
  ui.registerContextMenuItem({
    id: 'jira.open',
    label: 'Open in Jira',
    icon: 'external-link',
    location: 'task'
  }, async (ctx) => {
    const mapping = await getTaskMapping(ctx.taskId);
    if (mapping) {
      const connection = await storage.get('connection');
      const url = `${connection.siteUrl}/browse/${mapping.jiraKey}`;
      require('electron').shell.openExternal(url);
    } else {
      log.warn('Task is not linked to a Jira issue');
    }
  });

  log.info('Jira Integration plugin activated');
}

export async function deactivate() {
  authManager = null;
  jiraClient = null;
}

// Exposed API
export const api = {
  // Connection
  async isConnected() {
    return authManager?.isConnected() ?? false;
  },

  async getAuthUrl() {
    return authManager?.getAuthorizationUrl();
  },

  async handleCallback(code) {
    return authManager?.exchangeCodeForTokens(code);
  },

  async disconnect() {
    return authManager?.disconnect();
  },

  async getConnectionStatus() {
    const connected = await authManager?.isConnected();
    if (!connected) return { connected: false };

    const connection = await storage.get('connection');
    return {
      connected: true,
      siteUrl: connection?.siteUrl,
      cloudId: connection?.cloudId
    };
  }
};

async function getTaskMapping(taskId) {
  const mappings = await storage.get('mappings') || {};
  return mappings[taskId] || null;
}
```

### Phase 1 Tasks

| Task | Description | Priority |
|------|-------------|----------|
| 1.1 | Create plugin directory structure | High |
| 1.2 | Implement manifest.json | High |
| 1.3 | Set up Atlassian Developer App | High |
| 1.4 | Implement OAuth 2.0 flow | High |
| 1.5 | Create local callback server for OAuth | High |
| 1.6 | Implement token storage with encryption | High |
| 1.7 | Add token refresh mechanism | High |
| 1.8 | Create basic settings UI | Medium |
| 1.9 | Test connection flow end-to-end | High |

---

## Phase 2: Import & Read Operations

### Objectives

- Implement JQL-based issue search
- Create task import functionality
- Map Jira fields to Dexteria task fields
- Store task-issue mappings

### Deliverables

#### 2.1 JiraClient Implementation

```javascript
// lib/JiraClient.js

export class JiraClient {
  constructor(authManager, storage, log) {
    this.authManager = authManager;
    this.storage = storage;
    this.log = log;
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const connection = await this.storage.get('connection');
    if (!connection?.cloudId) {
      throw new Error('Not connected to Jira');
    }

    const accessToken = await this.authManager.getAccessToken();
    const baseUrl = `https://api.atlassian.com/ex/jira/${connection.cloudId}`;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      this.log.error(`Jira API error: ${response.status} - ${error}`);
      throw new Error(`Jira API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get list of projects
   * https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/
   */
  async getProjects() {
    const data = await this.request('/rest/api/3/project/search');
    return data.values.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: p.avatarUrls?.['48x48']
    }));
  }

  /**
   * Get all statuses for a project
   */
  async getProjectStatuses(projectKey) {
    const data = await this.request(`/rest/api/3/project/${projectKey}/statuses`);
    // Flatten statuses from all issue types
    const statusMap = new Map();
    data.forEach(issueType => {
      issueType.statuses.forEach(status => {
        if (!statusMap.has(status.id)) {
          statusMap.set(status.id, {
            id: status.id,
            name: status.name,
            category: status.statusCategory?.key  // 'new', 'indeterminate', 'done'
          });
        }
      });
    });
    return Array.from(statusMap.values());
  }

  /**
   * Search issues with JQL
   * https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/
   */
  async searchIssues(jql, options = {}) {
    const {
      startAt = 0,
      maxResults = 50,
      fields = ['summary', 'description', 'status', 'priority', 'assignee', 'labels', 'created', 'updated']
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
   * Get all issues from a project (paginated)
   */
  async getProjectIssues(projectKey, jqlFilter = '') {
    const allIssues = [];
    let startAt = 0;
    const maxResults = 100;

    let jql = `project = ${projectKey}`;
    if (jqlFilter) {
      jql += ` AND (${jqlFilter})`;
    }
    jql += ' ORDER BY created DESC';

    while (true) {
      this.log.info(`Fetching issues ${startAt}-${startAt + maxResults}...`);

      const result = await this.searchIssues(jql, { startAt, maxResults });
      allIssues.push(...result.issues);

      if (startAt + result.issues.length >= result.total) {
        break;
      }

      startAt += maxResults;
    }

    this.log.info(`Fetched ${allIssues.length} issues from ${projectKey}`);
    return allIssues;
  }

  /**
   * Get single issue by key
   */
  async getIssue(issueKey) {
    const data = await this.request(`/rest/api/3/issue/${issueKey}`);
    return this.transformIssue(data);
  }

  /**
   * Transform Jira issue to internal format
   */
  transformIssue(issue) {
    return {
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      description: this.extractDescription(issue.fields.description),
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
        email: issue.fields.assignee.emailAddress
      } : null,
      labels: issue.fields.labels || [],
      created: issue.fields.created,
      updated: issue.fields.updated
    };
  }

  /**
   * Extract plain text from Jira's Atlassian Document Format
   */
  extractDescription(adf) {
    if (!adf || !adf.content) return '';

    const extractText = (node) => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.content) {
        return node.content.map(extractText).join('');
      }
      return '';
    };

    return adf.content.map(extractText).join('\n').trim();
  }
}
```

#### 2.2 Import Engine

```javascript
// lib/ImportEngine.js

export class ImportEngine {
  constructor(jiraClient, storage, log) {
    this.jiraClient = jiraClient;
    this.storage = storage;
    this.log = log;
  }

  /**
   * Import issues from Jira to Dexteria
   */
  async importIssues(options = {}) {
    const config = await this.storage.get('config');
    if (!config?.projectKey) {
      throw new Error('No Jira project configured');
    }

    const {
      projectKey = config.projectKey,
      jqlFilter = config.jqlFilter,
      overwriteExisting = false
    } = options;

    // Fetch issues from Jira
    const issues = await this.jiraClient.getProjectIssues(projectKey, jqlFilter);

    // Get existing mappings
    const mappings = await this.storage.get('mappings') || {};
    const existingJiraKeys = new Set(
      Object.values(mappings).map(m => m.jiraKey)
    );

    // Filter new issues
    const newIssues = overwriteExisting
      ? issues
      : issues.filter(i => !existingJiraKeys.has(i.key));

    this.log.info(`Importing ${newIssues.length} new issues...`);

    // Transform to Dexteria tasks
    const tasksToCreate = newIssues.map(issue =>
      this.transformToTask(issue, config.statusMapping)
    );

    return {
      total: issues.length,
      new: newIssues.length,
      skipped: issues.length - newIssues.length,
      tasks: tasksToCreate
    };
  }

  /**
   * Transform Jira issue to Dexteria task
   */
  transformToTask(issue, statusMapping = []) {
    // Map Jira status to Dexteria column
    const statusMap = statusMapping.find(m => m.jiraStatusId === issue.status.id);
    let status = 'backlog';  // Default

    if (statusMap) {
      status = statusMap.dexteriaColumn;
    } else {
      // Auto-map based on status category
      switch (issue.status.category) {
        case 'new':
          status = 'backlog';
          break;
        case 'indeterminate':
          status = 'doing';
          break;
        case 'done':
          status = 'done';
          break;
      }
    }

    // Map Jira priority to Dexteria priority
    const priorityMap = {
      'Highest': 'critical',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Lowest': 'low'
    };

    return {
      title: `[${issue.key}] ${issue.summary}`,
      description: issue.description || '',
      status,
      priority: priorityMap[issue.priority?.name] || 'medium',
      labels: issue.labels,
      acceptanceCriteria: [],  // Could be extracted from description
      metadata: {
        jiraKey: issue.key,
        jiraId: issue.id,
        jiraUrl: `${issue.self?.split('/rest')[0]}/browse/${issue.key}`,
        importedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Save mapping between Dexteria task and Jira issue
   */
  async saveMapping(taskId, jiraIssue) {
    const mappings = await this.storage.get('mappings') || {};

    mappings[taskId] = {
      jiraKey: jiraIssue.key,
      jiraId: jiraIssue.id,
      lastSynced: Date.now(),
      syncDirection: 'both'
    };

    await this.storage.set('mappings', mappings);
    this.log.info(`Mapped task ${taskId} to ${jiraIssue.key}`);
  }

  /**
   * Get suggested status mapping based on Jira project
   */
  async getSuggestedStatusMapping(projectKey) {
    const statuses = await this.jiraClient.getProjectStatuses(projectKey);

    return statuses.map(status => {
      // Auto-suggest based on status category and name
      let dexteriaColumn = 'backlog';

      if (status.category === 'done') {
        dexteriaColumn = 'done';
      } else if (status.category === 'indeterminate') {
        // Try to match by name
        const name = status.name.toLowerCase();
        if (name.includes('review') || name.includes('testing') || name.includes('qa')) {
          dexteriaColumn = 'review';
        } else if (name.includes('progress') || name.includes('doing') || name.includes('dev')) {
          dexteriaColumn = 'doing';
        } else {
          dexteriaColumn = 'todo';
        }
      } else {
        // category === 'new'
        const name = status.name.toLowerCase();
        if (name.includes('todo') || name.includes('to do') || name.includes('selected')) {
          dexteriaColumn = 'todo';
        }
      }

      return {
        jiraStatusId: status.id,
        jiraStatusName: status.name,
        dexteriaColumn,
        category: status.category
      };
    });
  }
}
```

#### 2.3 Updated API (Phase 2)

```javascript
// Add to main.js api object

export const api = {
  // ... Phase 1 methods ...

  // Projects
  async getProjects() {
    return jiraClient?.getProjects();
  },

  // Configuration
  async getConfig() {
    return storage.get('config');
  },

  async setConfig(config) {
    await storage.set('config', config);
    return true;
  },

  // Status mapping
  async getProjectStatuses(projectKey) {
    return jiraClient?.getProjectStatuses(projectKey);
  },

  async getSuggestedMapping(projectKey) {
    return importEngine?.getSuggestedStatusMapping(projectKey);
  },

  // Import
  async previewImport(options) {
    return importEngine?.importIssues({ ...options, preview: true });
  },

  async executeImport(options) {
    const result = await importEngine?.importIssues(options);

    // Create tasks in Dexteria (via IPC to main process)
    for (const taskData of result.tasks) {
      // This would call back to Dexteria's task creation
      const taskId = await createDexteriaTask(taskData);
      await importEngine.saveMapping(taskId, {
        key: taskData.metadata.jiraKey,
        id: taskData.metadata.jiraId
      });
    }

    await storage.set('syncState', {
      lastFullSync: Date.now(),
      inProgress: false,
      lastError: null
    });

    return result;
  },

  // Mappings
  async getMappings() {
    return storage.get('mappings') || {};
  },

  async getTaskMapping(taskId) {
    const mappings = await storage.get('mappings') || {};
    return mappings[taskId] || null;
  },

  async unlinkTask(taskId) {
    const mappings = await storage.get('mappings') || {};
    delete mappings[taskId];
    await storage.set('mappings', mappings);
    return true;
  }
};
```

### Phase 2 Tasks

| Task | Description | Priority |
|------|-------------|----------|
| 2.1 | Implement JiraClient with search | High |
| 2.2 | Add project listing endpoint | High |
| 2.3 | Implement status fetching | High |
| 2.4 | Create ImportEngine | High |
| 2.5 | Implement issue-to-task transformation | High |
| 2.6 | Add ADF (Atlassian Document Format) parser | Medium |
| 2.7 | Create mapping storage | High |
| 2.8 | Build import preview UI | Medium |
| 2.9 | Add status mapping configuration UI | Medium |
| 2.10 | Implement pagination for large projects | Medium |
| 2.11 | Add JQL filter input | Low |

---

## Phase 3: Bidirectional Sync

### Objectives

- Sync status changes from Dexteria to Jira
- Poll for Jira updates
- Handle conflict resolution
- Support selective sync per task

### Deliverables

#### 3.1 SyncEngine

```javascript
// lib/SyncEngine.js

export class SyncEngine {
  constructor(jiraClient, storage, log) {
    this.jiraClient = jiraClient;
    this.storage = storage;
    this.log = log;
    this.syncInterval = null;
  }

  /**
   * Start automatic sync
   */
  async startAutoSync() {
    const config = await this.storage.get('config');
    if (!config?.autoSync) return;

    const intervalMs = (config.syncInterval || 5) * 60 * 1000;

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncAll();
      } catch (error) {
        this.log.error(`Auto-sync failed: ${error.message}`);
      }
    }, intervalMs);

    this.log.info(`Auto-sync started (every ${config.syncInterval} minutes)`);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.log.info('Auto-sync stopped');
    }
  }

  /**
   * Sync a single task to Jira
   */
  async syncTaskToJira(taskId, task) {
    const mappings = await this.storage.get('mappings') || {};
    const mapping = mappings[taskId];

    if (!mapping) {
      this.log.warn(`Task ${taskId} is not linked to Jira`);
      return { synced: false, reason: 'not-linked' };
    }

    const config = await this.storage.get('config');

    // Find Jira status for current Dexteria column
    const statusMap = config.statusMapping?.find(
      m => m.dexteriaColumn === task.status
    );

    if (!statusMap) {
      this.log.warn(`No status mapping for column: ${task.status}`);
      return { synced: false, reason: 'no-mapping' };
    }

    try {
      // Get available transitions for the issue
      const transitions = await this.jiraClient.getTransitions(mapping.jiraKey);

      // Find transition to target status
      const transition = transitions.find(t =>
        t.to.id === statusMap.jiraStatusId ||
        t.to.name === statusMap.jiraStatusName
      );

      if (transition) {
        await this.jiraClient.transitionIssue(mapping.jiraKey, transition.id);
        this.log.info(`Synced ${mapping.jiraKey} to status: ${statusMap.jiraStatusName}`);

        // Update mapping timestamp
        mappings[taskId].lastSynced = Date.now();
        await this.storage.set('mappings', mappings);

        return { synced: true };
      } else {
        this.log.warn(`No valid transition found for ${mapping.jiraKey}`);
        return { synced: false, reason: 'no-transition' };
      }
    } catch (error) {
      this.log.error(`Failed to sync ${mapping.jiraKey}: ${error.message}`);
      return { synced: false, reason: error.message };
    }
  }

  /**
   * Sync updates from Jira to Dexteria
   */
  async syncFromJira() {
    const mappings = await this.storage.get('mappings') || {};
    const config = await this.storage.get('config');

    const jiraKeys = Object.values(mappings).map(m => m.jiraKey);
    if (jiraKeys.length === 0) return { updated: 0 };

    // Fetch current state from Jira
    const jql = `key IN (${jiraKeys.map(k => `"${k}"`).join(',')})`;
    const result = await this.jiraClient.searchIssues(jql);

    const updates = [];

    for (const issue of result.issues) {
      // Find corresponding Dexteria task
      const [taskId] = Object.entries(mappings).find(
        ([_, m]) => m.jiraKey === issue.key
      ) || [];

      if (!taskId) continue;

      // Check if status changed
      const expectedColumn = this.jiraStatusToColumn(
        issue.status.id,
        config.statusMapping
      );

      updates.push({
        taskId,
        jiraKey: issue.key,
        expectedColumn,
        jiraStatus: issue.status.name,
        lastUpdated: issue.updated
      });
    }

    return { updates };
  }

  /**
   * Full bidirectional sync
   */
  async syncAll() {
    await this.storage.set('syncState', {
      ...await this.storage.get('syncState'),
      inProgress: true
    });

    try {
      // First, pull updates from Jira
      const fromJira = await this.syncFromJira();
      this.log.info(`Found ${fromJira.updates?.length || 0} updates from Jira`);

      // Updates would be applied via hooks or returned for UI to handle

      await this.storage.set('syncState', {
        lastFullSync: Date.now(),
        inProgress: false,
        lastError: null
      });

      return { success: true, fromJira };
    } catch (error) {
      await this.storage.set('syncState', {
        ...await this.storage.get('syncState'),
        inProgress: false,
        lastError: error.message
      });

      throw error;
    }
  }

  /**
   * Map Jira status ID to Dexteria column
   */
  jiraStatusToColumn(statusId, statusMapping = []) {
    const mapping = statusMapping.find(m => m.jiraStatusId === statusId);
    return mapping?.dexteriaColumn || 'backlog';
  }
}
```

#### 3.2 JiraClient Additions (Transitions)

```javascript
// Add to lib/JiraClient.js

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
 * https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
 */
async transitionIssue(issueKey, transitionId) {
  await this.request(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: 'POST',
    body: JSON.stringify({
      transition: { id: transitionId }
    })
  });
  this.log.info(`Transitioned ${issueKey} with transition ${transitionId}`);
}

/**
 * Update issue fields
 */
async updateIssue(issueKey, fields) {
  await this.request(`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    body: JSON.stringify({ fields })
  });
  this.log.info(`Updated ${issueKey}`);
}
```

#### 3.3 Hook Integration

```javascript
// Add to main.js activate()

// Hook: Sync status when task is moved
hooks.on('task:afterMove', async (ctx) => {
  const { task, taskId, fromColumn, toColumn } = ctx;
  const config = await storage.get('config');

  if (config?.autoSync) {
    try {
      const result = await syncEngine.syncTaskToJira(taskId, {
        ...task,
        status: toColumn
      });

      if (result.synced) {
        log.info(`Auto-synced task move to Jira`);
      }
    } catch (error) {
      log.error(`Failed to sync task move: ${error.message}`);
    }
  }
});

// Hook: Check for conflicts before agent run
hooks.on('agent:beforeRun', async (ctx) => {
  const { taskId, task } = ctx;
  const mapping = await getTaskMapping(taskId);

  if (mapping) {
    // Fetch latest from Jira
    const jiraIssue = await jiraClient.getIssue(mapping.jiraKey);

    // Check if Jira status differs
    const config = await storage.get('config');
    const expectedColumn = syncEngine.jiraStatusToColumn(
      jiraIssue.status.id,
      config.statusMapping
    );

    if (expectedColumn !== task.status) {
      log.warn(`Jira status differs: expected ${expectedColumn}, got ${task.status}`);
      // Could return { cancel: true } or update task
    }
  }

  return { cancel: false };
});
```

### Phase 3 Tasks

| Task | Description | Priority |
|------|-------------|----------|
| 3.1 | Implement SyncEngine | High |
| 3.2 | Add transition fetching to JiraClient | High |
| 3.3 | Implement issue transition | High |
| 3.4 | Integrate task:afterMove hook | High |
| 3.5 | Add automatic sync timer | Medium |
| 3.6 | Implement conflict detection | Medium |
| 3.7 | Add sync status indicator in UI | Medium |
| 3.8 | Create manual sync trigger | Medium |
| 3.9 | Add selective sync (per task) | Low |
| 3.10 | Implement sync error recovery | Low |

---

## Phase 4: Advanced Features

### Objectives

- Add webhook support for real-time updates
- Implement bulk operations
- Add sync history and audit log
- Create detailed reporting

### Deliverables

#### 4.1 Webhook Handler (Optional)

```javascript
// lib/WebhookHandler.js

/**
 * Note: Jira Cloud webhooks require a public endpoint.
 * This implementation uses polling as the primary method,
 * but can be extended with webhooks if the user has a tunnel or server.
 */

export class WebhookHandler {
  constructor(storage, log) {
    this.storage = storage;
    this.log = log;
  }

  /**
   * Process incoming webhook payload
   * https://developer.atlassian.com/cloud/jira/platform/webhooks/
   */
  async handleWebhook(payload) {
    const { webhookEvent, issue, changelog } = payload;

    this.log.info(`Webhook received: ${webhookEvent} for ${issue?.key}`);

    switch (webhookEvent) {
      case 'jira:issue_updated':
        await this.handleIssueUpdated(issue, changelog);
        break;

      case 'jira:issue_deleted':
        await this.handleIssueDeleted(issue);
        break;

      default:
        this.log.debug(`Ignoring webhook event: ${webhookEvent}`);
    }
  }

  async handleIssueUpdated(issue, changelog) {
    // Find status changes in changelog
    const statusChange = changelog?.items?.find(
      item => item.field === 'status'
    );

    if (statusChange) {
      this.log.info(
        `Issue ${issue.key} status changed: ${statusChange.fromString} → ${statusChange.toString}`
      );

      // Find corresponding Dexteria task and update
      const mappings = await this.storage.get('mappings') || {};
      const [taskId] = Object.entries(mappings).find(
        ([_, m]) => m.jiraKey === issue.key
      ) || [];

      if (taskId) {
        // Emit event for Dexteria to handle
        // This would need to integrate with the main process
        return {
          action: 'update-task',
          taskId,
          changes: {
            status: statusChange.toString
          }
        };
      }
    }
  }

  async handleIssueDeleted(issue) {
    // Find and unlink the corresponding task
    const mappings = await this.storage.get('mappings') || {};
    const [taskId] = Object.entries(mappings).find(
      ([_, m]) => m.jiraKey === issue.key
    ) || [];

    if (taskId) {
      delete mappings[taskId];
      await this.storage.set('mappings', mappings);
      this.log.info(`Unlinked deleted issue ${issue.key} from task ${taskId}`);
    }
  }
}
```

#### 4.2 Sync History

```javascript
// lib/SyncHistory.js

export class SyncHistory {
  constructor(storage) {
    this.storage = storage;
    this.maxEntries = 100;
  }

  async addEntry(entry) {
    const history = await this.storage.get('syncHistory') || [];

    history.unshift({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry
    });

    // Keep only last N entries
    if (history.length > this.maxEntries) {
      history.splice(this.maxEntries);
    }

    await this.storage.set('syncHistory', history);
  }

  async getHistory(limit = 20) {
    const history = await this.storage.get('syncHistory') || [];
    return history.slice(0, limit);
  }

  async clearHistory() {
    await this.storage.delete('syncHistory');
  }
}

// Usage in SyncEngine:
// await this.history.addEntry({
//   type: 'sync-to-jira',
//   taskId,
//   jiraKey: mapping.jiraKey,
//   status: 'success',
//   details: { oldStatus, newStatus }
// });
```

#### 4.3 Bulk Operations

```javascript
// Add to SyncEngine

/**
 * Bulk import with progress tracking
 */
async bulkImport(options, onProgress) {
  const issues = await this.jiraClient.getProjectIssues(
    options.projectKey,
    options.jqlFilter
  );

  const total = issues.length;
  let completed = 0;
  const results = { success: 0, failed: 0, skipped: 0 };

  for (const issue of issues) {
    try {
      // Check if already imported
      const mappings = await this.storage.get('mappings') || {};
      const existing = Object.values(mappings).find(
        m => m.jiraKey === issue.key
      );

      if (existing && !options.overwrite) {
        results.skipped++;
      } else {
        // Import logic here
        results.success++;
      }
    } catch (error) {
      results.failed++;
      this.log.error(`Failed to import ${issue.key}: ${error.message}`);
    }

    completed++;
    onProgress?.({
      current: completed,
      total,
      currentIssue: issue.key,
      results
    });
  }

  return results;
}

/**
 * Bulk sync all mapped tasks
 */
async bulkSync(onProgress) {
  const mappings = await this.storage.get('mappings') || {};
  const entries = Object.entries(mappings);
  const total = entries.length;
  let completed = 0;
  const results = { success: 0, failed: 0 };

  for (const [taskId, mapping] of entries) {
    try {
      // Fetch task from Dexteria
      // const task = await getTask(taskId);
      // await this.syncTaskToJira(taskId, task);
      results.success++;
    } catch (error) {
      results.failed++;
    }

    completed++;
    onProgress?.({
      current: completed,
      total,
      currentTask: taskId,
      results
    });
  }

  return results;
}
```

#### 4.4 Final API (Complete)

```javascript
// Complete main.js API

export const api = {
  // === Connection ===
  isConnected: () => authManager?.isConnected() ?? false,
  getAuthUrl: () => authManager?.getAuthorizationUrl(),
  handleCallback: (code) => authManager?.exchangeCodeForTokens(code),
  disconnect: () => authManager?.disconnect(),
  getConnectionStatus: async () => {
    const connected = await authManager?.isConnected();
    if (!connected) return { connected: false };
    const connection = await storage.get('connection');
    return {
      connected: true,
      siteUrl: connection?.siteUrl,
      cloudId: connection?.cloudId
    };
  },

  // === Projects & Configuration ===
  getProjects: () => jiraClient?.getProjects(),
  getProjectStatuses: (key) => jiraClient?.getProjectStatuses(key),
  getConfig: () => storage.get('config'),
  setConfig: async (config) => {
    await storage.set('config', config);
    // Restart auto-sync if needed
    syncEngine?.stopAutoSync();
    if (config.autoSync) {
      await syncEngine?.startAutoSync();
    }
    return true;
  },

  // === Status Mapping ===
  getSuggestedMapping: (key) => importEngine?.getSuggestedStatusMapping(key),

  // === Import ===
  previewImport: (opts) => importEngine?.importIssues({ ...opts, preview: true }),
  executeImport: async (opts) => {
    const result = await importEngine?.importIssues(opts);
    // Create tasks and mappings
    return result;
  },

  // === Mappings ===
  getMappings: () => storage.get('mappings') || {},
  getTaskMapping: async (taskId) => {
    const mappings = await storage.get('mappings') || {};
    return mappings[taskId] || null;
  },
  linkTask: async (taskId, jiraKey) => {
    const issue = await jiraClient?.getIssue(jiraKey);
    await importEngine?.saveMapping(taskId, issue);
    return issue;
  },
  unlinkTask: async (taskId) => {
    const mappings = await storage.get('mappings') || {};
    delete mappings[taskId];
    await storage.set('mappings', mappings);
    return true;
  },

  // === Sync ===
  syncTask: (taskId, task) => syncEngine?.syncTaskToJira(taskId, task),
  syncFromJira: () => syncEngine?.syncFromJira(),
  syncAll: () => syncEngine?.syncAll(),
  getSyncState: () => storage.get('syncState'),
  startAutoSync: () => syncEngine?.startAutoSync(),
  stopAutoSync: () => syncEngine?.stopAutoSync(),

  // === History ===
  getSyncHistory: (limit) => syncHistory?.getHistory(limit),
  clearSyncHistory: () => syncHistory?.clearHistory(),

  // === Bulk Operations ===
  bulkImport: (opts, onProgress) => syncEngine?.bulkImport(opts, onProgress),
  bulkSync: (onProgress) => syncEngine?.bulkSync(onProgress),

  // === Utilities ===
  testConnection: async () => {
    try {
      const projects = await jiraClient?.getProjects();
      return { success: true, projectCount: projects?.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  searchIssues: (jql) => jiraClient?.searchIssues(jql),
  getIssue: (key) => jiraClient?.getIssue(key)
};
```

### Phase 4 Tasks

| Task | Description | Priority |
|------|-------------|----------|
| 4.1 | Implement sync history logging | Medium |
| 4.2 | Add bulk import with progress | Medium |
| 4.3 | Add bulk sync with progress | Medium |
| 4.4 | Create webhook handler (optional) | Low |
| 4.5 | Build sync history UI | Low |
| 4.6 | Add export/backup of mappings | Low |
| 4.7 | Implement JQL builder UI | Low |
| 4.8 | Add issue preview before import | Low |
| 4.9 | Create sync conflict resolution UI | Low |
| 4.10 | Add notifications for sync events | Low |

---

## API Reference

### Jira REST API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/rest/api/3/project/search` | GET | List projects |
| `/rest/api/3/project/{key}/statuses` | GET | Get project statuses |
| `/rest/api/3/search` | POST | Search with JQL |
| `/rest/api/3/issue/{key}` | GET | Get issue details |
| `/rest/api/3/issue/{key}` | PUT | Update issue |
| `/rest/api/3/issue/{key}/transitions` | GET | Get transitions |
| `/rest/api/3/issue/{key}/transitions` | POST | Transition issue |

### OAuth Endpoints

| Endpoint | Purpose |
|----------|---------|
| `https://auth.atlassian.com/authorize` | Start OAuth flow |
| `https://auth.atlassian.com/oauth/token` | Exchange/refresh tokens |
| `https://api.atlassian.com/oauth/token/accessible-resources` | Get cloud sites |

### Plugin Storage Schema

```typescript
interface JiraPluginStorage {
  connection: {
    cloudId: string;
    siteUrl: string;
    accessToken: string;      // Encrypted
    refreshToken: string;     // Encrypted
    tokenExpiry: number;
  } | null;

  config: {
    projectKey: string;
    jqlFilter: string;
    autoSync: boolean;
    syncInterval: number;
    statusMapping: StatusMapping[];
  };

  mappings: {
    [taskId: string]: {
      jiraKey: string;
      jiraId: string;
      lastSynced: number;
      syncDirection: string;
    };
  };

  syncState: {
    lastFullSync: number;
    inProgress: boolean;
    lastError: string | null;
  };

  syncHistory: SyncHistoryEntry[];
}
```

---

## Security Considerations

### Token Storage

- Access and refresh tokens are encrypted before storage
- Tokens are stored in plugin-scoped storage (`.local-kanban/plugins/data/`)
- Consider using OS keychain (via `keytar`) for production

### API Key Protection

- Never commit OAuth client secrets
- Use environment variables or secure configuration
- Implement token rotation

### Rate Limiting

- Jira Cloud has rate limits (varies by endpoint)
- Implement exponential backoff for failed requests
- Cache responses where appropriate

### Data Privacy

- Only sync necessary fields
- Allow users to exclude sensitive issues (via JQL)
- Clear sync history on disconnect

---

## Timeline Summary

| Phase | Focus | Estimated Effort |
|-------|-------|------------------|
| Phase 1 | Authentication & Foundation | Foundation |
| Phase 2 | Import & Read Operations | Core Features |
| Phase 3 | Bidirectional Sync | Integration |
| Phase 4 | Advanced Features | Polish |

---

## References

- [Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [OAuth 2.0 (3LO) Scopes](https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/)
- [Jira Webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/)
- [JQL Reference](https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/)
- [Dexteria Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)
