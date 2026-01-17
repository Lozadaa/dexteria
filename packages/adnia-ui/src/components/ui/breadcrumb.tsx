import * as React from "react"
import { cn } from "../../lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  onClick?: () => void
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  maxItems?: number
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      className,
      items,
      separator,
      maxItems = 0,
      ...props
    },
    ref
  ) => {
    const defaultSeparator = (
      <svg
        className="h-4 w-4 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    )

    let displayItems = items

    if (maxItems > 0 && items.length > maxItems) {
      // Show first, ellipsis, and last (maxItems - 1) items
      const firstItem = items[0]
      const lastItems = items.slice(-(maxItems - 1))
      displayItems = [firstItem, { label: "..." }, ...lastItems]
    }

    return (
      <nav ref={ref} aria-label="Breadcrumb" className={cn("flex items-center", className)} {...props}>
        <ol className="flex items-center gap-1.5">
          {displayItems.map((item, index) => {
            const isLast = index === displayItems.length - 1
            const isEllipsis = item.label === "..."

            return (
              <li key={index} className="flex items-center gap-1.5">
                {isEllipsis ? (
                  <span className="text-sm text-muted-foreground">...</span>
                ) : item.onClick || item.href ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={cn(
                      "flex items-center gap-1.5 text-sm transition-colors cursor-pointer",
                      isLast
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm",
                      isLast ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                    <span>{item.label}</span>
                  </span>
                )}
                {!isLast && (
                  <span className="text-muted-foreground">{separator || defaultSeparator}</span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  }
)
Breadcrumb.displayName = "Breadcrumb"

export { Breadcrumb }
