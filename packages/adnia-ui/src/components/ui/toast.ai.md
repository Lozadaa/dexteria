# Toast Component - AI Documentation

## Overview
Toast notification system with variants, auto-dismiss, and action buttons. Includes context provider and hook.

## Import
```tsx
import { Toast, ToastProvider, useToast } from 'adnia-ui';
```

## Props Interface

### ToastProvider
```tsx
interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
           | 'top-center' | 'bottom-center';
  maxToasts?: number;                     // Default: 5
}
```

### Toast
```tsx
interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}
```

### useToast Hook
```tsx
interface UseToast {
  toasts: ToastType[];
  toast: (props: {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;              // ms, 0 = no auto-dismiss, default: 5000
    action?: { label: string; onClick: () => void };
  }) => string;                     // Returns toast ID
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
```

## Usage Examples

### Setup Provider (App Root)
```tsx
function App() {
  return (
    <ToastProvider position="bottom-right">
      <YourApp />
    </ToastProvider>
  );
}
```

### Basic Toast
```tsx
function MyComponent() {
  const { toast } = useToast();

  return (
    <Button onClick={() => toast({ title: 'Hello!' })}>
      Show Toast
    </Button>
  );
}
```

### With Variants
```tsx
const { toast } = useToast();

// Success
toast({ title: 'Saved!', variant: 'success' });

// Error
toast({ title: 'Error', description: 'Something went wrong', variant: 'error' });

// Warning
toast({ title: 'Warning', description: 'Check your input', variant: 'warning' });

// Info
toast({ title: 'Info', variant: 'info' });
```

### With Action
```tsx
toast({
  title: 'File deleted',
  description: 'document.txt was moved to trash',
  variant: 'default',
  action: {
    label: 'Undo',
    onClick: () => restoreFile(),
  },
});
```

### Custom Duration
```tsx
// Quick toast (2 seconds)
toast({ title: 'Copied!', duration: 2000 });

// Persistent toast (no auto-dismiss)
toast({ title: 'Action required', duration: 0 });
```

### Programmatic Dismiss
```tsx
const { toast, dismiss, dismissAll } = useToast();

// Dismiss specific toast
const id = toast({ title: 'Loading...' });
// Later...
dismiss(id);

// Dismiss all
dismissAll();
```

### API Response Pattern
```tsx
async function saveData() {
  try {
    await api.save(data);
    toast({
      title: 'Saved successfully',
      variant: 'success',
    });
  } catch (error) {
    toast({
      title: 'Save failed',
      description: error.message,
      variant: 'error',
      action: {
        label: 'Retry',
        onClick: saveData,
      },
    });
  }
}
```

### Form Submission Pattern
```tsx
function ContactForm() {
  const { toast } = useToast();

  const onSubmit = async (data) => {
    const id = toast({ title: 'Sending...', duration: 0 });

    try {
      await sendMessage(data);
      dismiss(id);
      toast({ title: 'Message sent!', variant: 'success' });
    } catch {
      dismiss(id);
      toast({ title: 'Failed to send', variant: 'error' });
    }
  };

  return <form onSubmit={onSubmit}>...</form>;
}
```

## Position Options
| Position | Description |
|----------|-------------|
| `top-right` | Top right corner |
| `top-left` | Top left corner |
| `bottom-right` | Bottom right corner (default) |
| `bottom-left` | Bottom left corner |
| `top-center` | Top center |
| `bottom-center` | Bottom center |

## Styling Notes
- Variants have solid colored backgrounds
- Action button and dismiss button have `cursor-pointer`
- Shadow for depth
- Smooth slide-in animation
- Toast container has `pointer-events-none` (toasts have `pointer-events-auto`)

## Related Components
- `Banner` - For page-level persistent messages
- `AlertBanner` - For in-content alerts

## Best Practices
1. Keep toast messages short
2. Use appropriate variants
3. Don't overuse toasts (max 2-3 at a time)
4. Provide undo actions for destructive operations
5. Use longer duration for important messages
