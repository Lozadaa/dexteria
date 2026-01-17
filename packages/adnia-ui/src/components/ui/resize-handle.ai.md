# ResizeHandle Component - AI Documentation

## Overview
Draggable handle for resizing panels. Used internally by SplitView, Sidebar, and BottomPanel.

## Import
```tsx
import { ResizeHandle } from 'adnia-ui';
```

## Props Interface
```tsx
interface ResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;      // Called with px change
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}
```

## Usage Examples

### Horizontal Resize (Left/Right)
```tsx
const [width, setWidth] = useState(300);

<div className="flex">
  <div style={{ width }}>
    Left Panel
  </div>
  <ResizeHandle
    direction="horizontal"
    onResize={(delta) => setWidth(w => w + delta)}
  />
  <div className="flex-1">
    Right Panel
  </div>
</div>
```

### Vertical Resize (Top/Bottom)
```tsx
const [height, setHeight] = useState(200);

<div className="flex flex-col h-screen">
  <div className="flex-1">
    Main Content
  </div>
  <ResizeHandle
    direction="vertical"
    onResize={(delta) => setHeight(h => h - delta)}
  />
  <div style={{ height }}>
    Bottom Panel
  </div>
</div>
```

### With Constraints
```tsx
<ResizeHandle
  direction="horizontal"
  onResize={(delta) => {
    setWidth(w => Math.min(Math.max(w + delta, MIN_WIDTH), MAX_WIDTH));
  }}
/>
```

### With Callbacks
```tsx
<ResizeHandle
  direction="horizontal"
  onResizeStart={() => setIsResizing(true)}
  onResize={(delta) => setWidth(w => w + delta)}
  onResizeEnd={() => setIsResizing(false)}
/>
```

### Double-Click to Reset
The component automatically calls `onResize(0)` on double-click, which you can use to reset to default:

```tsx
const DEFAULT_WIDTH = 300;
const [width, setWidth] = useState(DEFAULT_WIDTH);

<ResizeHandle
  direction="horizontal"
  onResize={(delta) => {
    if (delta === 0) {
      // Double-click detected
      setWidth(DEFAULT_WIDTH);
    } else {
      setWidth(w => w + delta);
    }
  }}
/>
```

## Cursor Types
| Direction | Cursor |
|-----------|--------|
| `horizontal` | `col-resize` |
| `vertical` | `row-resize` |

## Styling Notes
- Width/height: 4px (thin line)
- Transparent by default
- Hover: Shows `bg-primary/20`
- Dragging: Shows `bg-primary/30`
- Cursor changes to resize cursor

## Related Components
- `SplitView` - Uses ResizeHandle internally
- `Sidebar` - Uses ResizeHandle internally
- `BottomPanel` - Uses ResizeHandle internally

## Best Practices
1. Always constrain with min/max values
2. Use `onResizeStart/End` for visual feedback
3. Consider persistence (localStorage)
4. Double-click to reset is expected UX
