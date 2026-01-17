# Popover Component - AI Documentation

## Overview
Floating content container using Radix UI. For interactive content (forms, menus, etc.) that appears on click.

## Import
```tsx
// Convenience wrapper
import { Popover } from 'adnia-ui';

// Primitives for custom usage
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor
} from 'adnia-ui';
```

## Props Interface

### Popover (Convenience Wrapper)
```tsx
interface PopoverProps {
  children: React.ReactNode;    // Popover content
  trigger: React.ReactNode;     // Trigger element
  open?: boolean;               // Controlled open state
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;          // Distance from trigger (default: 4)
  className?: string;           // Applied to content
}
```

## Usage Examples

### Using Convenience Wrapper
```tsx
<Popover
  trigger={<Button variant="outline">Open Popover</Button>}
  side="bottom"
  align="start"
>
  <div className="space-y-2">
    <h4 className="font-medium">Settings</h4>
    <Input placeholder="Name" />
    <Button size="sm">Save</Button>
  </div>
</Popover>
```

### Controlled State
```tsx
const [open, setOpen] = useState(false);

<Popover
  open={open}
  onOpenChange={setOpen}
  trigger={<Button>Options</Button>}
>
  <p>Popover content</p>
  <Button onClick={() => setOpen(false)}>Close</Button>
</Popover>
```

### Using Primitives
```tsx
<PopoverRoot>
  <PopoverTrigger asChild>
    <Button variant="outline">Click me</Button>
  </PopoverTrigger>
  <PopoverContent side="right" align="start">
    <div className="w-64">
      <h4 className="font-medium mb-2">Custom Popover</h4>
      <p className="text-sm text-muted-foreground">
        Full control over structure
      </p>
    </div>
  </PopoverContent>
</PopoverRoot>
```

### Date Picker Example
```tsx
<Popover
  trigger={
    <Button variant="outline">
      {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
    </Button>
  }
>
  <Calendar
    selected={selectedDate}
    onSelect={setSelectedDate}
  />
</Popover>
```

### Color Picker Example
```tsx
<Popover
  trigger={
    <button
      className="w-8 h-8 rounded border"
      style={{ backgroundColor: color }}
    />
  }
>
  <div className="grid grid-cols-5 gap-1">
    {colors.map(c => (
      <button
        key={c}
        className="w-6 h-6 rounded"
        style={{ backgroundColor: c }}
        onClick={() => setColor(c)}
      />
    ))}
  </div>
</Popover>
```

## Positioning
| Side | Align | Result |
|------|-------|--------|
| `bottom` | `start` | Below, left-aligned |
| `bottom` | `center` | Below, centered |
| `bottom` | `end` | Below, right-aligned |
| `right` | `start` | Right side, top-aligned |
| `top` | `center` | Above, centered |

## Styling Notes
- Default width: `w-72` (288px)
- Border and shadow for depth
- Rounded corners
- Animated entry/exit
- Padding: `p-4`

## vs Tooltip vs Dialog
| Component | Trigger | Content | Use Case |
|-----------|---------|---------|----------|
| Tooltip | Hover | Read-only | Hints, labels |
| Popover | Click | Interactive | Small forms, pickers |
| Dialog | Click | Complex | Full forms, confirmations |

## Related Components
- `Tooltip` - For hover-based hints
- `Dialog` - For larger modal content
- `DropdownMenu` - For menu selections

## Accessibility
- Focus trapped inside when open
- Escape closes popover
- Click outside closes popover
- Returns focus to trigger on close
