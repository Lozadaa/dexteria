# OfflineIndicator Component - AI Documentation

## Overview
Component to show online/offline status. Includes hook for detecting network status.

## Import
```tsx
import { OfflineIndicator, useOnlineStatus } from 'adnia-ui';
```

## Props Interface

### OfflineIndicator
```tsx
interface OfflineIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  showOnline?: boolean;           // Show indicator when online (default: false)
}
```

### useOnlineStatus Hook
```tsx
function useOnlineStatus(): boolean;  // Returns true if online
```

## Usage Examples

### Basic Usage
```tsx
// Only shows when offline
<OfflineIndicator />
```

### Always Show Status
```tsx
// Shows both online and offline states
<OfflineIndicator showOnline />
```

### Using the Hook
```tsx
function MyComponent() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      {isOnline ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

### Conditional Content
```tsx
function DataSync() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      {!isOnline && (
        <Banner variant="warning">
          You're offline. Changes will sync when connected.
        </Banner>
      )}
      <Form />
    </div>
  );
}
```

### In Status Bar
```tsx
<StatusBar>
  <StatusBarItem>
    <OfflineIndicator showOnline />
  </StatusBarItem>
</StatusBar>
```

### Disable Features When Offline
```tsx
function SaveButton() {
  const isOnline = useOnlineStatus();

  return (
    <Button disabled={!isOnline}>
      {isOnline ? 'Save' : 'Offline'}
    </Button>
  );
}
```

### Queue Actions When Offline
```tsx
function ActionHandler() {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<Action[]>([]);

  const performAction = async (action: Action) => {
    if (isOnline) {
      await sendToServer(action);
    } else {
      setQueue([...queue, action]);
    }
  };

  // Sync queue when back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      queue.forEach(sendToServer);
      setQueue([]);
    }
  }, [isOnline, queue]);

  return <ActionButtons onAction={performAction} />;
}
```

### In App Header
```tsx
<AppHeader title="My App">
  <OfflineIndicator />
  <ThemeToggle />
</AppHeader>
```

## Styling Notes
- Shows dot indicator with text
- Offline: Yellow/warning color
- Online: Green/success color (when `showOnline`)
- Compact design for status bars

## Related Components
- `Banner` - For full-width offline messages
- `StatusBar` - Common container for status indicators

## How It Works
Uses browser's `navigator.onLine` and listens to:
- `online` event
- `offline` event

Note: This detects network connection, not internet accessibility.

## Best Practices
1. Show offline status prominently
2. Queue actions for later sync
3. Disable destructive actions when offline
4. Provide visual feedback
5. Auto-sync when back online
