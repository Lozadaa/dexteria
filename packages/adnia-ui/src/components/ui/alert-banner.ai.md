# AlertBanner Component - AI Documentation

## Overview
In-content alert message box with icon, title, description, and optional action.

## Import
```tsx
import { AlertBanner } from 'adnia-ui';
```

## Props Interface
```tsx
interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
}
```

## Usage Examples

### Basic Alert
```tsx
<AlertBanner
  title="Information"
  description="This is an informational message."
/>
```

### With Variants
```tsx
<AlertBanner
  variant="success"
  title="Success!"
  description="Your changes have been saved."
/>

<AlertBanner
  variant="error"
  title="Error"
  description="Failed to save changes. Please try again."
/>

<AlertBanner
  variant="warning"
  title="Warning"
  description="This action cannot be undone."
/>

<AlertBanner
  variant="info"
  title="Note"
  description="New features are available."
/>
```

### With Icon
```tsx
<AlertBanner
  variant="warning"
  icon={<AlertTriangleIcon className="h-5 w-5" />}
  title="Caution"
  description="Please review before proceeding."
/>
```

### With Action
```tsx
<AlertBanner
  variant="error"
  title="Connection Lost"
  description="Unable to connect to the server."
  action={
    <Button size="sm" variant="outline" onClick={retry}>
      Retry
    </Button>
  }
/>
```

### Dismissible
```tsx
const [showAlert, setShowAlert] = useState(true);

{showAlert && (
  <AlertBanner
    variant="info"
    title="New Feature"
    description="Check out our new dashboard."
    onDismiss={() => setShowAlert(false)}
  />
)}
```

### Form Validation Error
```tsx
function Form() {
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <form>
      {errors.length > 0 && (
        <AlertBanner
          variant="error"
          title="Please fix the following errors:"
        >
          <ul className="list-disc list-inside text-sm mt-2">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </AlertBanner>
      )}

      {/* form fields */}
    </form>
  );
}
```

### Empty State with Alert
```tsx
function EmptyInbox() {
  return (
    <AlertBanner
      variant="info"
      icon={<InboxIcon className="h-5 w-5" />}
      title="No messages"
      description="Your inbox is empty."
    />
  );
}
```

### With Custom Content
```tsx
<AlertBanner variant="warning" title="Rate Limit">
  <p className="text-sm mt-1">
    You've made 95 of 100 API calls this hour.
  </p>
  <ProgressBar value={95} className="mt-2" variant="warning" />
</AlertBanner>
```

### API Error Pattern
```tsx
function DataDisplay({ data, error }) {
  if (error) {
    return (
      <AlertBanner
        variant="error"
        icon={<AlertCircleIcon />}
        title="Failed to load data"
        description={error.message}
        action={
          <Button size="sm" variant="outline" onClick={refetch}>
            Try Again
          </Button>
        }
      />
    );
  }

  return <DataTable data={data} />;
}
```

## Styling Notes
- Rounded corners with border
- Solid colored backgrounds (high contrast)
- White text on colored backgrounds
- Icon aligned with title
- Dismiss button has `cursor-pointer`
- Uses flexbox for layout

## vs Banner vs Toast
| Component | Position | Duration | Use Case |
|-----------|----------|----------|----------|
| AlertBanner | In content | Permanent | Form errors, section alerts |
| Banner | Page top | Permanent | App-wide announcements |
| Toast | Corner | Auto-dismiss | Action feedback |

## Related Components
- `Banner` - For page-level announcements
- `Toast` - For temporary notifications

## Best Practices
1. Use appropriate variant for message type
2. Keep title short and action-oriented
3. Provide helpful description
4. Include action for recoverable errors
5. Allow dismissal for non-blocking alerts
