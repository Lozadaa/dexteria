import type { Meta, StoryObj } from '@storybook/react';
import { StatusBar, StatusBarItem } from '../components/ui/status-bar';

const meta: Meta<typeof StatusBar> = {
  title: 'Desktop/StatusBar',
  component: StatusBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusBar>;

export const Default: Story = {
  args: {
    leftContent: <StatusBarItem label="Ready" />,
    rightContent: <StatusBarItem label="v1.0.0" />,
  },
};

export const WithMultipleItems: Story = {
  render: () => (
    <StatusBar
      leftContent={
        <>
          <StatusBarItem label="Connected" />
          <StatusBarItem label="Last post:" value="2 hours ago" />
        </>
      }
      rightContent={
        <>
          <StatusBarItem label="Queued:" value={5} />
          <StatusBarItem label="Posted:" value={127} />
        </>
      }
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <StatusBar
      leftContent={<StatusBarItem label="Generating draft..." />}
    >
      <StatusBarItem label="3/10 tokens" />
    </StatusBar>
  ),
};

export const ClickableItems: Story = {
  render: () => (
    <StatusBar
      leftContent={
        <StatusBarItem
          label="View logs"
          clickable
          onClick={() => alert('Opening logs...')}
        />
      }
      rightContent={
        <StatusBarItem
          label="Settings"
          clickable
          onClick={() => alert('Opening settings...')}
        />
      }
    />
  ),
};
