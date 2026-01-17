# ProgressBar Component - AI Documentation

## Overview
Progress indicator with determinate and indeterminate modes.

## Import
```tsx
import { ProgressBar } from 'adnia-ui';
```

## Props Interface
```tsx
interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;                         // 0-100, undefined = indeterminate
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;                    // Show percentage text
}
```

## Size Reference
| Size | Height |
|------|--------|
| `sm` | 4px |
| `md` | 8px (default) |
| `lg` | 12px |

## Usage Examples

### Determinate Progress
```tsx
<ProgressBar value={75} />
```

### With Percentage Display
```tsx
<ProgressBar value={42} showValue />
// Shows: "42%"
```

### Indeterminate (Unknown Progress)
```tsx
<ProgressBar />
// or
<ProgressBar value={undefined} />
```

### Variants
```tsx
<ProgressBar value={100} variant="success" />
<ProgressBar value={75} variant="warning" />
<ProgressBar value={25} variant="error" />
```

### Sizes
```tsx
<ProgressBar value={50} size="sm" />
<ProgressBar value={50} size="md" />
<ProgressBar value={50} size="lg" />
```

### File Upload Progress
```tsx
function FileUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    setUploading(true);
    await uploadFile(file, (percent) => setProgress(percent));
    setUploading(false);
  };

  return (
    <div>
      {uploading && (
        <div className="space-y-2">
          <ProgressBar value={progress} showValue />
          <p className="text-sm text-muted-foreground">Uploading file...</p>
        </div>
      )}
    </div>
  );
}
```

### Download Progress
```tsx
<div className="space-y-1">
  <div className="flex justify-between text-sm">
    <span>Downloading update...</span>
    <span>{downloadedMB}/{totalMB} MB</span>
  </div>
  <ProgressBar value={(downloadedMB / totalMB) * 100} />
</div>
```

### Multi-Step Progress
```tsx
function MultiStepProgress({ currentStep, totalSteps }) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <ProgressBar value={progress} />
    </div>
  );
}
```

### Loading State with Indeterminate
```tsx
function DataLoader({ loading, loadProgress, children }) {
  if (loading) {
    return (
      <div className="p-4">
        <ProgressBar value={loadProgress} />
        <p className="mt-2 text-sm text-muted-foreground">
          {loadProgress !== undefined
            ? `Loading... ${loadProgress}%`
            : 'Loading...'}
        </p>
      </div>
    );
  }
  return children;
}
```

## Styling Notes
- Background: `bg-secondary`
- Fill: `bg-primary` (or variant color)
- Rounded corners
- Indeterminate mode has animation
- Value text appears above or beside bar

## Related Components
- `Spinner` - For unknown duration loading
- `Skeleton` - For content placeholders

## Best Practices
1. Use determinate when progress is known
2. Use indeterminate for unknown duration
3. Show additional context (file name, step, etc.)
4. Use `showValue` for important progress tracking
5. Use `variant="success"` when complete
