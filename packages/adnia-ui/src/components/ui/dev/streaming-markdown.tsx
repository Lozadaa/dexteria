import * as React from "react"
import { cn } from "../../../lib/utils"
import { MarkdownViewer, type MarkdownViewerProps } from "./markdown-viewer"

export interface StreamingMarkdownProps extends Omit<MarkdownViewerProps, "content"> {
  /** Initial content */
  initialContent?: string
  /** Display mode: "stream" for typewriter effect, "instant" for immediate display */
  mode?: "stream" | "instant"
  /** Characters per second for typewriter effect */
  speed?: number
  /** Maximum speed when catching up */
  maxCatchupSpeed?: number
  /** Show cursor during streaming */
  showCursor?: boolean
  /** Cursor character */
  cursorChar?: string
  /** Called when streaming completes */
  onComplete?: () => void
}

export interface StreamingMarkdownRef {
  /** Append content to the stream */
  append: (chunk: string) => void
  /** Set content directly */
  setContent: (content: string) => void
  /** Flush all buffered content */
  flush: () => void
  /** Clear all content */
  clear: () => void
  /** Pause streaming */
  pause: () => void
  /** Resume streaming */
  resume: () => void
  /** Current content */
  content: string
  /** Is streaming paused */
  isPaused: boolean
}

const StreamingMarkdown = React.forwardRef<StreamingMarkdownRef, StreamingMarkdownProps>(
  (
    {
      className,
      initialContent = "",
      mode = "stream",
      speed = 50,
      maxCatchupSpeed = 500,
      showCursor = true,
      cursorChar = "▋",
      onComplete,
      renderCodeBlock,
      ...props
    },
    ref
  ) => {
    // State using refs to avoid re-render loops
    const [displayedContent, setDisplayedContent] = React.useState(initialContent)
    const [isActive, setIsActive] = React.useState(false)

    // Refs for mutable state
    const bufferRef = React.useRef("")
    const isPausedRef = React.useRef(false)
    const rafRef = React.useRef<number | null>(null)
    const lastTickRef = React.useRef(0)
    const speedRef = React.useRef(speed)
    const maxCatchupSpeedRef = React.useRef(maxCatchupSpeed)
    const onCompleteRef = React.useRef(onComplete)

    // Keep refs updated
    React.useEffect(() => {
      speedRef.current = speed
      maxCatchupSpeedRef.current = maxCatchupSpeed
      onCompleteRef.current = onComplete
    }, [speed, maxCatchupSpeed, onComplete])

    // Process buffer - stable function that reads from refs
    const processBuffer = React.useCallback(() => {
      if (isPausedRef.current) {
        return
      }

      const now = performance.now()
      const elapsed = now - lastTickRef.current

      // Adaptive speed based on buffer length
      const bufferLength = bufferRef.current.length
      let targetSpeed = speedRef.current
      if (bufferLength > 100) {
        targetSpeed = Math.min(speedRef.current * (bufferLength / 20), maxCatchupSpeedRef.current)
      }

      const msPerChar = 1000 / targetSpeed

      if (elapsed >= msPerChar) {
        const charsToAdd = Math.max(1, Math.floor(elapsed / msPerChar))
        const chars = bufferRef.current.slice(0, charsToAdd)

        if (chars.length > 0) {
          bufferRef.current = bufferRef.current.slice(charsToAdd)
          setDisplayedContent((prev) => prev + chars)
          lastTickRef.current = now
        }
      }

      if (bufferRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(processBuffer)
      } else {
        rafRef.current = null
        setIsActive(false)
        onCompleteRef.current?.()
      }
    }, []) // Empty deps - function is stable

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }, [])

    // Start animation loop
    const startProcessing = React.useCallback(() => {
      if (rafRef.current === null && !isPausedRef.current) {
        lastTickRef.current = performance.now()
        setIsActive(true)
        rafRef.current = requestAnimationFrame(processBuffer)
      }
    }, [processBuffer])

    // Imperative handle
    React.useImperativeHandle(
      ref,
      () => ({
        append: (chunk: string) => {
          if (mode === "instant") {
            setDisplayedContent((prev) => prev + chunk)
          } else {
            bufferRef.current += chunk
            startProcessing()
          }
        },
        setContent: (content: string) => {
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
          bufferRef.current = ""
          setDisplayedContent(content)
          setIsActive(false)
        },
        flush: () => {
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
          if (bufferRef.current.length > 0) {
            setDisplayedContent((prev) => prev + bufferRef.current)
            bufferRef.current = ""
          }
          setIsActive(false)
          onCompleteRef.current?.()
        },
        clear: () => {
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
          bufferRef.current = ""
          setDisplayedContent("")
          setIsActive(false)
        },
        pause: () => {
          isPausedRef.current = true
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
        },
        resume: () => {
          isPausedRef.current = false
          if (bufferRef.current.length > 0) {
            startProcessing()
          }
        },
        get content() {
          return displayedContent
        },
        get isPaused() {
          return isPausedRef.current
        },
      }),
      [displayedContent, mode, startProcessing]
    )

    // Add cursor to content for display
    const contentWithCursor = React.useMemo(() => {
      if (showCursor && isActive) {
        return displayedContent + cursorChar
      }
      return displayedContent
    }, [displayedContent, showCursor, isActive, cursorChar])

    return (
      <div className={cn("streaming-markdown relative", className)}>
        <MarkdownViewer
          content={contentWithCursor}
          renderCodeBlock={renderCodeBlock}
          {...props}
        />
      </div>
    )
  }
)
StreamingMarkdown.displayName = "StreamingMarkdown"

// Hook for easier usage
export function useStreamingMarkdown(_options?: Partial<StreamingMarkdownProps>) {
  const ref = React.useRef<StreamingMarkdownRef>(null)

  const append = React.useCallback((chunk: string) => {
    ref.current?.append(chunk)
  }, [])

  const flush = React.useCallback(() => {
    ref.current?.flush()
  }, [])

  const clear = React.useCallback(() => {
    ref.current?.clear()
  }, [])

  const pause = React.useCallback(() => {
    ref.current?.pause()
  }, [])

  const resume = React.useCallback(() => {
    ref.current?.resume()
  }, [])

  const setContent = React.useCallback((content: string) => {
    ref.current?.setContent(content)
  }, [])

  return {
    ref,
    append,
    flush,
    clear,
    pause,
    resume,
    setContent,
    get content() {
      return ref.current?.content ?? ""
    },
    get isPaused() {
      return ref.current?.isPaused ?? false
    },
  }
}

export { StreamingMarkdown }
