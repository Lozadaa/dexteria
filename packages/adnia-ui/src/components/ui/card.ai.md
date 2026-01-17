# Card Component - AI Documentation

## Overview
Container component for grouping related content with consistent styling.

## Import
```tsx
import { Card } from 'adnia-ui';
```

## Props Interface
```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  // All standard div attributes
}
```

## Usage Examples

### Basic
```tsx
<Card className="p-6">
  <h3 className="font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card content goes here</p>
</Card>
```

### With Sections
```tsx
<Card>
  <div className="p-6 border-b">
    <h3 className="font-semibold">Header</h3>
  </div>
  <div className="p-6">
    Content
  </div>
  <div className="p-6 border-t bg-muted/50">
    Footer
  </div>
</Card>
```

### Interactive Card
```tsx
<Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
  <h4>Clickable Card</h4>
</Card>
```

## Styling Notes
- Background: `bg-card`
- Border: `border border-border`
- Border radius: `rounded-lg`
- Shadow: `shadow-sm`
- Text color: `text-card-foreground`

## Related Components
- `SectionCard` - Card with header and optional actions
- `StatCard` - Card for displaying statistics

## Common Patterns

### Grid of Cards
```tsx
<div className="grid grid-cols-3 gap-4">
  <Card className="p-4">Card 1</Card>
  <Card className="p-4">Card 2</Card>
  <Card className="p-4">Card 3</Card>
</div>
```

### Card with Actions
```tsx
<Card className="p-4">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold">Title</h3>
      <p className="text-sm text-muted-foreground">Description</p>
    </div>
    <Button size="sm">Action</Button>
  </div>
</Card>
```
