# InlineEdit Component - AI Documentation

## Overview
Click-to-edit text field. Shows static text that transforms into an input on click.

## Import
```tsx
import { InlineEdit } from 'adnia-ui';
```

## Props Interface
```tsx
interface InlineEditProps {
  value: string;
  onChange: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;              // Default: "Click to edit..."
  disabled?: boolean;
  selectOnFocus?: boolean;           // Default: true
  submitOnBlur?: boolean;            // Default: true
  submitOnEnter?: boolean;           // Default: true
  cancelOnEscape?: boolean;          // Default: true
}
```

## Usage Examples

### Basic Usage
```tsx
const [name, setName] = useState('My Project');

<InlineEdit
  value={name}
  onChange={setName}
/>
```

### With Validation
```tsx
const [title, setTitle] = useState('Document');
const [error, setError] = useState<string | null>(null);

const handleChange = (value: string) => {
  if (value.trim().length === 0) {
    setError('Title cannot be empty');
    return;
  }
  if (value.length > 50) {
    setError('Title too long');
    return;
  }
  setError(null);
  setTitle(value);
};

<div>
  <InlineEdit value={title} onChange={handleChange} />
  {error && <p className="text-sm text-destructive">{error}</p>}
</div>
```

### In a List Item
```tsx
function EditableListItem({ item, onUpdate }) {
  return (
    <div className="flex items-center gap-3 p-2">
      <Icon />
      <InlineEdit
        value={item.name}
        onChange={(name) => onUpdate({ ...item, name })}
        className="flex-1"
      />
      <Badge>{item.status}</Badge>
    </div>
  );
}
```

### Table Cell
```tsx
function EditableCell({ value, onSave }) {
  return (
    <td className="px-4 py-2">
      <InlineEdit
        value={value}
        onChange={onSave}
        submitOnBlur
      />
    </td>
  );
}
```

### With Cancel Handling
```tsx
const [name, setName] = useState('Original');

<InlineEdit
  value={name}
  onChange={setName}
  onCancel={() => console.log('Edit cancelled')}
  cancelOnEscape
/>
```

### Disabled State
```tsx
<InlineEdit
  value="Read Only"
  onChange={() => {}}
  disabled
/>
```

### File Rename Pattern
```tsx
function FileItem({ file, onRename }) {
  const [isRenaming, setIsRenaming] = useState(false);

  if (isRenaming) {
    return (
      <InlineEdit
        value={file.name}
        onChange={(name) => {
          onRename(file.id, name);
          setIsRenaming(false);
        }}
        onCancel={() => setIsRenaming(false)}
        selectOnFocus
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setIsRenaming(true)}
      className="cursor-pointer"
    >
      {file.name}
    </span>
  );
}
```

## Behavior Configuration
| Prop | Default | Behavior |
|------|---------|----------|
| `selectOnFocus` | `true` | Select all text when entering edit mode |
| `submitOnBlur` | `true` | Save when clicking outside |
| `submitOnEnter` | `true` | Save when pressing Enter |
| `cancelOnEscape` | `true` | Cancel edit on Escape key |

## Styling Notes
- Static mode: Looks like text with hover highlight
- Edit mode: Underlined input
- Has `cursor-text` when editable
- `cursor-not-allowed` when disabled
- Hover: Light background highlight

## Related Components
- `Input` - Standard text input
- `SearchInput` - Search input with icon

## Best Practices
1. Provide visual feedback that text is editable
2. Validate input before saving
3. Consider undo functionality
4. Use placeholder for empty values
