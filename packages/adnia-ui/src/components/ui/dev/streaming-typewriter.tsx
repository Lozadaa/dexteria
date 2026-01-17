import * as React from "react"
import { cn } from "../../../lib/utils"

export interface StreamingTypewriterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Initial text content */
  initialText?: string
  /** Display mode: "stream" for typewriter effect, "instant" for immediate display */
  mode?: "stream" | "instant"
  /** Characters per second for typewriter effect */
  speed?: number
  /** Maximum speed when catching up (buffer is growing) */
  maxCatchupSpeed?: number
  /** Show blinking cursor */
  showCursor?: boolean
  /** Custom cursor character */
  cursorChar?: string
  /** Called when streaming completes */
  onComplete?: () => void
  /** Called when text changes */
  onTextChange?: (text: string) => void
}

export interface StreamingTypewriterRef {
  /** Append text to the buffer */
  append: (chunk: string) => void
  /** Set text directly (replaces current text) */
  setText: (text: string) => void
  /** Immediately display all buffered text */
  flush: () => void
  /** Pause the typewriter effect */
  pause: () => void
  /** Resume the typewriter effect */
  resume: () => void
  /** Clear all text */
  clear: () => void
  /** Get current pause state */
  isPaused: boolean
  /** Get current displayed text */
  text: string
}

const StreamingTypewriter = React.forwardRef<StreamingTypewriterRef, StreamingTypewriterProps>(
  (
    {
      className,
      initialText = "",
      mode = "stream",
      speed = 50,
      maxCatchupSpeed = 500,
      showCursor = true,
      cursorChar = "|",
      onComplete,
      onTextChange,
      children,
      ...props
    },
    ref
  ) => {
    // Displayed text
    const [displayedText, setDisplayedText] = React.useState(initialText)
    // Buffer for incoming chunks
    const bufferRef = React.useRef("")
    // Pause state
    const [isPaused, setIsPaused] = React.useState(false)
    // Is streaming active
    const [isStreaming, setIsStreaming] = React.useState(false)
    // Animation frame ref
    const rafRef = React.useRef<number | null>(null)
    // Last tick timestamp
    const lastTickRef = React.useRef(0)
    // Current speed (adaptive)
    const currentSpeedRef = React.useRef(speed)

    // Clean up on unmount
    React.useEffect(() => {
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    }, [])

    // Notify on text change
    React.useEffect(() => {
      onTextChange?.(displayedText)
    }, [displayedText, onTextChange])

    // Process buffer with adaptive speed
    const processBuffer = React.useCallback(() => {
      if (isPaused) return

      const now = performance.now()
      const elapsed = now - lastTickRef.current

      // Calculate adaptive speed based on buffer size
      const bufferLength = bufferRef.current.length
      let targetSpeed = speed

      if (bufferLength > 100) {
        // Buffer is growing, speed up
        const speedMultiplier = Math.min(bufferLength / 20, maxCatchupSpeed / speed)
        targetSpeed = Math.min(speed * speedMultiplier, maxCatchupSpeed)
      }

      currentSpeedRef.current = targetSpeed
      const msPerChar = 1000 / targetSpeed

      if (elapsed >= msPerChar) {
        const charsToAdd = Math.floor(elapsed / msPerChar)
        const chars = bufferRef.current.slice(0, charsToAdd)

        if (chars.length > 0) {
          bufferRef.current = bufferRef.current.slice(charsToAdd)
          setDisplayedText((prev) => prev + chars)
          lastTickRef.current = now
        }
      }

      // Continue if there's more in buffer
      if (bufferRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(processBuffer)
      } else {
        setIsStreaming(false)
        onComplete?.()
      }
    }, [isPaused, speed, maxCatchupSpeed, onComplete])

    // Start processing when streaming begins
    React.useEffect(() => {
      if (isStreaming && !isPaused && mode === "stream") {
        lastTickRef.current = performance.now()
        rafRef.current = requestAnimationFrame(processBuffer)
      }

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    }, [isStreaming, isPaused, mode, processBuffer])

    // Imperative handle
    React.useImperativeHandle(
      ref,
      () => ({
        append: (chunk: string) => {
          if (mode === "instant") {
            setDisplayedText((prev) => prev + chunk)
          } else {
            bufferRef.current += chunk
            if (!isStreaming && !isPaused) {
              setIsStreaming(true)
            }
          }
        },
        setText: (text: string) => {
          bufferRef.current = ""
          setDisplayedText(text)
          setIsStreaming(false)
        },
        flush: () => {
          if (bufferRef.current.length > 0) {
            setDisplayedText((prev) => prev + bufferRef.current)
            bufferRef.current = ""
          }
          setIsStreaming(false)
          onComplete?.()
        },
        pause: () => {
          setIsPaused(true)
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
        },
        resume: () => {
          setIsPaused(false)
          if (bufferRef.current.length > 0) {
            setIsStreaming(true)
          }
        },
        clear: () => {
          bufferRef.current = ""
          setDisplayedText("")
          setIsStreaming(false)
        },
        isPaused,
        text: displayedText,
      }),
      [displayedText, isPaused, isStreaming, mode, onComplete]
    )

    return (
      <div
        className={cn("streaming-typewriter whitespace-pre-wrap", className)}
        {...props}
      >
        {displayedText}
        {showCursor && (isStreaming || bufferRef.current.length > 0) && (
          <span
            className={cn(
              "streaming-cursor inline-block ml-0.5",
              "animate-pulse text-primary"
            )}
            aria-hidden="true"
          >
            {cursorChar}
          </span>
        )}
        {children}
      </div>
    )
  }
)
StreamingTypewriter.displayName = "StreamingTypewriter"

// Hook for managing streaming text
export function useStreamingText(_options?: Partial<StreamingTypewriterProps>) {
  const ref = React.useRef<StreamingTypewriterRef>(null)
  const [text, setText] = React.useState("")

  const append = React.useCallback((chunk: string) => {
    ref.current?.append(chunk)
  }, [])

  const flush = React.useCallback(() => {
    ref.current?.flush()
  }, [])

  const clear = React.useCallback(() => {
    ref.current?.clear()
    setText("")
  }, [])

  const pause = React.useCallback(() => {
    ref.current?.pause()
  }, [])

  const resume = React.useCallback(() => {
    ref.current?.resume()
  }, [])

  return {
    ref,
    text,
    append,
    flush,
    clear,
    pause,
    resume,
    isPaused: ref.current?.isPaused ?? false,
  }
}

export { StreamingTypewriter }
