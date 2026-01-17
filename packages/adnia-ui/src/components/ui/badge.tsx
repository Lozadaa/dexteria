import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
                success: "border-transparent bg-green-600 text-white hover:bg-green-700",
                warning: "border-transparent bg-amber-500 text-white hover:bg-amber-600",
                // Soft variants with transparent backgrounds and borders (Dexteria style)
                "success-soft": "bg-green-500/10 border-green-500/20 text-green-400",
                "warning-soft": "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
                "danger-soft": "bg-red-500/10 border-red-500/20 text-red-400",
                "info-soft": "bg-blue-500/10 border-blue-500/20 text-blue-400",
                // Muted variant for default/neutral states
                "muted": "bg-muted/30 border-border text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
