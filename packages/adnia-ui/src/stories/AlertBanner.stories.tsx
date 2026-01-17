import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AlertBanner } from '../components/ui/alert-banner';
import { Button } from '../components/ui/button';

const InfoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const meta: Meta<typeof AlertBanner> = {
  title: 'Data Display/AlertBanner',
  component: AlertBanner,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'info', 'success', 'warning', 'error'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof AlertBanner>;

export const Default: Story = {
  args: {
    title: 'Heads up!',
    description: 'This is a default alert message.',
    icon: <InfoIcon />,
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'New feature available',
    description: 'Check out our new scheduling options in settings.',
    icon: <InfoIcon />,
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Post published!',
    description: 'Your tweet was successfully posted to Twitter.',
    icon: <CheckIcon />,
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Action required',
    description: 'Please complete your business context to enable posting.',
    icon: <WarningIcon />,
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Post failed',
    description: 'Could not connect to Twitter. Check your credentials.',
    icon: <ErrorIcon />,
  },
};

export const WithAction: Story = {
  args: {
    variant: 'warning',
    title: 'Posts Blocked',
    description: 'Automatic posting is blocked until you complete your business context.',
    icon: <WarningIcon />,
    action: <Button size="sm">Complete Setup</Button>,
  },
};

export const Dismissible: Story = {
  render: function DismissibleAlert() {
    const [visible, setVisible] = React.useState(true);
    if (!visible) return <Button onClick={() => setVisible(true)}>Show Alert</Button>;
    return (
      <AlertBanner
        variant="info"
        title="Tip"
        description="You can dismiss this alert by clicking the X button."
        icon={<InfoIcon />}
        onDismiss={() => setVisible(false)}
      />
    );
  },
};
