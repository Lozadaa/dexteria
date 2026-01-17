# NotificationBadge Component - AI Documentation

## Overview
Positioned badge for showing notification counts on icons or buttons.

## Import
```tsx
import { NotificationBadge } from 'adnia-ui';
```

## Props Interface
```tsx
interface NotificationBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count?: number;
  max?: number;                   // Max before showing "99+" (default: 99)
  showZero?: boolean;             // Show badge when count is 0
  dot?: boolean;                  // Show dot instead of count
  variant?: 'default' | 'destructive' | 'success';
}
```

## Usage Examples

### Basic Count
```tsx
<div className="relative">
  <BellIcon className="h-6 w-6" />
  <NotificationBadge count={5} />
</div>
```

### Dot Indicator (No Count)
```tsx
<div className="relative">
  <MailIcon className="h-6 w-6" />
  <NotificationBadge dot />
</div>
```

### Max Count
```tsx
// Shows "99+" when count exceeds max
<NotificationBadge count={150} max={99} />
```

### Custom Max
```tsx
<NotificationBadge count={15} max={9} />  // Shows "9+"
```

### With Button
```tsx
<Button variant="outline" className="relative">
  <InboxIcon className="h-4 w-4" />
  Messages
  <NotificationBadge count={3} className="absolute -top-2 -right-2" />
</Button>
```

### Variants
```tsx
<NotificationBadge count={3} variant="default" />      // Primary color
<NotificationBadge count={5} variant="destructive" />  // Red
<NotificationBadge count={2} variant="success" />      // Green
```

### Show Zero
```tsx
// Normally hidden when count is 0
<NotificationBadge count={0} />             // Hidden

// Force show even when 0
<NotificationBadge count={0} showZero />    // Shows "0"
```

### In Sidebar
```tsx
<SidebarItem
  icon={
    <div className="relative">
      <InboxIcon className="h-4 w-4" />
      <NotificationBadge count={unreadCount} className="absolute -top-1 -right-1" />
    </div>
  }
  label="Inbox"
/>
```

### Tab with Badge
```tsx
const tabs = [
  {
    id: 'messages',
    label: (
      <span className="flex items-center gap-2">
        Messages
        {unreadCount > 0 && (
          <NotificationBadge count={unreadCount} />
        )}
      </span>
    ),
  },
  // ...
];
```

### Real-time Updates
```tsx
function NotificationIcon() {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <BellIcon className="h-5 w-5" />
      {unreadCount > 0 && (
        <NotificationBadge count={unreadCount} />
      )}
    </div>
  );
}
```

## Positioning
Badge is absolutely positioned by default. Common patterns:

```tsx
// Top-right corner
<div className="relative inline-block">
  <Icon />
  <NotificationBadge className="absolute -top-1 -right-1" count={5} />
</div>

// Top-right but not overlapping
<div className="relative inline-block">
  <Icon />
  <NotificationBadge className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2" count={5} />
</div>
```

## Styling Notes
- Small rounded pill shape
- Minimum width to maintain circle shape
- Font size: `text-xs`
- Font weight: `font-medium`
- Positioned absolutely (needs relative parent)

## Related Components
- `Badge` - Inline badge labels
- `SidebarItem` - Has built-in badge prop

## Best Practices
1. Keep parent `position: relative`
2. Use `dot` for binary state (has/doesn't have)
3. Use meaningful `max` value
4. Hide badge when count is 0 (default behavior)
5. Use `destructive` variant for errors
