# VirtualList Component - AI Documentation

## Overview
Virtualized list for rendering large datasets efficiently. Only renders visible items using `@tanstack/react-virtual`.

## Import
```tsx
import { VirtualList } from 'adnia-ui';
```

## Props Interface
```tsx
interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;                     // Fixed height per item (required)
  height?: number | string;               // Container height (default: 400)
  overscan?: number;                      // Extra items to render (default: 5)
  className?: string;
}
```

## Usage Examples

### Basic Virtual List
```tsx
const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
}));

<VirtualList
  items={items}
  itemHeight={40}
  height={500}
  renderItem={(item) => (
    <div className="px-4 py-2 border-b">
      {item.name}
    </div>
  )}
/>
```

### Full Height Container
```tsx
<div className="h-[600px]">
  <VirtualList
    items={largeDataset}
    itemHeight={50}
    height="100%"
    renderItem={(item, index) => (
      <div className={cn(
        "px-4 py-3 flex items-center",
        index % 2 === 0 && "bg-muted/50"
      )}>
        <span className="w-12 text-muted-foreground">{index}</span>
        <span>{item.name}</span>
      </div>
    )}
  />
</div>
```

### Log Viewer
```tsx
function LogViewer({ logs }) {
  return (
    <VirtualList
      items={logs}
      itemHeight={24}
      height={400}
      overscan={10}
      renderItem={(log) => (
        <div className={cn(
          "px-2 font-mono text-xs",
          log.level === 'error' && "text-red-500 bg-red-500/10",
          log.level === 'warn' && "text-yellow-500",
          log.level === 'info' && "text-blue-500"
        )}>
          [{log.timestamp}] {log.message}
        </div>
      )}
    />
  );
}
```

### With Selection
```tsx
function SelectableVirtualList({ items }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <VirtualList
      items={items}
      itemHeight={40}
      height={500}
      renderItem={(item) => (
        <div
          onClick={() => setSelected(item.id)}
          className={cn(
            "px-4 py-2 cursor-pointer hover:bg-accent/50",
            selected === item.id && "bg-accent"
          )}
        >
          {item.name}
        </div>
      )}
    />
  );
}
```

### Table-like Layout
```tsx
<VirtualList
  items={tableData}
  itemHeight={48}
  height={600}
  renderItem={(row) => (
    <div className="flex items-center border-b">
      <div className="w-1/4 px-4">{row.name}</div>
      <div className="w-1/4 px-4">{row.email}</div>
      <div className="w-1/4 px-4">{row.role}</div>
      <div className="w-1/4 px-4">{row.status}</div>
    </div>
  )}
/>
```

## Performance Notes

### When to Use
- Lists with 100+ items
- Items that are expensive to render
- When you need smooth scrolling with large datasets

### When NOT to Use
- Small lists (< 100 items)
- Variable height items (consider alternatives)
- When you need DOM access to all items

### Best Practices
1. **Fixed height required**: All items must have same height
2. **Keep items simple**: Complex items slow down rendering
3. **Memoize render function**: Prevent unnecessary re-renders
4. **Use overscan**: Helps with smooth scrolling

```tsx
// Good: Memoized render
const renderItem = useCallback((item) => (
  <ItemComponent item={item} />
), []);

<VirtualList items={items} renderItem={renderItem} />
```

## Styling Notes
- Container has `overflow-auto`
- Items are absolutely positioned
- Scrollbar is native
- Add `className` for custom container styles

## Related Components
- `ListView` - For smaller lists with selection
- `TreeView` - For hierarchical data (not virtualized)

## Limitations
1. Fixed item height only
2. No built-in selection (implement in renderItem)
3. No built-in keyboard navigation
4. Items must not change height dynamically
