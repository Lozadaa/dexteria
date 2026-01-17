import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { StreamingTypewriter, type StreamingTypewriterRef } from "../components/ui/dev"

const meta: Meta<typeof StreamingTypewriter> = {
  title: "UI/StreamingTypewriter",
  component: StreamingTypewriter,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof StreamingTypewriter>

// Interactive demo component
function StreamingDemo() {
  const ref = React.useRef<StreamingTypewriterRef>(null)
  const [isStreaming, setIsStreaming] = React.useState(false)

  const sampleText = `Hello! I'm an AI assistant. I can help you with various tasks like:

1. Writing and explaining code
2. Answering questions
3. Debugging issues
4. Providing documentation

Let me know how I can assist you today!`

  const startStreaming = () => {
    if (ref.current) {
      ref.current.clear()
      setIsStreaming(true)

      // Simulate token streaming
      let index = 0
      const interval = setInterval(() => {
        if (index < sampleText.length) {
          // Simulate varying chunk sizes
          const chunkSize = Math.floor(Math.random() * 5) + 1
          const chunk = sampleText.slice(index, index + chunkSize)
          ref.current?.append(chunk)
          index += chunkSize
        } else {
          clearInterval(interval)
          setIsStreaming(false)
        }
      }, 50)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={startStreaming}
          disabled={isStreaming}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          Start Streaming
        </button>
        <button
          onClick={() => ref.current?.flush()}
          className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80 cursor-pointer"
        >
          Flush
        </button>
        <button
          onClick={() => ref.current?.clear()}
          className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80 cursor-pointer"
        >
          Clear
        </button>
      </div>

      <div className="p-4 rounded-lg border border-border bg-card min-h-[200px]">
        <StreamingTypewriter
          ref={ref}
          speed={50}
          maxCatchupSpeed={200}
          showCursor={true}
        />
      </div>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <StreamingDemo />,
}

export const Default: Story = {
  args: {
    initialText: "This is some initial text that appears immediately.",
    showCursor: true,
  },
}

export const InstantMode: Story = {
  args: {
    initialText: "In instant mode, text appears immediately without animation.",
    mode: "instant",
    showCursor: false,
  },
}

export const CustomCursor: Story = {
  args: {
    initialText: "Custom cursor character...",
    showCursor: true,
    cursorChar: "▌",
  },
}

export const FastSpeed: Story = {
  render: () => {
    const ref = React.useRef<StreamingTypewriterRef>(null)

    React.useEffect(() => {
      const text = "This text streams at a very fast speed!"
      let index = 0
      const interval = setInterval(() => {
        if (index < text.length) {
          ref.current?.append(text[index])
          index++
        } else {
          clearInterval(interval)
        }
      }, 10)
      return () => clearInterval(interval)
    }, [])

    return (
      <StreamingTypewriter
        ref={ref}
        speed={200}
        showCursor={true}
      />
    )
  },
}
