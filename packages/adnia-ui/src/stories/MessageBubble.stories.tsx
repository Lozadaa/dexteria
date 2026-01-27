import type { Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from '../components/ui/message-bubble';
import { Bot, User } from 'lucide-react';

const meta = {
  title: 'Interview/MessageBubble',
  component: MessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-lg space-y-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AssistantMessage: Story = {
  args: {
    variant: 'assistant',
    children: 'Hello! I am Ralph, your AI assistant. I will help you plan your project by asking a few questions.',
    avatar: <Bot className="w-4 h-4" />,
  },
};

export const UserMessage: Story = {
  args: {
    variant: 'user',
    children: 'I want to build a task management app with AI features.',
    avatar: <User className="w-4 h-4" />,
  },
};

export const StreamingMessage: Story = {
  args: {
    variant: 'assistant',
    children: 'Let me think about that',
    avatar: <Bot className="w-4 h-4" />,
    isStreaming: true,
  },
};

export const AnimatedAssistant: Story = {
  args: {
    variant: 'assistant',
    animate: true,
    children: 'Great! What technologies are you considering for this project?',
    avatar: <Bot className="w-4 h-4" />,
  },
};

export const AnimatedUser: Story = {
  args: {
    variant: 'user',
    animate: true,
    children: 'I am thinking React for the frontend and Node.js for the backend.',
    avatar: <User className="w-4 h-4" />,
  },
};

export const NoAvatar: Story = {
  args: {
    variant: 'assistant',
    children: 'This message has no avatar.',
  },
};

export const LongMessage: Story = {
  args: {
    variant: 'assistant',
    children: `Based on what you have told me, here are my recommendations:

1. Use React with TypeScript for type safety
2. Consider using a state management library like Zustand
3. For the backend, Express.js with PostgreSQL would be a good choice
4. Add authentication early in the development process

Do you have any questions about these recommendations?`,
    avatar: <Bot className="w-4 h-4" />,
  },
};

export const Conversation: Story = {
  render: () => (
    <div className="space-y-4">
      <MessageBubble variant="assistant" avatar={<Bot className="w-4 h-4" />}>
        What kind of project would you like to build?
      </MessageBubble>
      <MessageBubble variant="user" avatar={<User className="w-4 h-4" />}>
        A todo app with collaborative features
      </MessageBubble>
      <MessageBubble variant="assistant" avatar={<Bot className="w-4 h-4" />}>
        That sounds interesting! Who is the target audience for this app?
      </MessageBubble>
      <MessageBubble variant="user" avatar={<User className="w-4 h-4" />}>
        Small teams and remote workers
      </MessageBubble>
    </div>
  ),
};
