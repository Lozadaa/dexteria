# Banner Component - AI Documentation

## Overview
Full-width banner for page-level messages. Can be sticky and dismissible.

## Import
```tsx
import { Banner } from 'adnia-ui';
```

## Props Interface
```tsx
interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  action?: React.ReactNode;               // Action button/link
  dismissible?: boolean;
  onDismiss?: () => void;
  sticky?: boolean;                       // Stick to top of container
}
```

## Variant Colors
| Variant | Background |
|---------|------------|
| `default` | Muted gray |
| `info` | Blue |
| `success` | Green |
| `warning` | Amber |
| `error` | Red |

All variants use solid colored backgrounds with white text for good contrast.

## Usage Examples

### Basic Banner
```tsx
<Banner>
  Welcome to the new version!
</Banner>
```

### With Variant
```tsx
<Banner variant="warning">
  Your subscription expires in 3 days.
</Banner>

<Banner variant="error">
  Failed to sync data. Please try again.
</Banner>

<Banner variant="success">
  Your changes have been saved.
</Banner>
```

### With Icon
```tsx
<Banner
  variant="info"
  icon={<InfoIcon className="h-5 w-5" />}
>
  New features are available.
</Banner>
```

### With Action
```tsx
<Banner
  variant="warning"
  action={<Button size="sm" variant="outline">Upgrade</Button>}
>
  Your plan has limited features.
</Banner>
```

### Dismissible
```tsx
const [showBanner, setShowBanner] = useState(true);

{showBanner && (
  <Banner
    variant="info"
    dismissible
    onDismiss={() => setShowBanner(false)}
  >
    Check out our new features!
  </Banner>
)}
```

### Sticky Banner
```tsx
<Banner
  variant="warning"
  sticky
>
  Maintenance scheduled for tomorrow.
</Banner>
```

### Offline Banner
```tsx
function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Banner
      variant="warning"
      sticky
      icon={<WifiOffIcon className="h-5 w-5" />}
    >
      You're offline. Some features may not work.
    </Banner>
  );
}
```

### Multiple Actions
```tsx
<Banner
  variant="info"
  action={
    <div className="flex gap-2">
      <Button size="sm" variant="outline">Learn More</Button>
      <Button size="sm">Upgrade</Button>
    </div>
  }
  dismissible
  onDismiss={dismissBanner}
>
  New features available in Pro plan.
</Banner>
```

### App Update Banner
```tsx
<Banner
  variant="info"
  icon={<DownloadIcon className="h-5 w-5" />}
  action={
    <Button size="sm" onClick={reloadApp}>
      Reload
    </Button>
  }
>
  A new version is available.
</Banner>
```

## Styling Notes
- Full width container
- Solid colored backgrounds (good contrast)
- Dismiss button has `cursor-pointer`
- Sticky uses `position: sticky; top: 0; z-index: 40;`
- Content centered vertically

## Related Components
- `AlertBanner` - For in-content alerts
- `Toast` - For temporary notifications

## Layout Pattern
```tsx
<div className="flex flex-col h-screen">
  <Banner variant="warning" sticky>
    System maintenance tonight.
  </Banner>
  <AppHeader />
  <main className="flex-1">
    {/* content */}
  </main>
</div>
```

## Best Practices
1. Use sparingly - one banner at a time
2. Keep message concise
3. Provide clear action when needed
4. Allow dismissal for non-critical messages
5. Use `sticky` for important persistent messages
