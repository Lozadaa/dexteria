import type { Meta, StoryObj } from '@storybook/react';
import { AgentActivityLog, type AgentOperation } from '../components/ui/dev';

const meta: Meta<typeof AgentActivityLog> = {
  title: 'Dev/AgentActivityLog',
  component: AgentActivityLog,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AgentActivityLog>;

// Sample operations
const sampleOperations: AgentOperation[] = [
  {
    id: '1',
    type: 'spawn',
    status: 'completed',
    title: 'Spawning agent: code-explorer',
    timestamp: new Date(Date.now() - 30000),
    duration: 250,
  },
  {
    id: '2',
    type: 'search',
    status: 'completed',
    title: 'Searching for "useAuth" in src/',
    content: 'Found 5 matches:\n- src/hooks/useAuth.ts\n- src/contexts/AuthContext.tsx\n- src/pages/Login.tsx\n- src/pages/Dashboard.tsx\n- src/components/ProtectedRoute.tsx',
    timestamp: new Date(Date.now() - 25000),
    duration: 1200,
  },
  {
    id: '3',
    type: 'read',
    status: 'completed',
    title: 'Reading: src/hooks/useAuth.ts',
    content: `import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}`,
    timestamp: new Date(Date.now() - 20000),
    duration: 150,
  },
  {
    id: '4',
    type: 'grep',
    status: 'completed',
    title: 'Grep: "throw new Error" in src/**/*.ts',
    content: 'src/hooks/useAuth.ts:7\nsrc/utils/api.ts:23\nsrc/utils/api.ts:45',
    timestamp: new Date(Date.now() - 15000),
    duration: 800,
  },
  {
    id: '5',
    type: 'thinking',
    status: 'completed',
    title: 'Analyzing authentication flow...',
    timestamp: new Date(Date.now() - 10000),
    duration: 2500,
  },
  {
    id: '6',
    type: 'write',
    status: 'running',
    title: 'Writing: src/hooks/useAuthSession.ts',
    timestamp: new Date(Date.now() - 5000),
  },
];

const runningOperations: AgentOperation[] = [
  {
    id: '1',
    type: 'spawn',
    status: 'completed',
    title: 'Spawning agent: task-executor',
    duration: 180,
  },
  {
    id: '2',
    type: 'search',
    status: 'completed',
    title: 'Searching project structure',
    duration: 500,
  },
  {
    id: '3',
    type: 'read',
    status: 'running',
    title: 'Reading: package.json',
  },
  {
    id: '4',
    type: 'tool',
    status: 'pending',
    title: 'Analyzing dependencies',
  },
];

export const Default: Story = {
  args: {
    operations: sampleOperations,
    title: 'Agent Activity',
    showCount: true,
  },
};

export const Running: Story = {
  args: {
    operations: runningOperations,
    title: 'Task Execution',
    showCount: true,
  },
};

export const Compact: Story = {
  args: {
    operations: sampleOperations,
    compact: true,
    title: 'Activity Log (Compact)',
  },
};

export const WithTimestamps: Story = {
  args: {
    operations: sampleOperations,
    showTimestamps: true,
    showDurations: true,
    title: 'Detailed Activity',
  },
};

export const Collapsed: Story = {
  args: {
    operations: sampleOperations,
    defaultCollapsed: true,
    title: 'Collapsed by Default',
  },
};

export const NonCollapsible: Story = {
  args: {
    operations: sampleOperations.slice(0, 3),
    collapsible: false,
    title: 'Fixed Activity',
  },
};

export const WithError: Story = {
  args: {
    operations: [
      ...sampleOperations.slice(0, 4),
      {
        id: 'error',
        type: 'error',
        status: 'error',
        title: 'Failed to write file: permission denied',
        content: 'Error: EACCES: permission denied, open \'/etc/hosts\'',
        timestamp: new Date(),
      },
    ],
    title: 'Activity with Error',
  },
};

export const Empty: Story = {
  args: {
    operations: [],
    title: 'Waiting for Activity',
  },
};

export const ManyOperations: Story = {
  render: () => {
    const manyOps: AgentOperation[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      type: ['search', 'read', 'grep', 'write', 'tool'][i % 5] as AgentOperation['type'],
      status: i < 18 ? 'completed' : i === 18 ? 'running' : 'pending' as AgentOperation['status'],
      title: `Operation ${i + 1}: ${['Searching files', 'Reading config', 'Pattern matching', 'Writing output', 'Running tool'][i % 5]}`,
      duration: i < 18 ? Math.floor(Math.random() * 2000) + 100 : undefined,
    }));

    return (
      <AgentActivityLog
        operations={manyOps}
        title="Long Running Task"
        showDurations
        maxVisible={10}
      />
    );
  },
};
