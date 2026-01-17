import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '../components/ui/switch';

const meta: Meta<typeof Switch> = {
  title: 'Desktop/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: function InteractiveSwitch() {
    const [checked, setChecked] = React.useState(false);
    return (
      <div className="flex items-center gap-3">
        <Switch checked={checked} onCheckedChange={setChecked} />
        <span className="text-sm text-foreground">
          {checked ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    );
  },
};

export const WithLabel: Story = {
  render: function SwitchWithLabel() {
    const [autoPost, setAutoPost] = React.useState(true);
    const [notifications, setNotifications] = React.useState(false);

    return (
      <div className="space-y-4 w-[250px]">
        <div className="flex items-center justify-between">
          <label className="text-sm text-foreground">Auto-post drafts</label>
          <Switch checked={autoPost} onCheckedChange={setAutoPost} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-foreground">Notifications</label>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      </div>
    );
  },
};
