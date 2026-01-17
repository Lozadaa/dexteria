import type { Meta, StoryObj } from '@storybook/react';
import { StatCard } from '../components/ui/stat-card';

const CalendarIcon = () => (
  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const TrendingIcon = () => (
  <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const meta: Meta<typeof StatCard> = {
  title: 'Data Display/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    label: 'Total Posts',
    value: 128,
    icon: <CalendarIcon />,
  },
};

export const WithTrend: Story = {
  args: {
    label: 'Success Rate',
    value: '94%',
    icon: <TrendingIcon />,
    trend: {
      value: '+12% from last week',
      positive: true,
    },
  },
};

export const NegativeTrend: Story = {
  args: {
    label: 'Failed Posts',
    value: 8,
    icon: <CheckIcon />,
    trend: {
      value: '-3 from yesterday',
      positive: false,
    },
  },
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[500px]">
      <StatCard label="Total Posts" value={128} icon={<CalendarIcon />} />
      <StatCard label="Successful" value={120} icon={<CheckIcon />} />
      <StatCard
        label="Success Rate"
        value="94%"
        icon={<TrendingIcon />}
        trend={{ value: '+12%', positive: true }}
      />
      <StatCard label="This Week" value={23} icon={<CalendarIcon />} />
    </div>
  ),
};
