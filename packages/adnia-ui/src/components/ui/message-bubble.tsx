import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const messageBubbleVariants = cva(
  "relative rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed",
  {
    variants: {
      variant: {
        user: "bg-primary text-primary-foreground ml-auto rounded-br-md",
        assistant: "bg-card border border-border text-card-foreground mr-auto rounded-bl-md",
      },
      animate: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "user",
        animate: true,
        className: "animate-slide-in-right",
      },
      {
        variant: "assistant",
        animate: true,
        className: "animate-slide-in-left",
      },
    ],
    defaultVariants: {
      variant: "assistant",
      animate: false,
    },
  }
)

const avatarContainerVariants = cva(
  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
  {
    variants: {
      variant: {
        user: "bg-primary/10 text-primary",
        assistant: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "assistant",
    },
  }
)

export interface MessageBubbleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof messageBubbleVariants> {
  /** Avatar element to display */
  avatar?: React.ReactNode
  /** Whether the message is currently streaming */
  isStreaming?: boolean
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ className, variant, animate, avatar, isStreaming, children, ...props }, ref) => {
    const isUser = variant === "user"

    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3 w-full",
          isUser ? "flex-row-reverse" : "flex-row",
          className
        )}
        {...props}
      >
        {avatar && (
          <div className={cn(avatarContainerVariants({ variant }))}>
            {avatar}
          </div>
        )}
        <div className={cn(messageBubbleVariants({ variant, animate }))}>
          {children}
          {isStreaming && (
            <span className="inline-flex ml-1">
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s] mx-0.5" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
            </span>
          )}
        </div>
      </div>
    )
  }
)
MessageBubble.displayName = "MessageBubble"

export { MessageBubble, messageBubbleVariants }
