# Dialog Component - AI Documentation

## Overview
Modal dialog using Radix UI. Supports multiple sizes and both convenience wrapper and primitive components.

## Import
```tsx
// Convenience wrapper
import { Dialog } from 'adnia-ui';

// Primitives for custom layouts
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose
} from 'adnia-ui';
```

## Props Interface

### Dialog (Convenience Wrapper)
```tsx
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;      // Dialog body content
  footer?: React.ReactNode;       // Footer content (usually buttons)
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
```

### Size Reference
| Size | Width |
|------|-------|
| `sm` | max-w-sm (384px) |
| `md` | max-w-md (448px) - default |
| `lg` | max-w-lg (512px) |
| `xl` | max-w-xl (576px) |
| `full` | Nearly full screen |

## Usage Examples

### Using Convenience Wrapper
```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Edit Profile"
  description="Make changes to your profile."
  footer={
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </>
  }
>
  <Input placeholder="Name" />
  <Input placeholder="Email" type="email" />
</Dialog>
```

### Using Primitives (More Control)
```tsx
<DialogRoot open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent size="lg">
    <DialogHeader>
      <DialogTitle>Custom Dialog</DialogTitle>
      <DialogDescription>With full control over structure</DialogDescription>
    </DialogHeader>

    <div className="py-4">
      {/* Custom content */}
    </div>

    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</DialogRoot>
```

### Form Dialog
```tsx
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Create Project"
  size="lg"
  footer={
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button type="submit" form="project-form">Create</Button>
    </>
  }
>
  <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
    <Input name="name" placeholder="Project name" required />
    <Textarea name="description" placeholder="Description" />
  </form>
</Dialog>
```

## Styling Notes
- Centered with overlay backdrop
- Backdrop blur: `backdrop-blur-sm`
- Animated: fade + zoom + slide
- Focus trapped inside dialog
- Escape key closes dialog
- Click outside closes dialog

## Related Components
- `AlertDialog` - For confirmations (prevents accidental close)
- `CommandPalette` - For command search dialogs

## Accessibility
- Focus is trapped inside dialog
- `aria-modal="true"`
- Escape key dismisses
- Returns focus to trigger on close
