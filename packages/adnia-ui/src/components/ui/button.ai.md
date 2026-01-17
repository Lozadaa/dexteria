# Button Component - AI Documentation

## Overview
Primary action button with multiple variants and sizes. Uses `class-variance-authority` for variant management.

## Import
```tsx
import { Button, buttonVariants } from 'adnia-ui';
```

## Props Interface
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
           | 'success' | 'warning' | 'danger'
           | 'success-soft' | 'warning-soft' | 'danger-soft';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';
  asChild?: boolean;
}
```

## Variants Explained
| Variant | Use Case |
|---------|----------|
| `default` | Primary actions |
| `destructive` | Delete, remove actions |
| `outline` | Secondary actions with border |
| `secondary` | Less prominent actions |
| `ghost` | Minimal visual weight |
| `link` | Text link style |
| `success` | Confirm, approve actions |
| `warning` | Caution actions |
| `danger` | Same as destructive |
| `*-soft` | Muted colored backgrounds |

## Usage Examples

### Basic
```tsx
<Button>Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
```

### Sizes
```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>
```

### With Icons
```tsx
<Button>
  <PlusIcon className="mr-2 h-4 w-4" />
  Add Item
</Button>
```

### Loading State
```tsx
<Button disabled>
  <Spinner className="mr-2" />
  Loading...
</Button>
```

### As Link (with asChild)
```tsx
<Button asChild>
  <a href="/page">Go to page</a>
</Button>
```

## Styling Notes
- Has `cursor-pointer` by default
- `disabled:cursor-not-allowed disabled:opacity-50` when disabled
- Focus ring for accessibility
- All variants support dark mode automatically

## Related Components
- `IconButton` - For icon-only buttons
- `ToolbarButton` - For toolbar actions

## Common Patterns

### Button Group
```tsx
<div className="flex gap-2">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>
```

### Destructive Confirmation
```tsx
<Button variant="destructive" onClick={handleDelete}>
  Delete Account
</Button>
```
