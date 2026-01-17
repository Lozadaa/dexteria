# Kbd Component - AI Documentation

## Overview
Displays keyboard shortcuts with platform-aware symbols (⌘ on Mac, Ctrl on Windows).

## Import
```tsx
import { Kbd, formatShortcut } from 'adnia-ui';
```

## Props Interface
```tsx
interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode; // Shortcut string like "mod+s" or "ctrl+shift+p"
}

// Utility function
function formatShortcut(shortcut: string): string;
```

## Shortcut Format
- `mod` → ⌘ (Mac) / Ctrl (Windows)
- `ctrl` → ⌃ / Ctrl
- `shift` → ⇧ / Shift
- `alt` → ⌥ / Alt
- `enter` → ↵
- `backspace` → ⌫
- `delete` / `del` → ⌦
- `escape` / `esc` → Esc
- `tab` → ⇥
- `space` → Space
- Arrow keys: `up`→↑, `down`→↓, `left`→←, `right`→→

## Usage Examples

### Basic
```tsx
<Kbd>mod+s</Kbd>        {/* Shows ⌘S on Mac, Ctrl+S on Windows */}
<Kbd>mod+shift+p</Kbd>  {/* Shows ⌘⇧P on Mac */}
<Kbd>ctrl+c</Kbd>       {/* Shows ⌃C */}
<Kbd>enter</Kbd>        {/* Shows ↵ */}
```

### In Menu Items
```tsx
<DropdownMenuItem>
  Save
  <Kbd className="ml-auto">mod+s</Kbd>
</DropdownMenuItem>
```

### Standalone Display
```tsx
<p>Press <Kbd>mod+k</Kbd> to open command palette</p>
```

### Using formatShortcut Utility
```tsx
const shortcut = formatShortcut('mod+shift+p');
// Returns "⌘⇧P" on Mac, "Ctrl+Shift+P" on Windows
```

## Styling Notes
- Small, muted background: `bg-muted`
- Rounded corners: `rounded`
- Monospace-like appearance
- Subtle border
- Font size: `text-xs`

## Related Components
- `Tooltip` - Can show shortcuts
- `CommandItem` - Has shortcut prop
- `DropdownMenuItem` - Has shortcut prop
- `ContextMenuItem` - Has shortcut prop

## Platform Detection
The component automatically detects the platform:
- macOS: Uses symbols (⌘, ⇧, ⌥, ⌃)
- Windows/Linux: Uses text (Ctrl, Shift, Alt)
