import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CommandPalette, CommandGroup, CommandItem, useCommandPalette } from '../components/ui/command-palette';
import { Button } from '../components/ui/button';

const meta: Meta<typeof CommandPalette> = {
  title: 'Desktop/CommandPalette',
  component: CommandPalette,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

export const Default: Story = {
  render: function DefaultPalette() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Command Palette (Cmd+K)</Button>
        <CommandPalette open={open} onOpenChange={setOpen}>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => setOpen(false)} shortcut="mod+n">New File</CommandItem>
            <CommandItem onSelect={() => setOpen(false)} shortcut="mod+o">Open File</CommandItem>
            <CommandItem onSelect={() => setOpen(false)} shortcut="mod+s">Save</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => setOpen(false)}>Go to Dashboard</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>Go to Settings</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>Go to Profile</CommandItem>
          </CommandGroup>
        </CommandPalette>
      </>
    );
  },
};

export const WithHook: Story = {
  render: function HookPalette() {
    const [open, setOpen] = useCommandPalette('mod+k');
    return (
      <>
        <p className="text-sm text-muted-foreground mb-4">Press Cmd+K (or Ctrl+K) to open</p>
        <CommandPalette open={open} onOpenChange={setOpen}>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => setOpen(false)}>Search...</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>Create new draft</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>View history</CommandItem>
          </CommandGroup>
        </CommandPalette>
      </>
    );
  },
};
