# AlertDialog Component - AI Documentation

## Overview
Confirmation dialog using Radix UI. Unlike Dialog, it requires explicit user action (cannot be dismissed by clicking outside or pressing Escape by default).

## Import
```tsx
// Convenience wrapper
import { AlertDialog } from 'adnia-ui';

// Primitives
import {
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from 'adnia-ui';
```

## Props Interface

### AlertDialog (Convenience Wrapper)
```tsx
interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel?: string;           // Default: "Cancel"
  confirmLabel?: string;          // Default: "Continue"
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
}
```

## Usage Examples

### Basic Confirmation
```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Delete</Button>
<AlertDialog
  open={open}
  onOpenChange={setOpen}
  title="Are you sure?"
  description="This action cannot be undone."
  onConfirm={() => {
    deleteItem();
    setOpen(false);
  }}
  onCancel={() => setOpen(false)}
/>
```

### Destructive Action
```tsx
<AlertDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete Account"
  description="This will permanently delete your account and all data."
  variant="destructive"
  confirmLabel="Delete Account"
  cancelLabel="Keep Account"
  onConfirm={handleDeleteAccount}
/>
```

### Using Primitives
```tsx
<AlertDialogRoot open={open} onOpenChange={setOpen}>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
      <AlertDialogDescription>
        This will remove all associated data.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialogRoot>
```

## Key Differences from Dialog
| Feature | Dialog | AlertDialog |
|---------|--------|-------------|
| Click outside | Closes | Does nothing |
| Escape key | Closes | Does nothing |
| Use case | Forms, content | Confirmations |

## Styling Notes
- `variant="destructive"` makes confirm button red
- Same animation as Dialog
- Focus goes to Cancel button by default (safer)

## Related Components
- `Dialog` - For general modal content

## Best Practices
1. Use for destructive/irreversible actions
2. Be specific in description about what will happen
3. Use `variant="destructive"` for delete operations
4. Keep title short and action-oriented
