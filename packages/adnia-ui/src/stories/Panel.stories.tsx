import type { Meta, StoryObj } from '@storybook/react';
import { Panel, PanelHeader, PanelContent, PanelFooter } from '../components/ui/panel';
import { Button } from '../components/ui/button';

const meta: Meta<typeof Panel> = {
  title: 'Desktop/Panel',
  component: Panel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'bordered', 'elevated'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  render: () => (
    <Panel className="w-[400px]">
      <PanelHeader title="Draft Preview" description="Review before posting" />
      <PanelContent>
        <p className="text-sm text-foreground">
          This is an AI-generated draft for your social media. Review and edit as needed before posting.
        </p>
      </PanelContent>
    </Panel>
  ),
};

export const Bordered: Story = {
  render: () => (
    <Panel variant="bordered" className="w-[400px]">
      <PanelHeader title="Current Draft" />
      <PanelContent>
        <p className="text-sm text-foreground">
          Just discovered an amazing productivity hack that changed my workflow forever!
        </p>
      </PanelContent>
      <PanelFooter>
        <Button variant="ghost" size="sm">Discard</Button>
        <Button size="sm">Post</Button>
      </PanelFooter>
    </Panel>
  ),
};

export const Elevated: Story = {
  render: () => (
    <Panel variant="elevated" className="w-[400px]">
      <PanelHeader
        title="Posting Schedule"
        description="Configure when to post"
        actions={<Button variant="ghost" size="sm">Edit</Button>}
      />
      <PanelContent>
        <div className="space-y-2 text-sm">
          <p>Next post: 3:00 PM</p>
          <p>Frequency: Every 4 hours</p>
        </div>
      </PanelContent>
    </Panel>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Panel variant="bordered" className="w-[400px]">
      <PanelHeader
        title="Media Library"
        actions={
          <>
            <Button variant="ghost" size="sm">Filter</Button>
            <Button size="sm">Upload</Button>
          </>
        }
      />
      <PanelContent>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded bg-muted" />
          ))}
        </div>
      </PanelContent>
    </Panel>
  ),
};
