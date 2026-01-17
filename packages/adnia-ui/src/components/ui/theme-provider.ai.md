# Theme System - AI Documentation

## Overview
Multi-theme system supporting light, dark, and colored themes. Includes provider, hook, and toggle components.

## Import
```tsx
import {
  ThemeProvider,
  ThemeToggle,
  useTheme,
  type Theme
} from 'adnia-ui';
```

## Types
```tsx
type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'system';
```

## Components & Hooks

### ThemeProvider
```tsx
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;           // Default: 'system'
  storageKey?: string;            // LocalStorage key (default: 'adnia-ui-theme')
}
```

### useTheme Hook
```tsx
interface UseTheme {
  theme: Theme;                   // Current theme setting
  resolvedTheme: Exclude<Theme, 'system'>;  // Actual applied theme
  setTheme: (theme: Theme) => void;
  themes: Theme[];                // All available themes
}
```

### ThemeToggle
```tsx
interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showLabel?: boolean;            // Show theme name next to icon
}
```

## Usage Examples

### Basic Setup
```tsx
// In your root App component
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <YourApp />
    </ThemeProvider>
  );
}
```

### Using the Hook
```tsx
function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <p>Current: {theme} (resolved: {resolvedTheme})</p>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="blue">Blue</option>
        <option value="green">Green</option>
        <option value="purple">Purple</option>
      </select>
    </div>
  );
}
```

### Theme Toggle Button
```tsx
// Simple toggle
<ThemeToggle />

// With label
<ThemeToggle showLabel />

// In header
<AppHeader>
  <ThemeToggle />
</AppHeader>
```

### Theme Selector Dropdown
```tsx
function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <SunIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {themes.map((t) => (
          <DropdownMenuItem
            key={t}
            onSelect={() => setTheme(t)}
          >
            {theme === t && <CheckIcon className="mr-2 h-4 w-4" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}
```

### System Theme Detection
```tsx
function MyComponent() {
  const { theme, resolvedTheme } = useTheme();

  // theme might be 'system'
  // resolvedTheme is always 'light' | 'dark' | etc.

  return (
    <div>
      {resolvedTheme === 'dark' && <MoonIcon />}
      {resolvedTheme === 'light' && <SunIcon />}
    </div>
  );
}
```

### Persisted Theme
The theme is automatically persisted to localStorage:
```tsx
// Default storage key
<ThemeProvider storageKey="adnia-ui-theme">

// Custom storage key
<ThemeProvider storageKey="my-app-theme">
```

### Conditional Styling Based on Theme
```tsx
function ThemedComponent() {
  const { resolvedTheme } = useTheme();

  return (
    <div className={cn(
      "p-4",
      resolvedTheme === 'dark' && "border-white/10",
      resolvedTheme === 'light' && "border-black/10"
    )}>
      Content
    </div>
  );
}
```

## Available Themes

| Theme | Description |
|-------|-------------|
| `light` | Light mode with blue primary |
| `dark` | Dark mode with blue primary |
| `blue` | Dark blue/cyan theme (tech/cyberpunk) |
| `green` | Dark green theme (terminal/matrix) |
| `purple` | Dark purple theme (aesthetic) |
| `system` | Auto-detect from OS preference |

## CSS Variables
All themes define these variables:
```css
--background, --foreground
--card, --card-foreground
--popover, --popover-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring
--radius
```

## Theme Application
Themes are applied via:
1. CSS class on `<html>`: `light`, `dark`, `blue`, etc.
2. Data attribute: `data-theme="dark"`

## Related Files
- `src/index.css` - Theme CSS variables definitions
- `src/components/ui/theme-provider.tsx` - Provider implementation

## Best Practices
1. Wrap app root with `ThemeProvider`
2. Use `resolvedTheme` for conditional logic
3. Use CSS variables for colors (not hardcoded)
4. Let users choose `system` as default
5. Persist user preference (automatic)
