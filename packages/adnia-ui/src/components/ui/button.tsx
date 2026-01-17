import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
                // Action button variants for dashboard-style controls
                success: "bg-green-600 text-white hover:bg-green-700",
                warning: "bg-amber-500 text-white hover:bg-amber-600",
                danger: "bg-red-600 text-white hover:bg-red-700",
                // Softer variants for secondary actions
                "success-soft": "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50",
                "warning-soft": "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
                "danger-soft": "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50",
                // Status indicator buttons with borders (Dexteria style)
                "status-success": "bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20",
                "status-warning": "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20",
                "status-danger": "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20",
                "status-info": "bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
                // Muted button for cancel/secondary actions
                "muted": "bg-muted text-muted-foreground hover:bg-muted/80",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                xs: "h-7 rounded px-2 py-1 text-xs",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
                "icon-sm": "h-8 w-8",
                "icon-xs": "h-6 w-6",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        // Note: asChild functionality not strictly implemented without Slot/Radix, using simple button for now
        const Comp = "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
