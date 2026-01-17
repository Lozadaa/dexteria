# ListView Component - AI Documentation

## Overview
Selectable list component with single/multi-select support, keyboard navigation, and customizable rendering.

## Import
```tsx
import { ListView } from 'adnia-ui';
```

## Props Interface
```tsx
interface ListViewProps<T> {
  items: T[];
  renderItem: (item: T, selected: boolean, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  selected?: string | string[];           // Single ID or array for multi
  onSelect?: (id: string | string[]) => void;
  multiSelect?: boolean;
  onItemClick?: (item: T) => void;
  onItemDoubleClick?: (item: T) => void;
  emptyState?: React.ReactNode;
}
```

## Usage Examples

### Basic List
```tsx
interface FileItem {
  id: string;
  name: string;
  size: number;
}

const files: FileItem[] = [...];
const [selected, setSelected] = useState<string | null>(null);

<ListView
  items={files}
  keyExtractor={(file) => file.id}
  selected={selected}
  onSelect={setSelected}
  renderItem={(file, isSelected) => (
    <div className={cn(
      "px-3 py-2",
      isSelected && "bg-accent"
    )}>
      {file.name}
    </div>
  )}
/>
```

### Multi-Select
```tsx
const [selected, setSelected] = useState<string[]>([]);

<ListView
  items={items}
  keyExtractor={(item) => item.id}
  selected={selected}
  onSelect={setSelected}
  multiSelect
  renderItem={(item, isSelected) => (
    <div className={cn("px-3 py-2", isSelected && "bg-accent")}>
      <input type="checkbox" checked={isSelected} readOnly />
      {item.name}
    </div>
  )}
/>
```

### With Double-Click Action
```tsx
<ListView
  items={files}
  keyExtractor={(f) => f.id}
  selected={selected}
  onSelect={setSelected}
  onItemDoubleClick={(file) => openFile(file)}
  renderItem={(file, isSelected) => (
    <div className={cn("px-3 py-2 flex items-center gap-2", isSelected && "bg-accent")}>
      <FileIcon />
      <span>{file.name}</span>
    </div>
  )}
/>
```

### Empty State
```tsx
<ListView
  items={filteredItems}
  keyExtractor={(i) => i.id}
  selected={selected}
  onSelect={setSelected}
  renderItem={...}
  emptyState={
    <div className="p-8 text-center text-muted-foreground">
      No items found
    </div>
  }
/>
```

### File Browser Pattern
```tsx
function FileBrowser({ files }) {
  const [selected, setSelected] = useState<string[]>([]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && selected.length > 0) {
      deleteFiles(selected);
    }
    if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSelected(files.map(f => f.id));
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <ListView
        items={files}
        keyExtractor={(f) => f.id}
        selected={selected}
        onSelect={setSelected}
        multiSelect
        onItemDoubleClick={openFile}
        renderItem={(file, isSelected) => (
          <div className={cn(
            "px-3 py-2 flex items-center gap-3",
            isSelected && "bg-accent"
          )}>
            <FileTypeIcon type={file.type} />
            <span className="flex-1">{file.name}</span>
            <span className="text-sm text-muted-foreground">
              {formatSize(file.size)}
            </span>
          </div>
        )}
      />
    </div>
  );
}
```

## Keyboard Navigation
- **Arrow Up/Down**: Move focus
- **Enter/Space**: Select focused item
- **Home/End**: Jump to first/last
- **Shift+Click**: Range selection (multi-select)
- **Ctrl/Cmd+Click**: Toggle selection (multi-select)

## Styling Notes
- Items have `cursor-pointer`
- Focus ring on keyboard navigation
- Render function controls item appearance
- Container is focusable for keyboard nav

## Related Components
- `TreeView` - For hierarchical data
- `VirtualList` - For very large lists

## Best Practices
1. Use consistent item heights for better UX
2. Implement keyboard shortcuts for power users
3. Show visual feedback for selection
4. Use `emptyState` for empty lists
