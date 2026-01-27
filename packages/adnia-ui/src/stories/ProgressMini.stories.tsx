import type { Meta, StoryObj } from '@storybook/react';
import { ProgressMini } from '../components/ui/progress-mini';

const meta = {
  title: 'Interview/ProgressMini',
  component: ProgressMini,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ProgressMini>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    current: 2,
    total: 5,
  },
};

export const FirstStep: Story = {
  args: {
    current: 1,
    total: 5,
  },
};

export const LastStep: Story = {
  args: {
    current: 5,
    total: 5,
  },
};

export const MidProgress: Story = {
  args: {
    current: 3,
    total: 8,
  },
};

export const WithoutBar: Story = {
  args: {
    current: 2,
    total: 5,
    showBar: false,
  },
};

export const SmallSize: Story = {
  args: {
    current: 2,
    total: 5,
    size: 'sm',
  },
};

export const MediumSize: Story = {
  args: {
    current: 2,
    total: 5,
    size: 'md',
  },
};

export const LargeSize: Story = {
  args: {
    current: 2,
    total: 5,
    size: 'lg',
  },
};

export const CustomFormat: Story = {
  args: {
    current: 3,
    total: 5,
    format: (c, t) => `Question ${c} of ${t}`,
  },
};

export const SpanishFormat: Story = {
  args: {
    current: 2,
    total: 5,
    format: (c, t) => `Pregunta ${c} de ${t}`,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-16">Small:</span>
        <ProgressMini current={2} total={5} size="sm" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-16">Medium:</span>
        <ProgressMini current={2} total={5} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-16">Large:</span>
        <ProgressMini current={2} total={5} size="lg" />
      </div>
    </div>
  ),
};
