# Switch Component - AI Documentation

## Overview
Toggle switch for boolean states. Custom implementation (not Radix).

## Import
```tsx
import { Switch } from 'adnia-ui';
```

## Props Interface
```tsx
interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}
```

## Usage Examples

### Basic
```tsx
const [enabled, setEnabled] = useState(false);

<Switch checked={enabled} onCheckedChange={setEnabled} />
```

### With Label
```tsx
<div className="flex items-center gap-2">
  <Switch id="notifications" checked={enabled} onCheckedChange={setEnabled} />
  <label htmlFor="notifications">Enable notifications</label>
</div>
```

### Sizes
```tsx
<Switch size="sm" /> {/* 16x28px */}
<Switch size="md" /> {/* 20x36px - default */}
```

### Disabled
```tsx
<Switch disabled checked={true} />
```

## Styling Notes
- Uses `cursor-pointer`
- `disabled:cursor-not-allowed disabled:opacity-50`
- Smooth transition animation on toggle
- `bg-primary` when checked, `bg-input` when unchecked

## Accessibility
- `role="switch"`
- `aria-checked` attribute
- Keyboard: Space/Enter to toggle

## Common Patterns

### Settings Row
```tsx
<div className="flex items-center justify-between py-2">
  <div>
    <p className="font-medium">Dark Mode</p>
    <p className="text-sm text-muted-foreground">Use dark theme</p>
  </div>
  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
</div>
```

### Form Integration
```tsx
<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Switch
        id="terms"
        checked={acceptedTerms}
        onCheckedChange={setAcceptedTerms}
      />
      <label htmlFor="terms">I accept the terms</label>
    </div>
    <Button type="submit" disabled={!acceptedTerms}>Submit</Button>
  </div>
</form>
```
