# Input Component - AI Documentation

## Overview
Standard text input field with consistent styling across themes.

## Import
```tsx
import { Input } from 'adnia-ui';
```

## Props Interface
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // All standard HTML input attributes supported
}
```

## Usage Examples

### Basic
```tsx
<Input placeholder="Enter text..." />
<Input type="email" placeholder="email@example.com" />
<Input type="password" placeholder="Password" />
```

### With Label
```tsx
<div className="space-y-2">
  <label htmlFor="name" className="text-sm font-medium">Name</label>
  <Input id="name" placeholder="John Doe" />
</div>
```

### Disabled
```tsx
<Input disabled placeholder="Cannot edit" />
```

### With Error State
```tsx
<Input className="border-destructive" placeholder="Invalid input" />
<p className="text-sm text-destructive">This field is required</p>
```

### File Input
```tsx
<Input type="file" />
```

## Styling Notes
- Height: `h-10` (40px)
- Border radius: `rounded-md`
- Focus: Ring with `ring-ring` color
- Disabled: `cursor-not-allowed opacity-50`
- File input has special styling for the button part

## Related Components
- `Textarea` - For multi-line text
- `SearchInput` - For search with icon and shortcuts

## Common Patterns

### Form Field
```tsx
<div className="grid gap-4">
  <div className="space-y-2">
    <label>Email</label>
    <Input type="email" required />
  </div>
  <div className="space-y-2">
    <label>Password</label>
    <Input type="password" required />
  </div>
</div>
```

### With Icon (manual)
```tsx
<div className="relative">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search..." />
</div>
```
