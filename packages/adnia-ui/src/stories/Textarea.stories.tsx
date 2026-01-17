import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../components/ui/textarea';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here...',
    className: 'w-[350px]',
  },
};

export const WithValue: Story = {
  args: {
    value: 'This is a pre-filled textarea with some content that spans multiple lines to show how it handles longer text.',
    className: 'w-[350px]',
  },
};

export const Error: Story = {
  args: {
    placeholder: 'Enter description...',
    error: true,
    className: 'w-[350px]',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
    className: 'w-[350px]',
  },
};

export const Large: Story = {
  args: {
    placeholder: 'Write your draft here...',
    className: 'w-[400px] min-h-[150px]',
  },
};
