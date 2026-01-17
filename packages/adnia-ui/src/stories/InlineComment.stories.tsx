import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { InlineComment, type CommentThread } from "../components/ui/dev"

const meta: Meta<typeof InlineComment> = {
  title: "UI/InlineComment",
  component: InlineComment,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof InlineComment>

const sampleThread: CommentThread = {
  id: "thread-1",
  line: 42,
  resolved: false,
  comments: [
    {
      id: "comment-1",
      author: "Alice",
      avatar: "A",
      timestamp: new Date(Date.now() - 3600000),
      content: "This function could use some optimization. Consider using memoization.",
    },
    {
      id: "comment-2",
      author: "Bob",
      avatar: "B",
      timestamp: new Date(Date.now() - 1800000),
      content: "Good point! I'll add a cache for repeated calls.",
    },
  ],
}

// Interactive demo
function InlineCommentDemo() {
  const [thread, setThread] = React.useState<CommentThread>(sampleThread)

  const handleReply = (content: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      author: "You",
      avatar: "Y",
      timestamp: new Date(),
      content,
    }
    setThread((prev) => ({
      ...prev,
      comments: [...prev.comments, newComment],
    }))
  }

  const handleResolve = () => {
    setThread((prev) => ({ ...prev, resolved: !prev.resolved }))
  }

  const handleEdit = (commentId: string, newContent: string) => {
    setThread((prev) => ({
      ...prev,
      comments: prev.comments.map((c) =>
        c.id === commentId ? { ...c, content: newContent } : c
      ),
    }))
  }

  const handleDelete = (commentId: string) => {
    setThread((prev) => ({
      ...prev,
      comments: prev.comments.filter((c) => c.id !== commentId),
    }))
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-2 text-sm text-muted-foreground">
        Line {thread.line} • {thread.resolved ? "Resolved" : "Open"}
      </div>
      <InlineComment
        thread={thread}
        onReply={handleReply}
        onResolve={handleResolve}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentUser="You"
      />
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InlineCommentDemo />,
}

export const Default: Story = {
  args: {
    thread: sampleThread,
  },
}

export const SingleComment: Story = {
  args: {
    thread: {
      id: "thread-2",
      line: 15,
      resolved: false,
      comments: [
        {
          id: "comment-1",
          author: "Reviewer",
          avatar: "R",
          timestamp: new Date(),
          content: "Please add error handling for the edge case when input is null.",
        },
      ],
    },
  },
}

export const Resolved: Story = {
  args: {
    thread: {
      ...sampleThread,
      resolved: true,
    },
  },
}

export const WithActions: Story = {
  args: {
    thread: sampleThread,
    onReply: (content) => alert(`Reply: ${content}`),
    onResolve: () => alert("Resolve toggled"),
    onEdit: (id, content) => alert(`Edit ${id}: ${content}`),
    onDelete: (id) => alert(`Delete: ${id}`),
    currentUser: "Alice",
  },
}

export const LongThread: Story = {
  args: {
    thread: {
      id: "thread-3",
      line: 100,
      resolved: false,
      comments: [
        {
          id: "c1",
          author: "Dev1",
          avatar: "D",
          timestamp: new Date(Date.now() - 7200000),
          content: "We should refactor this to use async/await instead of callbacks.",
        },
        {
          id: "c2",
          author: "Dev2",
          avatar: "E",
          timestamp: new Date(Date.now() - 5400000),
          content: "Agreed. It would make the code much more readable.",
        },
        {
          id: "c3",
          author: "Dev3",
          avatar: "F",
          timestamp: new Date(Date.now() - 3600000),
          content: "I can take this on. Should I also add proper error boundaries?",
        },
        {
          id: "c4",
          author: "Dev1",
          avatar: "D",
          timestamp: new Date(Date.now() - 1800000),
          content: "Yes, please do. Let's also add retry logic for network failures.",
        },
        {
          id: "c5",
          author: "Dev2",
          avatar: "E",
          timestamp: new Date(),
          content: "Sounds good! Don't forget to update the tests as well.",
        },
      ],
    },
  },
}

export const Collapsible: Story = {
  args: {
    thread: sampleThread,
    collapsible: true,
    defaultCollapsed: false,
  },
}

export const CollapsedByDefault: Story = {
  args: {
    thread: sampleThread,
    collapsible: true,
    defaultCollapsed: true,
  },
}

export const WithCodeReference: Story = {
  args: {
    thread: {
      id: "thread-4",
      line: 25,
      resolved: false,
      codeSnippet: "const result = await fetchData(userId);",
      comments: [
        {
          id: "c1",
          author: "Reviewer",
          avatar: "R",
          timestamp: new Date(),
          content: "What happens if `userId` is undefined? We should add validation.",
        },
      ],
    },
    showCodeSnippet: true,
  },
}
