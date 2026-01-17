import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipProvider } from '../components/ui/tooltip';
import { Button } from '../components/ui/button';

const meta: Meta<typeof Tooltip> = {
  title: 'Desktop/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <Tooltip content="This is a tooltip">
      <Button variant="outline">Hover me</Button>
    </Tooltip>
  ),
};

export const WithShortcut: Story = {
  render: () => (
    <Tooltip content="Save document" shortcut="mod+s">
      <Button>Save</Button>
    </Tooltip>
  ),
};

export const Positions: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip content="Top" side="top"><Button variant="outline">Top</Button></Tooltip>
      <Tooltip content="Right" side="right"><Button variant="outline">Right</Button></Tooltip>
      <Tooltip content="Bottom" side="bottom"><Button variant="outline">Bottom</Button></Tooltip>
      <Tooltip content="Left" side="left"><Button variant="outline">Left</Button></Tooltip>
    </div>
  ),
};
