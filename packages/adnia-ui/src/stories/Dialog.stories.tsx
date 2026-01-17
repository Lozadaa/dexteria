import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Dialog, DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const meta: Meta<typeof Dialog> = {
  title: 'Desktop/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: function DefaultDialog() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Edit Profile"
          description="Make changes to your profile here."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Save</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input placeholder="Name" />
            <Input placeholder="Email" type="email" />
          </div>
        </Dialog>
      </>
    );
  },
};

export const Sizes: Story = {
  render: function SizesDialog() {
    const [size, setSize] = React.useState<'sm' | 'md' | 'lg' | 'xl'>('md');
    const [open, setOpen] = React.useState(false);
    return (
      <div className="flex gap-2">
        {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
          <Button key={s} variant="outline" onClick={() => { setSize(s); setOpen(true); }}>
            {s.toUpperCase()}
          </Button>
        ))}
        <Dialog open={open} onOpenChange={setOpen} title={`Size: ${size}`} size={size}>
          <p>This dialog is size "{size}"</p>
        </Dialog>
      </div>
    );
  },
};
