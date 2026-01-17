import type { Meta, StoryObj } from '@storybook/react';
import { ActivityItem } from '../components/ui/activity-item';
import { Button } from '../components/ui/button';

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ExternalIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const meta: Meta<typeof ActivityItem> = {
  title: 'Data Display/ActivityItem',
  component: ActivityItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    iconVariant: {
      control: 'select',
      options: ['default', 'success', 'error', 'warning', 'info'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ActivityItem>;

export const Success: Story = {
  args: {
    icon: <CheckIcon />,
    iconVariant: 'success',
    title: 'Post published',
    description: 'Just discovered an amazing productivity hack...',
    timestamp: '2m ago',
  },
};

export const Error: Story = {
  args: {
    icon: <XIcon />,
    iconVariant: 'error',
    title: 'Post failed',
    description: 'Rate limit exceeded. Try again later.',
    timestamp: '5m ago',
  },
};

export const WithAction: Story = {
  args: {
    icon: <CheckIcon />,
    iconVariant: 'success',
    title: 'Post published',
    description: 'Check out this new feature we just launched!',
    timestamp: '1h ago',
    action: (
      <Button variant="ghost" size="sm">
        <ExternalIcon />
      </Button>
    ),
  },
};

export const List: Story = {
  render: () => (
    <div className="w-[400px] border border-border rounded-xl overflow-hidden">
      <ActivityItem
        icon={<CheckIcon />}
        iconVariant="success"
        title="Post published"
        description="Just discovered an amazing productivity hack..."
        timestamp="2m ago"
      />
      <ActivityItem
        icon={<CheckIcon />}
        iconVariant="success"
        title="Post published"
        description="Here's what I learned building my first startup..."
        timestamp="2h ago"
      />
      <ActivityItem
        icon={<XIcon />}
        iconVariant="error"
        title="Post failed"
        description="Rate limit exceeded"
        timestamp="3h ago"
      />
      <ActivityItem
        icon={<CheckIcon />}
        iconVariant="success"
        title="Post published"
        description="Thread: 10 tips for better code reviews..."
        timestamp="1d ago"
      />
    </div>
  ),
};
