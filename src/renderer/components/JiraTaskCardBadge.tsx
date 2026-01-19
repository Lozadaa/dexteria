/**
 * Jira Task Card Badge
 *
 * Shows a badge on task cards that are linked to Jira issues.
 * Displayed in the task-card:badge extension slot.
 */

import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

const PLUGIN_ID = 'com.dexteria.jira';

interface JiraTaskCardBadgeProps {
  pluginId: string;
  slotId: string;
  context?: {
    taskId?: string;
    task?: unknown;
  };
}

interface JiraMapping {
  jiraKey: string;
  jiraId: string;
  jiraSummary: string;
  jiraUrl?: string;
  lastSynced?: string;
}

export const JiraTaskCardBadge: React.FC<JiraTaskCardBadgeProps> = ({
  context = {},
}) => {
  const { taskId } = context;
  const [mapping, setMapping] = useState<JiraMapping | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    const loadMapping = async () => {
      try {
        const result = await window.dexteria?.plugin?.callApi?.(
          PLUGIN_ID,
          'mappings.get',
          taskId
        );
        setMapping(result as JiraMapping | null);
      } catch (err) {
        console.error('Failed to load Jira mapping:', err);
      }
      setLoading(false);
    };

    loadMapping();
  }, [taskId]);

  // Don't show anything while loading or if not linked
  if (loading || !mapping) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded"
      title={`Linked to ${mapping.jiraKey}: ${mapping.jiraSummary}`}
    >
      <ExternalLink size={10} />
      {mapping.jiraKey}
    </span>
  );
};

export default JiraTaskCardBadge;
