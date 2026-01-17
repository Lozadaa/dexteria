import type { Meta, StoryObj } from '@storybook/react';
import { SectionCard, SectionCardHeader, SectionCardContent } from '../components/ui/section-card';
import { Button } from '../components/ui/button';
import { ActivityItem } from '../components/ui/activity-item';

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const meta: Meta<typeof SectionCard> = {
  title: 'Data Display/SectionCard',
  component: SectionCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SectionCard>;

export const Default: Story = {
  render: () => (
    <SectionCard className="w-[400px]">
      <SectionCardHeader title="Recent Activity" />
      <SectionCardContent>
        <p className="text-sm text-muted-foreground">
          Your recent posts and activity will appear here.
        </p>
      </SectionCardContent>
    </SectionCard>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <SectionCard className="w-[400px]">
      <SectionCardHeader
        title="Personas"
        description="Manage your posting personas"
      />
      <SectionCardContent>
        <p className="text-sm text-muted-foreground">
          No personas created yet.
        </p>
      </SectionCardContent>
    </SectionCard>
  ),
};

export const WithAction: Story = {
  render: () => (
    <SectionCard className="w-[400px]">
      <SectionCardHeader
        title="Recent Posts"
        action={<Button variant="ghost" size="sm">View All</Button>}
      />
      <SectionCardContent>
        <p className="text-sm text-muted-foreground">
          5 posts this week
        </p>
      </SectionCardContent>
    </SectionCard>
  ),
};

export const WithActivityList: Story = {
  render: () => (
    <SectionCard className="w-[450px]">
      <SectionCardHeader
        title="Recent Activity"
        description="Last 24 hours"
      />
      <SectionCardContent noPadding>
        <ActivityItem
          icon={<CheckIcon />}
          iconVariant="success"
          title="Post published"
          description="Just discovered an amazing productivity hack..."
          timestamp="2m ago"
        />
        <ActivityItem
          icon={<CheckIcon />}
          iconVariant="success"
          title="Post published"
          description="Here's what I learned building my first startup..."
          timestamp="2h ago"
        />
        <ActivityItem
          icon={<CheckIcon />}
          iconVariant="success"
          title="Post published"
          description="Thread: 10 tips for better code reviews..."
          timestamp="1d ago"
        />
      </SectionCardContent>
    </SectionCard>
  ),
};
