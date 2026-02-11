import React, { useState, useMemo } from 'react';
import { TabGroup } from 'adnia-ui';
import { Terminal, Play, Hammer, Puzzle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { TaskRunner } from './Runner';
import { ProcessOutput } from './ProcessOutput';
import { useSlotContributions } from '../contexts/ExtensionPointsContext';
import { PluginComponentLoader } from '../plugins/PluginComponentLoader';

import { useTranslation } from '../i18n/useTranslation';
// Built-in tabs
type BuiltInTabId = 'runner' | 'run' | 'build';
// All tabs including plugin tabs
type TabId = BuiltInTabId | `plugin:${string}`;

// Helper to get Lucide icon by name
const getLucideIcon = (iconName: string, size: number = 14): React.ReactNode => {
    const Icon = (LucideIcons as Record<string, React.FC<{ size?: number }>>)[iconName];
    if (Icon) {
        return <Icon size={size} />;
    }
    return <Puzzle size={size} />;
};

export const BottomPanel: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabId>('runner');

    // Get plugin contributions for bottom panel tabs
    const pluginContributions = useSlotContributions('bottom-panel:tab');

    // Build tabs array with built-in and plugin tabs
    const tabs = useMemo(() => {
        const builtInTabs = [
            { id: 'runner', label: t('views.bottomPanel.taskRunner'), icon: <Terminal size={14} /> },
            { id: 'run', label: t('views.bottomPanel.runOutput'), icon: <Play size={14} /> },
            { id: 'build', label: t('views.bottomPanel.buildOutput'), icon: <Hammer size={14} /> },
        ];

        const pluginTabs = pluginContributions.map((contribution) => ({
            id: `plugin:${contribution.pluginId}`,
            label: contribution.pluginId.split('.').pop() || 'Plugin',
            icon: getLucideIcon('Puzzle', 14),
        }));

        return [...builtInTabs, ...pluginTabs];
    }, [pluginContributions, t]);

    // Find the active plugin contribution if a plugin tab is selected
    const activePluginContribution = useMemo(() => {
        if (!activeTab.startsWith('plugin:')) return null;
        const pluginId = activeTab.replace('plugin:', '');
        return pluginContributions.find((c) => c.pluginId === pluginId) || null;
    }, [activeTab, pluginContributions]);

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <TabGroup
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as TabId)}
                className="flex-shrink-0"
            />

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'runner' && <TaskRunner />}
                {activeTab === 'run' && <ProcessOutput type="run" title={t('views.bottomPanel.runOutput')} />}
                {activeTab === 'build' && <ProcessOutput type="build" title={t('views.bottomPanel.buildOutput')} />}

                {/* Plugin tab content */}
                {activePluginContribution && (
                    <div className="h-full w-full">
                        <PluginComponentLoader
                            pluginId={activePluginContribution.pluginId}
                            pluginPath={activePluginContribution.pluginPath}
                            slotId="bottom-panel:tab"
                            context={{}}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
