import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from '../components/ui/kbd';

const meta: Meta<typeof Kbd> = {
  title: 'Desktop/Kbd',
  component: Kbd,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
  args: { children: 'mod+k' },
};

export const MultiKey: Story = {
  args: { children: 'mod+shift+p' },
};

export const SingleKey: Story = {
  args: { children: 'enter' },
};

export const AllModifiers: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Kbd>mod+k</Kbd>
      <Kbd>ctrl+c</Kbd>
      <Kbd>alt+tab</Kbd>
      <Kbd>shift+enter</Kbd>
      <Kbd>escape</Kbd>
      <Kbd>backspace</Kbd>
    </div>
  ),
};
