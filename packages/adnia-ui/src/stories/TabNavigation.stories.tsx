import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TabNavigation } from '../components/ui/tab-navigation';

const meta: Meta<typeof TabNavigation> = {
  title: 'Desktop/TabNavigation',
  component: TabNavigation,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'pills', 'underline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof TabNavigation>;

const baseTabs = [
  { id: 'drafts', label: 'Drafts' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

const tabsWithBadges = [
  { id: 'drafts', label: 'Drafts', badge: 3 },
  { id: 'history', label: 'History', badge: 12 },
  { id: 'settings', label: 'Settings' },
];

export const Default: Story = {
  args: {
    tabs: baseTabs,
    activeTab: 'drafts',
    onTabChange: () => {},
    variant: 'default',
  },
};

export const Pills: Story = {
  args: {
    tabs: baseTabs,
    activeTab: 'drafts',
    onTabChange: () => {},
    variant: 'pills',
  },
};

export const Underline: Story = {
  args: {
    tabs: baseTabs,
    activeTab: 'drafts',
    onTabChange: () => {},
    variant: 'underline',
  },
};

export const WithBadges: Story = {
  args: {
    tabs: tabsWithBadges,
    activeTab: 'drafts',
    onTabChange: () => {},
    variant: 'default',
  },
};

export const Interactive: Story = {
  args: {
    tabs: tabsWithBadges,
    activeTab: 'drafts',
    onTabChange: () => {},
    variant: 'pills',
  },
  render: function InteractiveTab() {
    const [activeTab, setActiveTab] = React.useState('drafts');
    return (
      <TabNavigation
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pills"
      />
    );
  },
};
