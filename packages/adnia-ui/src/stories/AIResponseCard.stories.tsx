import type { Meta, StoryObj } from "@storybook/react"
import { AIResponseCard, MarkdownViewer, StreamingMarkdown, type StreamingMarkdownRef } from "../components/ui/dev"
import * as React from "react"

const meta: Meta<typeof AIResponseCard> = {
  title: "UI/AIResponseCard",
  component: AIResponseCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof AIResponseCard>

export const Default: Story = {
  args: {
    status: "complete",
    model: "GPT-4",
    timestamp: new Date(),
    tokenCount: 256,
    duration: 1500,
    children: (
      <MarkdownViewer
        content={`Here's a simple function that calculates factorial:

\`\`\`typescript
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
\`\`\`

This uses recursion to compute the factorial.`}
      />
    ),
  },
}

export const Streaming: Story = {
  render: () => {
    const ref = React.useRef<StreamingMarkdownRef>(null)
    const [isStreaming, setIsStreaming] = React.useState(true)

    React.useEffect(() => {
      const text = `I'll help you with that!

Here's a solution using TypeScript:

\`\`\`typescript
const greet = (name: string) => {
  return \`Hello, \${name}!\`;
};
\`\`\`

This function takes a name and returns a greeting.`

      let index = 0
      const interval = setInterval(() => {
        if (index < text.length) {
          ref.current?.append(text.slice(index, index + 3))
          index += 3
        } else {
          clearInterval(interval)
          setIsStreaming(false)
        }
      }, 30)

      return () => clearInterval(interval)
    }, [])

    return (
      <AIResponseCard
        status={isStreaming ? "streaming" : "complete"}
        model="Claude 3"
        onCancel={() => {
          setIsStreaming(false)
          ref.current?.flush()
        }}
        onCopy={() => alert("Copied!")}
        onFeedback={(type) => alert(`Feedback: ${type}`)}
      >
        <StreamingMarkdown ref={ref} />
      </AIResponseCard>
    )
  },
}

export const WithError: Story = {
  args: {
    status: "error",
    model: "GPT-4",
    timestamp: new Date(),
    onRetry: () => alert("Retrying..."),
    children: (
      <div className="text-red-500">
        <p className="font-medium">Request failed</p>
        <p className="text-sm mt-1">Error: Rate limit exceeded. Please try again later.</p>
      </div>
    ),
  },
}

export const Cancelled: Story = {
  args: {
    status: "cancelled",
    model: "GPT-4",
    timestamp: new Date(),
    onRetry: () => alert("Retrying..."),
    children: (
      <p className="text-muted-foreground">Response was cancelled by user.</p>
    ),
  },
}

export const WithFeedback: Story = {
  args: {
    status: "complete",
    model: "Claude 3.5",
    timestamp: new Date(),
    tokenCount: 512,
    duration: 2300,
    onCopy: () => alert("Copied!"),
    onFeedback: (type) => alert(`Feedback: ${type}`),
    children: (
      <MarkdownViewer
        content={`Great question! Here's what I found:

1. **Performance**: The new approach is 3x faster
2. **Memory**: Uses 50% less memory
3. **Compatibility**: Works with all major browsers

Would you like me to explain any of these in more detail?`}
      />
    ),
  },
}

export const Collapsible: Story = {
  args: {
    status: "complete",
    model: "GPT-4",
    timestamp: new Date(),
    tokenCount: 1024,
    collapsible: true,
    children: (
      <MarkdownViewer
        content={`This is a longer response that can be collapsed.

## Section 1
Lorem ipsum dolor sit amet...

## Section 2
More content here...

## Code Example
\`\`\`javascript
console.log("Hello!");
\`\`\``}
      />
    ),
  },
}

export const NoMetadata: Story = {
  args: {
    status: "complete",
    showMetadata: false,
    children: (
      <p>A simple response without metadata footer.</p>
    ),
  },
}

export const CustomAvatar: Story = {
  args: {
    status: "complete",
    model: "Custom Bot",
    title: "My Assistant",
    avatar: (
      <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
        AI
      </div>
    ),
    children: (
      <p>Response from a custom assistant with a custom avatar.</p>
    ),
  },
}
