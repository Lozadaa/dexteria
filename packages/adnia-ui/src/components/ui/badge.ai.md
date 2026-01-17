# Badge Component - AI Documentation

## Overview
Small label/status badge with multiple color variants.

## Import
```tsx
import { Badge, badgeVariants } from 'adnia-ui';
```

## Props Interface
```tsx
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}
```

## Variants
| Variant | Color | Use Case |
|---------|-------|----------|
| `default` | Primary blue | Default status |
| `secondary` | Gray | Neutral info |
| `destructive` | Red | Errors, critical |
| `outline` | Border only | Subtle labels |
| `success` | Green | Success states |
| `warning` | Yellow | Warnings |

## Usage Examples

### Basic
```tsx
<Badge>New</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
```

### With Icon
```tsx
<Badge>
  <CheckIcon className="mr-1 h-3 w-3" />
  Verified
</Badge>
```

### Status Indicators
```tsx
<Badge variant="success">Online</Badge>
<Badge variant="secondary">Offline</Badge>
<Badge variant="warning">Away</Badge>
```

## Styling Notes
- Rounded full: `rounded-full`
- Small text: `text-xs`
- Padding: `px-2.5 py-0.5`
- Font weight: `font-semibold`
- Has hover states

## Related Components
- `NotificationBadge` - For numeric counts with positioning

## Common Patterns

### In Lists
```tsx
<div className="flex items-center justify-between">
  <span>Feature Request</span>
  <Badge variant="warning">In Progress</Badge>
</div>
```

### Multiple Badges
```tsx
<div className="flex gap-1">
  <Badge variant="secondary">React</Badge>
  <Badge variant="secondary">TypeScript</Badge>
  <Badge variant="secondary">Tailwind</Badge>
</div>
```

### With Count
```tsx
<Badge variant="destructive">3 errors</Badge>
```
