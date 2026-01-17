# Spinner Component - AI Documentation

## Overview
Loading spinner animation with size variants.

## Import
```tsx
import { Spinner } from 'adnia-ui';
```

## Props Interface
```tsx
interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}
```

## Size Reference
| Size | Dimensions |
|------|------------|
| `sm` | 16x16px |
| `md` | 24x24px (default) |
| `lg` | 32x32px |

## Usage Examples

### Basic
```tsx
<Spinner />
<Spinner size="sm" />
<Spinner size="lg" />
```

### In Button
```tsx
<Button disabled>
  <Spinner size="sm" className="mr-2" />
  Loading...
</Button>
```

### Full Page Loading
```tsx
function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
```

### Inline Loading
```tsx
function DataSection({ loading, data }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner size="sm" />
        <span>Loading data...</span>
      </div>
    );
  }
  return <DataDisplay data={data} />;
}
```

### Card Loading State
```tsx
<Card className="p-6">
  {loading ? (
    <div className="flex justify-center py-8">
      <Spinner />
    </div>
  ) : (
    <CardContent />
  )}
</Card>
```

### Table Row Loading
```tsx
<tr>
  <td colSpan={4} className="text-center py-4">
    <Spinner size="sm" className="inline-block" />
    <span className="ml-2">Loading more...</span>
  </td>
</tr>
```

## Styling Notes
- Uses CSS animation (`animate-spin`)
- Color: `text-primary` (inherits from context)
- SVG-based, scales cleanly
- Can be customized with `className`

## Related Components
- `ProgressBar` - For determinate progress
- `Skeleton` - For content placeholders

## Common Patterns

### Conditional Rendering
```tsx
{loading && <Spinner />}
```

### Button States
```tsx
<Button disabled={loading}>
  {loading ? (
    <>
      <Spinner size="sm" className="mr-2" />
      Processing...
    </>
  ) : (
    'Submit'
  )}
</Button>
```
