import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AlertDialog } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';

const meta: Meta<typeof AlertDialog> = {
  title: 'Desktop/AlertDialog',
  component: AlertDialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AlertDialog>;

export const Default: Story = {
  render: function DefaultAlert() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>Delete Item</Button>
        <AlertDialog
          open={open}
          onOpenChange={setOpen}
          title="Are you sure?"
          description="This action cannot be undone. This will permanently delete the item."
          onConfirm={() => { console.log('Confirmed'); setOpen(false); }}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  },
};

export const Destructive: Story = {
  render: function DestructiveAlert() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>Delete Account</Button>
        <AlertDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Account"
          description="This will permanently delete your account and all associated data."
          confirmLabel="Delete Account"
          cancelLabel="Keep Account"
          variant="destructive"
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
};
