import React, { useState } from 'react';
import { TabGroup } from 'adnia-ui';
import { Terminal, Play, Hammer } from 'lucide-react';
import { TaskRunner } from './Runner';
import { ProcessOutput } from './ProcessOutput';

type TabId = 'runner' | 'run' | 'build';

export const BottomPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('runner');

    const tabs = [
        { id: 'runner', label: 'Task Runner', icon: <Terminal size={14} /> },
        { id: 'run', label: 'Run Output', icon: <Play size={14} /> },
        { id: 'build', label: 'Build Output', icon: <Hammer size={14} /> },
    ];

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
                {activeTab === 'run' && <ProcessOutput type="run" title="Run Output" />}
                {activeTab === 'build' && <ProcessOutput type="build" title="Build Output" />}
            </div>
        </div>
    );
};
