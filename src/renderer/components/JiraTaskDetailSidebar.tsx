/**
 * Jira Task Detail Sidebar
 *
 * Shows Jira issue details in the task detail sidebar.
 * Displayed in the task-detail:sidebar extension slot.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Spinner } from 'adnia-ui';
import {
  ExternalLink,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';

const PLUGIN_ID = 'com.dexteria.jira';

interface JiraTaskDetailSidebarProps {
  pluginId: string;
  slotId: string;
  context?: {
    taskId?: string;
    task?: {
      id: string;
      title: string;
      status: string;
    };
  };
}

interface JiraMapping {
  jiraKey: string;
  jiraId: string;
  jiraSummary: string;
  jiraUrl?: string;
  lastSynced?: string;
  status?: {
    name: string;
    category: string;
  };
}

interface JiraConnection {
  siteUrl: string;
  siteName: string;
}

export const JiraTaskDetailSidebar: React.FC<JiraTaskDetailSidebarProps> = ({
  context = {},
}) => {
  const { taskId, task } = context;
  const [mapping, setMapping] = useState<JiraMapping | null>(null);
  const [connection, setConnection] = useState<JiraConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pluginActive, setPluginActive] = useState(false);

  const callApi = useCallback(async (method: string, ...args: unknown[]) => {
    return window.dexteria?.plugin?.callApi?.(PLUGIN_ID, method, ...args);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!taskId) {
        setLoading(false);
        return;
      }

      try {
        // Check if plugin is active
        const plugin = await window.dexteria?.plugin?.get?.(PLUGIN_ID);
        if (!plugin || plugin.state !== 'active') {
          setPluginActive(false);
          setLoading(false);
          return;
        }
        setPluginActive(true);

        // Check if connected
        const connected = await callApi('auth.isConnected');
        if (connected) {
          const connInfo = await callApi('auth.getConnectionInfo');
          setConnection(connInfo as JiraConnection | null);
        }

        // Load mapping for this task
        const result = await callApi('mappings.get', taskId);
        setMapping(result as JiraMapping | null);
      } catch (err) {
        console.error('Failed to load Jira data:', err);
      }
      setLoading(false);
    };

    loadData();
  }, [taskId, callApi]);

  const handleOpenInJira = useCallback(() => {
    if (mapping && connection?.siteUrl) {
      const url = `${connection.siteUrl}/browse/${mapping.jiraKey}`;
      window.open(url, '_blank');
    }
  }, [mapping, connection]);

  const handleUnlink = useCallback(async () => {
    if (!taskId) return;
    try {
      await callApi('mappings.remove', taskId);
      setMapping(null);
    } catch (err) {
      console.error('Failed to unlink from Jira:', err);
    }
  }, [taskId, callApi]);

  const handleSync = useCallback(async () => {
    if (!taskId || !task) return;
    setSyncing(true);
    try {
      await callApi('sync.syncToJira', taskId, task);
      // Reload mapping to get updated data
      const result = await callApi('mappings.get', taskId);
      setMapping(result as JiraMapping | null);
    } catch (err) {
      console.error('Failed to sync to Jira:', err);
    }
    setSyncing(false);
  }, [taskId, task, callApi]);

  if (loading) {
    return (
      <div className="p-3 bg-muted/10 rounded-lg border border-border">
        <div className="flex items-center justify-center h-12">
          <Spinner size="sm" />
        </div>
      </div>
    );
  }

  // Don't show if plugin is not active
  if (!pluginActive) {
    return null;
  }

  // Show link prompt if not linked
  if (!mapping) {
    return (
      <div className="p-3 bg-muted/10 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-2">
          <img
            src="https://cdn.simpleicons.org/jira/0052CC"
            alt="Jira"
            className="w-4 h-4"
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Jira
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          This task is not linked to a Jira issue.
        </p>
        <Button
          variant="ghost"
          size="xs"
          className="w-full text-xs"
          disabled={!connection}
          title={!connection ? 'Connect to Jira first' : 'Link to Jira issue'}
        >
          <Link2 size={12} className="mr-1" />
          Link to Jira
        </Button>
      </div>
    );
  }

  // Show Jira info
  return (
    <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src="https://cdn.simpleicons.org/jira/0052CC"
            alt="Jira"
            className="w-4 h-4"
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Jira
          </span>
        </div>
        <span className="text-xs text-green-500 flex items-center gap-1">
          <CheckCircle2 size={10} />
          Linked
        </span>
      </div>

      <div className="space-y-2">
        {/* Issue key and summary */}
        <div>
          <button
            onClick={handleOpenInJira}
            className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
          >
            {mapping.jiraKey}
            <ExternalLink size={12} />
          </button>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {mapping.jiraSummary}
          </p>
        </div>

        {/* Status */}
        {mapping.status && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                mapping.status.category === 'done' && 'bg-green-500/20 text-green-400',
                mapping.status.category === 'indeterminate' && 'bg-blue-500/20 text-blue-400',
                mapping.status.category === 'new' && 'bg-gray-500/20 text-gray-400'
              )}
            >
              {mapping.status.name}
            </span>
          </div>
        )}

        {/* Last synced */}
        {mapping.lastSynced && (
          <div className="text-xs text-muted-foreground">
            Last synced: {new Date(mapping.lastSynced).toLocaleString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 text-xs"
          >
            <RefreshCw size={12} className={cn('mr-1', syncing && 'animate-spin')} />
            Sync
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleUnlink}
            className="flex-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Unlink size={12} className="mr-1" />
            Unlink
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JiraTaskDetailSidebar;
