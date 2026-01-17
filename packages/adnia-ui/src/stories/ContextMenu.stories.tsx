import type { Meta, StoryObj } from '@storybook/react';
import { ContextMenuRoot, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuLabel } from '../components/ui/context-menu';

const meta: Meta = {
  title: 'Desktop/ContextMenu',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <ContextMenuRoot>
      <ContextMenuTrigger>
        <div className="flex h-40 w-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          Right click here
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem shortcut="mod+c">Copy</ContextMenuItem>
        <ContextMenuItem shortcut="mod+v">Paste</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuItem destructive>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>
  ),
};

export const FileExplorer: Story = {
  render: () => (
    <ContextMenuRoot>
      <ContextMenuTrigger>
        <div className="flex h-40 w-64 items-center justify-center rounded-md border border-border bg-muted/30 text-sm">
          document.txt
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Open With...</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem shortcut="mod+c">Copy</ContextMenuItem>
        <ContextMenuItem shortcut="mod+x">Cut</ContextMenuItem>
        <ContextMenuItem>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive shortcut="del">Move to Trash</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>
  ),
};
