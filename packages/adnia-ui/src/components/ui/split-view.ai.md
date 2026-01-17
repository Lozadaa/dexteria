# SplitView Component - AI Documentation

## Overview
Resizable split panel layout. Creates two panes (primary and secondary) with a draggable divider.

## Import
```tsx
import { SplitView } from 'adnia-ui';
```

## Props Interface
```tsx
interface SplitViewProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical';
  defaultSize?: number;        // Initial primary pane size (px)
  minSize?: number;            // Min primary pane size (default: 100)
  maxSize?: number;            // Max primary pane size (default: 80% of container)
  primary?: React.ReactNode;   // Primary pane content
  secondary?: React.ReactNode; // Secondary pane content
  onSizeChange?: (size: number) => void;
}
```

## Usage Examples

### Horizontal Split (Side by Side)
```tsx
<SplitView
  direction="horizontal"
  defaultSize={300}
  primary={<FileTree />}
  secondary={<Editor />}
/>
```

### Vertical Split (Top/Bottom)
```tsx
<SplitView
  direction="vertical"
  defaultSize={400}
  primary={<Editor />}
  secondary={<Terminal />}
/>
```

### Controlled Size
```tsx
const [size, setSize] = useState(250);

<SplitView
  defaultSize={size}
  onSizeChange={setSize}
  primary={<Sidebar />}
  secondary={<Content />}
/>
```

### Nested Splits (IDE Layout)
```tsx
<SplitView
  direction="horizontal"
  defaultSize={250}
  primary={<FileTree />}
  secondary={
    <SplitView
      direction="vertical"
      defaultSize={500}
      primary={<Editor />}
      secondary={<Terminal />}
    />
  }
/>
```

### With Size Constraints
```tsx
<SplitView
  direction="horizontal"
  defaultSize={300}
  minSize={200}
  maxSize={600}
  primary={<Panel />}
  secondary={<Content />}
/>
```

### Three-Column Layout
```tsx
<SplitView
  direction="horizontal"
  defaultSize={200}
  primary={<Navigation />}
  secondary={
    <SplitView
      direction="horizontal"
      defaultSize={400}
      primary={<MainContent />}
      secondary={<PropertiesPanel />}
    />
  }
/>
```

## Features
- **Drag to resize**: Grab divider to change sizes
- **Double-click reset**: Double-click divider to reset to default
- **Min/max constraints**: Prevent too small or too large panes
- **Both directions**: Horizontal or vertical splitting

## Styling Notes
- Uses `ResizeHandle` component for divider
- Divider changes color on hover
- Cursor changes to resize cursor
- Smooth resize interaction

## Related Components
- `ResizeHandle` - Used internally
- `Sidebar` - Alternative for sidebars with collapse
- `BottomPanel` - Alternative for bottom panels

## Layout Patterns

### Editor with Sidebar
```tsx
<div className="h-screen">
  <SplitView
    direction="horizontal"
    defaultSize={250}
    minSize={180}
    maxSize={400}
    primary={<FileExplorer />}
    secondary={<EditorArea />}
  />
</div>
```

### Editor with Terminal
```tsx
<div className="h-screen">
  <SplitView
    direction="vertical"
    defaultSize={300}
    minSize={100}
    primary={<CodeEditor />}
    secondary={<Terminal />}
  />
</div>
```

### Full IDE Layout
```tsx
<div className="flex flex-col h-screen">
  <AppHeader />
  <div className="flex-1">
    <SplitView
      direction="horizontal"
      defaultSize={250}
      primary={<Sidebar />}
      secondary={
        <SplitView
          direction="vertical"
          defaultSize={500}
          primary={
            <div className="flex flex-col h-full">
              <TabGroup tabs={...} />
              <Editor />
            </div>
          }
          secondary={<BottomPanel />}
        />
      }
    />
  </div>
  <StatusBar />
</div>
```
