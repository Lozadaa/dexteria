# Skeleton Component - AI Documentation

## Overview
Loading placeholder that mimics content shape. Used for progressive loading states.

## Import
```tsx
import { Skeleton } from 'adnia-ui';
```

## Props Interface
```tsx
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  // Standard div props
  // Control shape via className (w-*, h-*, rounded-*)
}
```

## Usage Examples

### Basic Shapes
```tsx
// Rectangle
<Skeleton className="h-4 w-32" />

// Square
<Skeleton className="h-12 w-12" />

// Circle (avatar)
<Skeleton className="h-10 w-10 rounded-full" />

// Full width
<Skeleton className="h-4 w-full" />
```

### Text Lines
```tsx
<div className="space-y-2">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
</div>
```

### Card Skeleton
```tsx
function CardSkeleton() {
  return (
    <Card className="p-4 space-y-4">
      <Skeleton className="h-32 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  );
}
```

### List Item Skeleton
```tsx
function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
```

### Table Skeleton
```tsx
function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
```

### Profile Skeleton
```tsx
function ProfileSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
```

### Conditional Loading
```tsx
function UserProfile({ user, loading }) {
  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="flex items-start gap-4">
      <Avatar src={user.avatar} />
      <div>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </div>
    </div>
  );
}
```

### Grid Skeleton
```tsx
function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  );
}
```

## Styling Notes
- Background: `bg-muted`
- Pulse animation (`animate-pulse`)
- Use Tailwind width/height utilities
- Round with `rounded-*` utilities
- Matches component dimensions

## Related Components
- `Spinner` - For action-based loading
- `ProgressBar` - For measurable progress

## Best Practices
1. Match skeleton shape to actual content
2. Use consistent spacing as actual content
3. Keep skeletons simple (don't over-detail)
4. Use multiple skeletons for lists
5. Transition smoothly to loaded content
