import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, ThemeToggle, useTheme } from '../components/ui/theme-provider';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';

const meta: Meta<typeof ThemeProvider> = {
  title: 'Theme/ThemeProvider',
  component: ThemeProvider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThemeProvider>;

function ThemeShowcase() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div className="w-[400px] space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Theme: <span className="font-medium text-foreground">{theme}</span>
          {theme === 'system' && (
            <span className="ml-1">({resolvedTheme})</span>
          )}
        </div>
        <ThemeToggle showLabel />
      </div>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">Theme Preview</h3>
        <p className="text-sm text-muted-foreground">
          This card demonstrates how components look with the current theme.
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
        </div>

        <Input placeholder="Type something..." />

        <div className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Card>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <ThemeProvider defaultTheme="light">
      <ThemeShowcase />
    </ThemeProvider>
  ),
};

export const DarkDefault: Story = {
  render: () => (
    <ThemeProvider defaultTheme="dark">
      <ThemeShowcase />
    </ThemeProvider>
  ),
};

export const SystemDefault: Story = {
  render: () => (
    <ThemeProvider defaultTheme="system">
      <ThemeShowcase />
    </ThemeProvider>
  ),
};

function AllThemesGrid() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {(['light', 'dark', 'blue', 'green', 'purple'] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          className="rounded-lg border border-border bg-background p-4 space-y-3"
        >
          <h4 className="font-semibold text-foreground capitalize">{theme} Theme</h4>
          <p className="text-sm text-muted-foreground">Sample text with muted color</p>
          <div className="flex gap-2">
            <Button size="sm">Button</Button>
            <Button size="sm" variant="outline">Outline</Button>
          </div>
          <div className="flex gap-1">
            <Badge>Badge</Badge>
            <Badge variant="secondary">Secondary</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export const AllThemes: Story = {
  render: () => <AllThemesGrid />,
  parameters: {
    layout: 'padded',
  },
};
