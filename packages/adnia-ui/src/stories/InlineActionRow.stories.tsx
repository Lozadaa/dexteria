import type { Meta, StoryObj } from '@storybook/react';
import { InlineActionRow, type ActionItem } from '../components/ui/inline-action-row';
import { HelpCircle, SkipForward, Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';

const meta = {
  title: 'Interview/InlineActionRow',
  component: InlineActionRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof InlineActionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const interviewActions: ActionItem[] = [
  { id: 'help', label: 'No se', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: 'skip', label: 'Saltar', icon: <SkipForward className="w-3.5 h-3.5" /> },
  { id: 'example', label: 'Ejemplo', icon: <Lightbulb className="w-3.5 h-3.5" /> },
];

export const Default: Story = {
  args: {
    actions: interviewActions,
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const LeftAligned: Story = {
  args: {
    actions: interviewActions,
    align: 'left',
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const CenterAligned: Story = {
  args: {
    actions: interviewActions,
    align: 'center',
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const RightAligned: Story = {
  args: {
    actions: interviewActions,
    align: 'right',
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const SmallButtons: Story = {
  args: {
    actions: interviewActions,
    buttonSize: 'sm',
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const LargeButtons: Story = {
  args: {
    actions: interviewActions,
    buttonSize: 'lg',
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const WithVariants: Story = {
  args: {
    actions: [
      { id: 'approve', label: 'Approve', icon: <ThumbsUp className="w-3.5 h-3.5" />, variant: 'primary' },
      { id: 'reject', label: 'Reject', icon: <ThumbsDown className="w-3.5 h-3.5" />, variant: 'ghost' },
    ],
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const WithDisabled: Story = {
  args: {
    actions: [
      { id: 'help', label: 'No se', icon: <HelpCircle className="w-3.5 h-3.5" /> },
      { id: 'skip', label: 'Saltar', icon: <SkipForward className="w-3.5 h-3.5" />, disabled: true },
      { id: 'example', label: 'Ejemplo', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    ],
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const TextOnly: Story = {
  args: {
    actions: [
      { id: 'help', label: 'Need help' },
      { id: 'skip', label: 'Skip this' },
      { id: 'example', label: 'Show example' },
    ],
    onAction: (id) => console.log('Action clicked:', id),
  },
};

export const Interactive: Story = {
  render: () => {
    const [lastAction, setLastAction] = useState<string | null>(null);

    return (
      <div className="space-y-4">
        <InlineActionRow
          actions={interviewActions}
          onAction={setLastAction}
        />
        {lastAction && (
          <p className="text-sm text-muted-foreground">
            Last action: <strong>{lastAction}</strong>
          </p>
        )}
      </div>
    );
  },
};

export const MixedVariants: Story = {
  args: {
    actions: [
      { id: 'primary', label: 'Primary', variant: 'primary' },
      { id: 'secondary', label: 'Secondary', variant: 'secondary' },
      { id: 'ghost', label: 'Ghost', variant: 'ghost' },
      { id: 'outline', label: 'Outline', variant: 'outline' },
      { id: 'default', label: 'Default', variant: 'default' },
    ],
    onAction: (id) => console.log('Action clicked:', id),
  },
};
