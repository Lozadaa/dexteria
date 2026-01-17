# CommandPalette Component - AI Documentation

## Overview
Cmd+K style command palette using cmdk library. Provides searchable command interface with keyboard shortcuts.

## Import
```tsx
import {
  CommandPalette,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  useCommandPalette
} from 'adnia-ui';

// Lower-level primitives
import {
  CommandRoot,
  CommandInput,
  CommandList,
  CommandEmpty
} from 'adnia-ui';
```

## Props Interface

### CommandPalette (Main Wrapper)
```tsx
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;        // Default: "Type a command or search..."
  emptyMessage?: string;       // Default: "No results found."
  children: React.ReactNode;   // CommandGroup elements
}
```

### CommandItem
```tsx
interface CommandItemProps {
  onSelect?: () => void;
  shortcut?: string;           // Keyboard shortcut to display
  disabled?: boolean;
  value?: string;              // Search value (defaults to text content)
}
```

### useCommandPalette Hook
```tsx
function useCommandPalette(
  shortcut?: string  // Default: "mod+k"
): [boolean, React.Dispatch<React.SetStateAction<boolean>>];
```

## Usage Examples

### Basic with Hook
```tsx
function App() {
  const [open, setOpen] = useCommandPalette('mod+k');

  return (
    <>
      <p>Press ⌘K to open</p>
      <CommandPalette open={open} onOpenChange={setOpen}>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => newFile()} shortcut="mod+n">
            New File
          </CommandItem>
          <CommandItem onSelect={() => openFile()} shortcut="mod+o">
            Open File
          </CommandItem>
          <CommandItem onSelect={() => save()} shortcut="mod+s">
            Save
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate('/dashboard')}>
            Go to Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate('/settings')}>
            Go to Settings
          </CommandItem>
        </CommandGroup>
      </CommandPalette>
    </>
  );
}
```

### Manual Control
```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>
  Open Command Palette
</Button>
<CommandPalette open={open} onOpenChange={setOpen}>
  {/* ... */}
</CommandPalette>
```

### Custom Search Placeholder
```tsx
<CommandPalette
  open={open}
  onOpenChange={setOpen}
  placeholder="Search files..."
  emptyMessage="No files found."
>
  {files.map(file => (
    <CommandItem key={file.id} onSelect={() => openFile(file)}>
      {file.name}
    </CommandItem>
  ))}
</CommandPalette>
```

### With Icons
```tsx
<CommandGroup heading="Actions">
  <CommandItem onSelect={handleNew}>
    <PlusIcon className="mr-2 h-4 w-4" />
    New File
  </CommandItem>
  <CommandItem onSelect={handleOpen}>
    <FolderIcon className="mr-2 h-4 w-4" />
    Open File
  </CommandItem>
</CommandGroup>
```

### Dynamic Commands
```tsx
function CommandPaletteWithSearch() {
  const [open, setOpen] = useCommandPalette();
  const [query, setQuery] = useState('');
  const results = useSearch(query);

  return (
    <CommandPalette open={open} onOpenChange={setOpen}>
      <CommandGroup heading="Search Results">
        {results.map(result => (
          <CommandItem key={result.id} onSelect={() => selectResult(result)}>
            {result.title}
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandPalette>
  );
}
```

## Features
- **Fuzzy search**: Built-in search filters items automatically
- **Keyboard navigation**: Arrow keys, Enter to select, Escape to close
- **Groups**: Organize commands into categories
- **Shortcuts**: Display keyboard shortcuts with Kbd
- **Custom trigger**: Use any shortcut with useCommandPalette hook

## Styling Notes
- Appears as dialog overlay
- Search input at top
- Scrollable list
- Highlighted items on hover/keyboard focus
- Items have `cursor-pointer`

## Related Components
- `Dialog` - Underlying dialog component
- `SearchInput` - Standalone search input
- `Kbd` - Keyboard shortcut display

## Best Practices
1. Group related commands together
2. Put most-used commands first
3. Include shortcuts for common actions
4. Keep command names short and action-oriented
5. Close palette after command execution
