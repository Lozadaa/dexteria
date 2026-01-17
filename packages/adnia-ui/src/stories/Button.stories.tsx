import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'warning', 'danger', 'success-soft', 'warning-soft', 'danger-soft'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon', 'icon-sm'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Post Now',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Pause',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Stop',
  },
};

export const SuccessSoft: Story = {
  args: {
    variant: 'success-soft',
    children: 'Approved',
  },
};

export const WarningSoft: Story = {
  args: {
    variant: 'warning-soft',
    children: 'Pending',
  },
};

export const DangerSoft: Story = {
  args: {
    variant: 'danger-soft',
    children: 'Rejected',
  },
};
