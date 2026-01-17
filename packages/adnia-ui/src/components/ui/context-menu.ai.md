# ContextMenu Component - AI Documentation

## Overview
Right-click context menu using Radix UI. Same API as DropdownMenu but triggered by right-click.

## Import
```tsx
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent
} from 'adnia-ui';
```

## Props Interface

### ContextMenuItem
```tsx
interface ContextMenuItemProps {
  inset?: boolean;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}
```

## Usage Examples

### Basic File Context Menu
```tsx
<ContextMenuRoot>
  <ContextMenuTrigger>
    <div className="p-4 border rounded">
      Right-click me
    </div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem shortcut="mod+c">Copy</ContextMenuItem>
    <ContextMenuItem shortcut="mod+v">Paste</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>Rename</ContextMenuItem>
    <ContextMenuItem destructive>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenuRoot>
```

### File Explorer Style
```tsx
<ContextMenuRoot>
  <ContextMenuTrigger>
    <FileItem name="document.txt" />
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Open</ContextMenuItem>
    <ContextMenuItem>Open With...</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuLabel>Actions</ContextMenuLabel>
    <ContextMenuItem shortcut="mod+c">Copy</ContextMenuItem>
    <ContextMenuItem shortcut="mod+x">Cut</ContextMenuItem>
    <ContextMenuItem>Duplicate</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem destructive shortcut="del">
      Move to Trash
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenuRoot>
```

### With State Actions
```tsx
function FileList({ files }) {
  const [selectedFile, setSelectedFile] = useState(null);

  return files.map(file => (
    <ContextMenuRoot key={file.id}>
      <ContextMenuTrigger>
        <div onClick={() => setSelectedFile(file)}>
          {file.name}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => openFile(file)}>
          Open
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => copyFile(file)}>
          Copy
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          destructive
          onSelect={() => deleteFile(file)}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>
  ));
}
```

### Submenu Example
```tsx
<ContextMenuContent>
  <ContextMenuItem>View</ContextMenuItem>
  <ContextMenuSub>
    <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
    <ContextMenuSubContent>
      <ContextMenuItem>Email</ContextMenuItem>
      <ContextMenuItem>Link</ContextMenuItem>
      <ContextMenuItem>Export</ContextMenuItem>
    </ContextMenuSubContent>
  </ContextMenuSub>
</ContextMenuContent>
```

## Key Differences from DropdownMenu
| Feature | DropdownMenu | ContextMenu |
|---------|--------------|-------------|
| Trigger | Click on trigger | Right-click on area |
| Trigger element | Button/icon | Container/area |
| Use case | Action menus | Item-specific actions |

## Styling Notes
- Same styles as DropdownMenu
- All items have `cursor-pointer`
- Menu appears at cursor position

## Related Components
- `DropdownMenu` - For click-triggered menus

## Best Practices
1. Keep context menus relevant to the right-clicked item
2. Put most common actions first
3. Use separators to group related actions
4. Reserve destructive styling for dangerous actions
5. Include keyboard shortcuts for power users
