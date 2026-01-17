# Dropdown Menu Component - AI Documentation

## Overview
Dropdown menu using Radix UI with support for keyboard shortcuts, checkboxes, radio groups, and submenus.

## Import
```tsx
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from 'adnia-ui';
```

## Props Interface

### DropdownMenuItem
```tsx
interface DropdownMenuItemProps {
  inset?: boolean;           // Add left padding (for alignment without icons)
  shortcut?: string;         // Keyboard shortcut to display
  destructive?: boolean;     // Red color for dangerous actions
  disabled?: boolean;
  onSelect?: () => void;
}
```

## Usage Examples

### Basic Menu
```tsx
<DropdownMenuRoot>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={() => {}}>New File</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => {}}>Open</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem shortcut="mod+s">Save</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

### With Labels and Groups
```tsx
<DropdownMenuContent>
  <DropdownMenuLabel>File</DropdownMenuLabel>
  <DropdownMenuItem>New</DropdownMenuItem>
  <DropdownMenuItem>Open</DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuLabel>Edit</DropdownMenuLabel>
  <DropdownMenuItem shortcut="mod+z">Undo</DropdownMenuItem>
  <DropdownMenuItem shortcut="mod+y">Redo</DropdownMenuItem>
</DropdownMenuContent>
```

### Destructive Items
```tsx
<DropdownMenuContent>
  <DropdownMenuItem>Edit</DropdownMenuItem>
  <DropdownMenuItem>Duplicate</DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem destructive shortcut="del">
    Delete
  </DropdownMenuItem>
</DropdownMenuContent>
```

### Checkbox Items
```tsx
const [showHidden, setShowHidden] = useState(false);

<DropdownMenuContent>
  <DropdownMenuCheckboxItem
    checked={showHidden}
    onCheckedChange={setShowHidden}
  >
    Show Hidden Files
  </DropdownMenuCheckboxItem>
</DropdownMenuContent>
```

### Radio Group
```tsx
const [sort, setSort] = useState('name');

<DropdownMenuContent>
  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
  <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
    <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
    <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
    <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>
</DropdownMenuContent>
```

### Submenu
```tsx
<DropdownMenuContent>
  <DropdownMenuItem>Cut</DropdownMenuItem>
  <DropdownMenuItem>Copy</DropdownMenuItem>
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      <DropdownMenuItem>Option 1</DropdownMenuItem>
      <DropdownMenuItem>Option 2</DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>
</DropdownMenuContent>
```

## Styling Notes
- All items have `cursor-pointer`
- Hover state: `bg-accent`
- Destructive: `text-destructive`
- Shortcuts shown with `Kbd` component
- Animated entry/exit

## Related Components
- `ContextMenu` - Same API but for right-click
- `CommandPalette` - For searchable commands

## Accessibility
- Full keyboard navigation (arrows, enter, escape)
- Type-ahead search
- Focus management
