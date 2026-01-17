import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '../components/ui/dropdown';
import { Button } from '../components/ui/button';

const meta: Meta = {
  title: 'Desktop/Dropdown',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>New File</DropdownMenuItem>
        <DropdownMenuItem>Open...</DropdownMenuItem>
        <DropdownMenuItem shortcut="mod+s">Save</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuRoot>
  ),
};

export const WithShortcuts: Story = {
  render: () => (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Edit</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem shortcut="mod+z">Undo</DropdownMenuItem>
        <DropdownMenuItem shortcut="mod+shift+z">Redo</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem shortcut="mod+x">Cut</DropdownMenuItem>
        <DropdownMenuItem shortcut="mod+c">Copy</DropdownMenuItem>
        <DropdownMenuItem shortcut="mod+v">Paste</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuRoot>
  ),
};
