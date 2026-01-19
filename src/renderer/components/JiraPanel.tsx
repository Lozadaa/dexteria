/**
 * JiraPanel
 *
 * Settings panel for Jira integration plugin configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Switch,
  Spinner,
  AlertBanner,
} from 'adnia-ui';
import { cn } from '../lib/utils';
import {
  Link2,
  Unlink,
  RefreshCw,
  Download,
  Settings2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowRightLeft,
  Clock,
  Trash2,
  Eye,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';

const PLUGIN_ID = 'com.dexteria.jira';

interface JiraConfig {
  projectKey: string | null;
  jqlFilter: string;
  syncEnabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  statusMapping: Array<{
    jiraStatusId: string;
    jiraStatusName: string;
    jiraCategory: string;
    dexteriaColumn: string;
  }>;
}

interface JiraConnection {
  cloudId: string;
  siteUrl: string;
  siteName: string;
  connectedAt: string;
  tokenExpiry: number;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl?: string;
}

interface ImportPreview {
  total: number;
  new: Array<{ key: string; summary: string; status: { name: string } }>;
  existing: Array<{ key: string; summary: string }>;
  toImport: Array<{ key: string; summary: string }>;
}

interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  type: string;
  taskId?: string;
  jiraKey?: string;
  success: boolean;
  error?: string;
  from?: string;
  to?: string;
}

type JiraTab = 'connection' | 'project' | 'import' | 'sync' | 'history';

export const JiraPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<JiraTab>('connection');
  const [loading, setLoading] = useState(true);
  const [pluginActive, setPluginActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<JiraConnection | null>(null);
  const [oauthSettings, setOauthSettings] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:19846/callback',
    hasSecret: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Project state
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [config, setConfig] = useState<JiraConfig>({
    projectKey: null,
    jqlFilter: '',
    syncEnabled: false,
    autoSync: false,
    syncInterval: 5,
    statusMapping: [],
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Import state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; total: number } | null>(null);

  // Sync history
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Call plugin API
  const callApi = useCallback(async (method: string, ...args: unknown[]) => {
    return window.dexteria?.plugin?.callApi?.(PLUGIN_ID, method, ...args);
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if plugin is active
      const plugin = await window.dexteria?.plugin?.get?.(PLUGIN_ID);
      if (!plugin || plugin.state !== 'active') {
        setPluginActive(false);
        setLoading(false);
        return;
      }
      setPluginActive(true);

      // Load connection status
      const connected = await callApi('auth.isConnected');
      setIsConnected(!!connected);

      if (connected) {
        const connInfo = await callApi('auth.getConnectionInfo');
        setConnection(connInfo as JiraConnection);
      }

      // Load OAuth settings
      const settings = await callApi('auth.getSettings');
      if (settings) {
        setOauthSettings(settings as typeof oauthSettings);
      }

      // Load config
      const cfg = await callApi('config.get');
      if (cfg) {
        setConfig(cfg as JiraConfig);
      }
    } catch (err) {
      console.error('Failed to load Jira data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Jira data');
    }

    setLoading(false);
  };

  const handleSaveOAuthSettings = async () => {
    setSavingSettings(true);
    try {
      await callApi('auth.saveSettings', {
        clientId: oauthSettings.clientId,
        clientSecret: oauthSettings.clientSecret,
        redirectUri: oauthSettings.redirectUri,
      });
      // Reload settings to get masked secret
      const settings = await callApi('auth.getSettings');
      if (settings) {
        setOauthSettings(settings as typeof oauthSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
    setSavingSettings(false);
  };

  const handleConnect = async () => {
    try {
      const authUrl = await callApi('auth.getAuthUrl');
      if (authUrl) {
        // Open the auth URL in the default browser
        window.open(authUrl as string, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
    }
  };

  const handleDisconnect = async () => {
    try {
      await callApi('auth.disconnect');
      setIsConnected(false);
      setConnection(null);
      setProjects([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleLoadProjects = async () => {
    setLoadingProjects(true);
    try {
      const projectList = await callApi('projects.list');
      setProjects((projectList as JiraProject[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
    setLoadingProjects(false);
  };

  const handleSelectProject = async (projectKey: string) => {
    setConfig({ ...config, projectKey });

    // Get suggested status mapping
    try {
      const mapping = await callApi('projects.getSuggestedMapping', projectKey);
      if (mapping) {
        setConfig((prev) => ({
          ...prev,
          projectKey,
          statusMapping: mapping as JiraConfig['statusMapping'],
        }));
      }
    } catch (err) {
      console.error('Failed to get status mapping:', err);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await callApi('config.save', config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
    setSavingConfig(false);
  };

  const handlePreviewImport = async () => {
    setLoadingPreview(true);
    setImportPreview(null);
    setImportResult(null);

    try {
      const preview = await callApi('import.preview', {
        projectKey: config.projectKey,
        jqlFilter: config.jqlFilter,
      });
      setImportPreview(preview as ImportPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview import');
    }

    setLoadingPreview(false);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await callApi('import.import', {
        projectKey: config.projectKey,
        jqlFilter: config.jqlFilter,
      });
      const res = result as { created: number; total: number };
      setImportResult(res);
      setImportPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import issues');
    }
    setImporting(false);
  };

  const handleLoadHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await callApi('sync.getHistory', 50);
      setSyncHistory((history as SyncHistoryEntry[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync history');
    }
    setLoadingHistory(false);
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all sync history?')) return;
    try {
      await callApi('sync.clearHistory');
      setSyncHistory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history');
    }
  };

  const tabs: { id: JiraTab; label: string; icon: React.ReactNode }[] = [
    { id: 'connection', label: 'Connection', icon: <Link2 size={14} /> },
    { id: 'project', label: 'Project', icon: <FolderOpen size={14} /> },
    { id: 'import', label: 'Import', icon: <Download size={14} /> },
    { id: 'sync', label: 'Sync', icon: <ArrowRightLeft size={14} /> },
    { id: 'history', label: 'History', icon: <Clock size={14} /> },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" label="Loading Jira settings..." />
      </div>
    );
  }

  if (!pluginActive) {
    return (
      <div className="p-6">
        <AlertBanner
          variant="warning"
          icon={<AlertTriangle size={16} />}
          description="The Jira plugin is not active. Enable it in the Plugins tab to use Jira integration."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <img
            src="https://cdn.simpleicons.org/jira/0052CC"
            alt="Jira"
            className="w-5 h-5"
          />
          <h3 className="font-semibold">Jira Integration</h3>
          {isConnected && (
            <span className="text-xs text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 size={10} />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-background px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'project' && isConnected && projects.length === 0) {
                handleLoadProjects();
              }
              if (tab.id === 'history') {
                handleLoadHistory();
              }
            }}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors relative flex items-center gap-1.5",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <AlertBanner
            variant="error"
            icon={<XCircle size={14} />}
            description={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <div className="space-y-6 max-w-xl">
            {isConnected && connection ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="font-medium text-green-500">Connected to Jira</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Site:</span> {connection.siteName}</p>
                    <p><span className="text-muted-foreground">URL:</span> {connection.siteUrl}</p>
                    <p><span className="text-muted-foreground">Connected:</span> {new Date(connection.connectedAt).toLocaleDateString()}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(connection.siteUrl, '_blank')}
                    className="mt-3"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Open Jira
                  </Button>
                </div>
                <Button
                  variant="danger-soft"
                  onClick={handleDisconnect}
                  className="w-full"
                >
                  <Unlink size={14} className="mr-1" />
                  Disconnect from Jira
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Settings2 size={14} />
                    OAuth 2.0 Configuration
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create an OAuth 2.0 app in the{' '}
                    <a
                      href="https://developer.atlassian.com/console/myapps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Atlassian Developer Console
                    </a>
                    {' '}to get your credentials.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">Client ID</label>
                      <Input
                        value={oauthSettings.clientId}
                        onChange={(e) => setOauthSettings({ ...oauthSettings, clientId: e.target.value })}
                        placeholder="Enter your OAuth Client ID"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Client Secret</label>
                      <Input
                        type="password"
                        value={oauthSettings.clientSecret}
                        onChange={(e) => setOauthSettings({ ...oauthSettings, clientSecret: e.target.value })}
                        placeholder={oauthSettings.hasSecret ? '••••••••' : 'Enter your OAuth Client Secret'}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Redirect URI</label>
                      <Input
                        value={oauthSettings.redirectUri}
                        onChange={(e) => setOauthSettings({ ...oauthSettings, redirectUri: e.target.value })}
                        placeholder="http://localhost:19846/callback"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Add this URI to your Atlassian app&apos;s callback URLs
                      </p>
                    </div>
                    <Button
                      onClick={handleSaveOAuthSettings}
                      disabled={savingSettings || !oauthSettings.clientId}
                    >
                      {savingSettings ? <Spinner size="xs" className="mr-1" /> : null}
                      Save Settings
                    </Button>
                  </div>
                </div>

                {oauthSettings.clientId && oauthSettings.hasSecret && (
                  <Button
                    variant="status-info"
                    onClick={handleConnect}
                    className="w-full"
                  >
                    <Link2 size={14} className="mr-1" />
                    Connect to Jira
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Project Tab */}
        {activeTab === 'project' && (
          <div className="space-y-6 max-w-xl">
            {!isConnected ? (
              <AlertBanner
                variant="info"
                description="Connect to Jira first to select a project."
              />
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Select Project</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadProjects}
                      disabled={loadingProjects}
                    >
                      <RefreshCw size={14} className={cn(loadingProjects && "animate-spin")} />
                    </Button>
                  </div>
                  {loadingProjects ? (
                    <Spinner size="sm" label="Loading projects..." />
                  ) : projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No projects found</p>
                  ) : (
                    <div className="space-y-2">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleSelectProject(project.key)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                            config.projectKey === project.key
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          {project.avatarUrl && (
                            <img src={project.avatarUrl} alt="" className="w-8 h-8 rounded" />
                          )}
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">{project.key}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {config.projectKey && (
                  <>
                    <div className="space-y-3">
                      <h4 className="font-medium">JQL Filter (Optional)</h4>
                      <Input
                        value={config.jqlFilter}
                        onChange={(e) => setConfig({ ...config, jqlFilter: e.target.value })}
                        placeholder='e.g., status != "Done" AND assignee = currentUser()'
                      />
                      <p className="text-xs text-muted-foreground">
                        Additional JQL to filter which issues to import
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Sync Options</h4>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">Enable Sync</div>
                          <div className="text-xs text-muted-foreground">
                            Sync task status changes to Jira
                          </div>
                        </div>
                        <Switch
                          checked={config.syncEnabled}
                          onCheckedChange={(checked) => setConfig({ ...config, syncEnabled: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">Auto-Sync from Jira</div>
                          <div className="text-xs text-muted-foreground">
                            Check for updates every {config.syncInterval} minutes
                          </div>
                        </div>
                        <Switch
                          checked={config.autoSync}
                          onCheckedChange={(checked) => setConfig({ ...config, autoSync: checked })}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveConfig}
                      disabled={savingConfig}
                      className="w-full"
                    >
                      {savingConfig ? <Spinner size="xs" className="mr-1" /> : null}
                      Save Configuration
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6 max-w-xl">
            {!isConnected ? (
              <AlertBanner
                variant="info"
                description="Connect to Jira first to import issues."
              />
            ) : !config.projectKey ? (
              <AlertBanner
                variant="info"
                description="Select a Jira project first to import issues."
              />
            ) : (
              <>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-medium mb-2">Import from {config.projectKey}</h4>
                  {config.jqlFilter && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Filter: <code className="bg-muted px-1 rounded">{config.jqlFilter}</code>
                    </p>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handlePreviewImport}
                    disabled={loadingPreview}
                  >
                    {loadingPreview ? <Spinner size="xs" className="mr-1" /> : <Eye size={14} className="mr-1" />}
                    Preview Import
                  </Button>
                </div>

                {importPreview && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-500">{importPreview.total}</div>
                        <div className="text-xs text-muted-foreground">Total Issues</div>
                      </div>
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-500">{importPreview.new.length}</div>
                        <div className="text-xs text-muted-foreground">New</div>
                      </div>
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-500">{importPreview.existing.length}</div>
                        <div className="text-xs text-muted-foreground">Already Imported</div>
                      </div>
                    </div>

                    {importPreview.new.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-muted/50 text-sm font-medium">
                          Issues to Import ({importPreview.new.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {importPreview.new.slice(0, 20).map((issue) => (
                            <div
                              key={issue.key}
                              className="px-3 py-2 border-t border-border text-sm flex items-center gap-2"
                            >
                              <span className="font-mono text-primary">{issue.key}</span>
                              <span className="truncate text-muted-foreground">{issue.summary}</span>
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded ml-auto shrink-0">
                                {issue.status.name}
                              </span>
                            </div>
                          ))}
                          {importPreview.new.length > 20 && (
                            <div className="px-3 py-2 border-t border-border text-sm text-muted-foreground text-center">
                              ...and {importPreview.new.length - 20} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="status-success"
                      onClick={handleImport}
                      disabled={importing || importPreview.new.length === 0}
                      className="w-full"
                    >
                      {importing ? <Spinner size="xs" className="mr-1" /> : <Download size={14} className="mr-1" />}
                      Import {importPreview.new.length} Issues
                    </Button>
                  </div>
                )}

                {importResult && (
                  <AlertBanner
                    variant="success"
                    icon={<CheckCircle2 size={14} />}
                    description={`Successfully imported ${importResult.created} of ${importResult.total} issues as tasks.`}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-6 max-w-xl">
            {!isConnected ? (
              <AlertBanner
                variant="info"
                description="Connect to Jira first to configure sync."
              />
            ) : (
              <>
                <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
                  <h4 className="font-medium">Status Mapping</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure how Jira statuses map to Dexteria columns.
                  </p>
                  {config.statusMapping.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Select a project first to configure status mapping.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {config.statusMapping.map((mapping, index) => (
                        <div
                          key={mapping.jiraStatusId}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="flex-1 truncate">{mapping.jiraStatusName}</span>
                          <span className="text-muted-foreground">→</span>
                          <select
                            value={mapping.dexteriaColumn}
                            onChange={(e) => {
                              const newMapping = [...config.statusMapping];
                              newMapping[index] = { ...mapping, dexteriaColumn: e.target.value };
                              setConfig({ ...config, statusMapping: newMapping });
                            }}
                            className="bg-muted border border-border rounded px-2 py-1 text-sm"
                          >
                            <option value="backlog">Backlog</option>
                            <option value="todo">To Do</option>
                            <option value="doing">Doing</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                >
                  {savingConfig ? <Spinner size="xs" className="mr-1" /> : null}
                  Save Mapping
                </Button>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sync History</h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadHistory}
                  disabled={loadingHistory}
                >
                  <RefreshCw size={14} className={cn(loadingHistory && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  disabled={syncHistory.length === 0}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            {loadingHistory ? (
              <Spinner size="sm" label="Loading history..." />
            ) : syncHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sync history yet.</p>
            ) : (
              <div className="space-y-2">
                {syncHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      entry.success
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {entry.success ? (
                        <CheckCircle2 size={14} className="text-green-500" />
                      ) : (
                        <XCircle size={14} className="text-red-500" />
                      )}
                      <span className="font-mono text-primary">{entry.jiraKey}</span>
                      <span className="text-muted-foreground">
                        {entry.type === 'sync-to-jira' ? '→ Jira' : '← Jira'}
                      </span>
                      {entry.from && entry.to && (
                        <span className="text-xs text-muted-foreground">
                          {entry.from} → {entry.to}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.error && (
                      <p className="text-red-400 mt-1 text-xs">{entry.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
