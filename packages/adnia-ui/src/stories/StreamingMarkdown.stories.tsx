import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { StreamingMarkdown, type StreamingMarkdownRef } from "../components/ui/dev"

const meta: Meta<typeof StreamingMarkdown> = {
  title: "UI/StreamingMarkdown",
  component: StreamingMarkdown,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof StreamingMarkdown>

const sampleMarkdown = `# Introduction to React Hooks

React Hooks are functions that let you **hook into** React state and lifecycle features from function components.

## Common Hooks

### useState
The most basic hook for managing state:

\`\`\`typescript
const [count, setCount] = useState(0);
\`\`\`

### useEffect
For side effects like data fetching:

\`\`\`typescript
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

## Benefits

1. **Simpler code** - No class boilerplate
2. **Better composition** - Extract and reuse logic
3. **Smaller bundles** - Less code to ship

> Hooks are a powerful addition to React that simplify component logic.
`

// Interactive streaming demo
function StreamingDemo() {
  const ref = React.useRef<StreamingMarkdownRef>(null)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isPaused, setIsPaused] = React.useState(false)

  const startStreaming = () => {
    ref.current?.clear()
    setIsStreaming(true)
    setIsPaused(false)

    let index = 0
    const interval = setInterval(() => {
      if (index < sampleMarkdown.length) {
        const chunkSize = Math.floor(Math.random() * 5) + 1
        ref.current?.append(sampleMarkdown.slice(index, index + chunkSize))
        index += chunkSize
      } else {
        clearInterval(interval)
        ref.current?.flush()
        setIsStreaming(false)
      }
    }, 20)

    return () => clearInterval(interval)
  }

  const togglePause = () => {
    if (isPaused) {
      ref.current?.resume()
    } else {
      ref.current?.pause()
    }
    setIsPaused(!isPaused)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={startStreaming}
          disabled={isStreaming}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          {isStreaming ? "Streaming..." : "Start Stream"}
        </button>
        {isStreaming && (
          <button
            onClick={togglePause}
            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted cursor-pointer"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          onClick={() => ref.current?.clear()}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted cursor-pointer"
        >
          Clear
        </button>
      </div>
      <div className="border border-border rounded-md p-4 min-h-[300px]">
        <StreamingMarkdown ref={ref} />
      </div>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <StreamingDemo />,
}

export const Default: Story = {
  render: () => {
    const ref = React.useRef<StreamingMarkdownRef>(null)

    React.useEffect(() => {
      const text = "Hello, this is **streaming markdown** with `code` support!"
      let i = 0
      const interval = setInterval(() => {
        if (i < text.length) {
          ref.current?.append(text[i])
          i++
        } else {
          clearInterval(interval)
        }
      }, 50)
      return () => clearInterval(interval)
    }, [])

    return <StreamingMarkdown ref={ref} />
  },
}

export const WithCodeBlocks: Story = {
  render: () => {
    const ref = React.useRef<StreamingMarkdownRef>(null)

    React.useEffect(() => {
      const text = `Here's a code example:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Pretty cool, right?`

      let i = 0
      const interval = setInterval(() => {
        if (i < text.length) {
          ref.current?.append(text.slice(i, i + 2))
          i += 2
        } else {
          clearInterval(interval)
        }
      }, 30)
      return () => clearInterval(interval)
    }, [])

    return (
      <div className="border border-border rounded-md p-4">
        <StreamingMarkdown ref={ref} />
      </div>
    )
  },
}

export const FastStreaming: Story = {
  render: () => {
    const ref = React.useRef<StreamingMarkdownRef>(null)

    React.useEffect(() => {
      // Simulate fast token streaming (like from an LLM)
      const text = sampleMarkdown
      let i = 0
      const interval = setInterval(() => {
        if (i < text.length) {
          // Random chunk sizes to simulate real token streaming
          const chunkSize = Math.floor(Math.random() * 10) + 1
          ref.current?.append(text.slice(i, i + chunkSize))
          i += chunkSize
        } else {
          clearInterval(interval)
          ref.current?.flush()
        }
      }, 10)
      return () => clearInterval(interval)
    }, [])

    return (
      <div className="border border-border rounded-md p-4 max-h-[400px] overflow-auto">
        <StreamingMarkdown ref={ref} />
      </div>
    )
  },
}

export const WithCursor: Story = {
  render: () => {
    const ref = React.useRef<StreamingMarkdownRef>(null)

    React.useEffect(() => {
      const text = "Typing with a visible cursor..."
      let i = 0
      const interval = setInterval(() => {
        if (i < text.length) {
          ref.current?.append(text[i])
          i++
        } else {
          clearInterval(interval)
        }
      }, 100)
      return () => clearInterval(interval)
    }, [])

    return <StreamingMarkdown ref={ref} showCursor cursorChar="|" />
  },
}

export const PreloadedContent: Story = {
  render: () => {
    const ref = React.useRef<StreamingMarkdownRef>(null)

    React.useEffect(() => {
      ref.current?.setContent("# Pre-loaded Content\n\nThis content was set immediately.")
    }, [])

    return (
      <div className="border border-border rounded-md p-4">
        <StreamingMarkdown ref={ref} />
      </div>
    )
  },
}
