# Tooltip Component - AI Documentation

## Overview
Hover tooltip using Radix UI. Supports keyboard shortcuts display.

## Import
```tsx
import { Tooltip, TooltipProvider } from 'adnia-ui';
```

## Props Interface
```tsx
interface TooltipProps {
  children: React.ReactNode;      // Trigger element
  content: React.ReactNode;       // Tooltip content
  shortcut?: string;              // Optional keyboard shortcut (e.g., "mod+s")
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;         // ms before showing (default: 200)
}
```

## Usage Examples

### Basic
```tsx
<TooltipProvider>
  <Tooltip content="Save your work">
    <Button>Save</Button>
  </Tooltip>
</TooltipProvider>
```

### With Shortcut
```tsx
<Tooltip content="Save" shortcut="mod+s">
  <Button>💾</Button>
</Tooltip>
```

### Positioning
```tsx
<Tooltip content="Info" side="right" align="start">
  <InfoIcon />
</Tooltip>
```

### Custom Delay
```tsx
<TooltipProvider delayDuration={0}>
  <Tooltip content="Instant tooltip">
    <Button>Hover me</Button>
  </Tooltip>
</TooltipProvider>
```

## Important Notes

### TooltipProvider Required
You must wrap tooltips in a `TooltipProvider`. Typically done once at app root or in layout components that use tooltips.

```tsx
// In Sidebar, Toolbar, etc.
<TooltipProvider delayDuration={300}>
  {/* Tooltips work here */}
</TooltipProvider>
```

### Trigger Must Accept Ref
The trigger element must be able to receive a ref (native elements or forwardRef components).

```tsx
// ✅ Works
<Tooltip content="..."><button>Click</button></Tooltip>
<Tooltip content="..."><Button>Click</Button></Tooltip>

// ❌ Won't work (no ref)
<Tooltip content="..."><MyComponent /></Tooltip>
```

## Styling Notes
- Dark background: `bg-popover`
- Small text: `text-sm`
- Rounded: `rounded-md`
- Shadow for depth
- Fade in/out animation

## Related Components
- `Kbd` - Used internally for shortcut display
- `Popover` - For interactive floating content
- `ToolbarButton` - Has built-in tooltip prop
