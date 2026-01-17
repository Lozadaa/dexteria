# SearchInput Component - AI Documentation

## Overview
Search input with icon, keyboard shortcut hint, loading state, and clear button.

## Import
```tsx
import { SearchInput } from 'adnia-ui';
```

## Props Interface
```tsx
interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  shortcut?: string;                     // e.g., "mod+f" - shows hint and registers handler
  loading?: boolean;                     // Show spinner instead of clear/shortcut
  onClear?: () => void;                  // Called when clear button clicked
  onSubmit?: () => void;                 // Called on Enter key
}
```

## Usage Examples

### Basic Search
```tsx
const [query, setQuery] = useState('');

<SearchInput
  value={query}
  onChange={setQuery}
  placeholder="Search..."
/>
```

### With Keyboard Shortcut
```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  shortcut="mod+f"
  placeholder="Search (⌘F)"
/>
```

When the shortcut is pressed, the input automatically focuses.

### With Loading State
```tsx
const [query, setQuery] = useState('');
const [loading, setLoading] = useState(false);

const handleSearch = async (value: string) => {
  setQuery(value);
  setLoading(true);
  await searchAPI(value);
  setLoading(false);
};

<SearchInput
  value={query}
  onChange={handleSearch}
  loading={loading}
/>
```

### With Submit Handler
```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  onSubmit={() => performSearch(query)}
  placeholder="Press Enter to search"
/>
```

### With Clear Callback
```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  onClear={() => {
    setQuery('');
    clearResults();
  }}
/>
```

### Command Palette Style
```tsx
function CommandSearch() {
  const [query, setQuery] = useState('');
  const results = useSearch(query);

  return (
    <div>
      <SearchInput
        value={query}
        onChange={setQuery}
        shortcut="mod+k"
        placeholder="Search commands..."
        autoFocus
      />
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Filter Pattern
```tsx
function FilterableList({ items }) {
  const [filter, setFilter] = useState('');

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Filter items..."
      />
      <ListView
        items={filteredItems}
        emptyState={<p>No matches found</p>}
        // ...
      />
    </div>
  );
}
```

## UI States
| State | Right Side Display |
|-------|-------------------|
| Empty + shortcut | Keyboard shortcut hint (Kbd) |
| Has value | Clear button (X) |
| Loading | Spinner |
| Empty, no shortcut | Nothing |

## Styling Notes
- Search icon on left
- Height: `h-9` (36px)
- Clear button has `cursor-pointer`
- Focus ring on input
- Shortcut hint uses `Kbd` component

## Related Components
- `Input` - Plain text input
- `CommandPalette` - Full command search interface

## Keyboard Behavior
- **Enter**: Calls `onSubmit` if provided
- **Escape**: Blurs the input
- **Shortcut (e.g., Cmd+F)**: Focuses the input

## Best Practices
1. Debounce `onChange` for API searches
2. Show loading state during async operations
3. Use `onSubmit` for explicit search actions
4. Consider `shortcut` for frequently used searches
