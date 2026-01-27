import type { Meta, StoryObj } from '@storybook/react';
import { AutoGrowTextarea } from '../components/ui/auto-grow-textarea';
import { useState } from 'react';

const meta = {
  title: 'Interview/AutoGrowTextarea',
  component: AutoGrowTextarea,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AutoGrowTextarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message...',
    minRows: 1,
    maxRows: 5,
  },
};

export const WithInitialValue: Story = {
  args: {
    defaultValue: 'This is some initial text that the user can edit.',
    minRows: 2,
    maxRows: 8,
  },
};

export const SingleLine: Story = {
  args: {
    placeholder: 'Single line input...',
    minRows: 1,
    maxRows: 1,
  },
};

export const MultiLine: Story = {
  args: {
    placeholder: 'Write a longer message...',
    minRows: 3,
    maxRows: 10,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'This textarea is disabled',
    disabled: true,
    minRows: 2,
  },
};

export const WithSubmitHandler: Story = {
  render: () => {
    const [messages, setMessages] = useState<string[]>([]);
    const [value, setValue] = useState('');

    const handleSubmit = (text: string) => {
      setMessages([...messages, text]);
      setValue('');
    };

    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg min-h-[100px]">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">Press Enter to send a message</p>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, i) => (
                <li key={i} className="text-sm">{msg}</li>
              ))}
            </ul>
          )}
        </div>
        <AutoGrowTextarea
          placeholder="Type and press Enter to send..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onSubmit={handleSubmit}
          minRows={1}
          maxRows={4}
        />
        <p className="text-xs text-muted-foreground">
          Press Enter to submit, Shift+Enter for new line
        </p>
      </div>
    );
  },
};

export const ControlledValue: Story = {
  render: () => {
    const [value, setValue] = useState('');

    return (
      <div className="space-y-2">
        <AutoGrowTextarea
          placeholder="This is a controlled textarea..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          minRows={2}
          maxRows={6}
        />
        <p className="text-xs text-muted-foreground">
          Character count: {value.length}
        </p>
      </div>
    );
  },
};
