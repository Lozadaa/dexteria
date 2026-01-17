import type { Meta, StoryObj } from '@storybook/react';
import { AppHeader, StatusIndicator } from '../components/ui/app-header';
import { Button } from '../components/ui/button';

const meta: Meta<typeof AppHeader> = {
  title: 'Desktop/AppHeader',
  component: AppHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AppHeader>;

export const Default: Story = {
  args: {
    title: 'PersonaPoster',
    subtitle: 'Automated social posting',
  },
};

export const WithActions: Story = {
  args: {
    title: 'PersonaPoster',
  },
  render: (args) => (
    <AppHeader {...args}>
      <StatusIndicator status="connected" label="Connected" />
      <Button variant="ghost" size="sm">Pause</Button>
      <Button size="sm">Post Now</Button>
    </AppHeader>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <AppHeader title="PersonaPoster">
      <StatusIndicator status="loading" label="Generating..." />
    </AppHeader>
  ),
};

export const Disconnected: Story = {
  render: () => (
    <AppHeader title="PersonaPoster">
      <StatusIndicator status="disconnected" label="Disconnected" />
      <Button size="sm" disabled>Post Now</Button>
    </AppHeader>
  ),
};

export const StatusConnected: StoryObj = {
  render: () => <StatusIndicator status="connected" label="Connected" />,
};

export const StatusLoading: StoryObj = {
  render: () => <StatusIndicator status="loading" label="Generating..." />,
};

export const StatusError: StoryObj = {
  render: () => <StatusIndicator status="error" label="Error" />,
};
