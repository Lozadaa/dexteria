# Breadcrumb Component - AI Documentation

## Overview
Navigation breadcrumb trail. Shows hierarchical path with optional truncation for long paths.

## Import
```tsx
import { Breadcrumb } from 'adnia-ui';
```

## Props Interface
```tsx
interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;  // Custom separator (default: chevron)
  maxItems?: number;            // Truncate if more items (0 = no limit)
}

interface BreadcrumbItem {
  label: string;
  href?: string;                // Not used directly, but available
  icon?: React.ReactNode;
  onClick?: () => void;
}
```

## Usage Examples

### Basic Breadcrumb
```tsx
const items = [
  { label: 'Home', onClick: () => navigate('/') },
  { label: 'Projects', onClick: () => navigate('/projects') },
  { label: 'My Project' },  // Current page, no onClick
];

<Breadcrumb items={items} />
```

### With Icons
```tsx
const items = [
  { label: 'Home', icon: <HomeIcon />, onClick: () => {} },
  { label: 'Documents', icon: <FolderIcon />, onClick: () => {} },
  { label: 'Report.pdf', icon: <FileIcon /> },
];

<Breadcrumb items={items} />
```

### With Truncation
```tsx
// For long paths like: Home > Projects > 2024 > Q1 > Reports > Final
const items = [
  { label: 'Home', onClick: () => {} },
  { label: 'Projects', onClick: () => {} },
  { label: '2024', onClick: () => {} },
  { label: 'Q1', onClick: () => {} },
  { label: 'Reports', onClick: () => {} },
  { label: 'Final' },
];

// Shows: Home > ... > Reports > Final
<Breadcrumb items={items} maxItems={4} />
```

### Custom Separator
```tsx
<Breadcrumb
  items={items}
  separator={<span className="text-muted-foreground">/</span>}
/>
```

### File Path Breadcrumb
```tsx
function FilePath({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean);

  const items = parts.map((part, index) => ({
    label: part,
    onClick: index < parts.length - 1
      ? () => navigateToPath(parts.slice(0, index + 1).join('/'))
      : undefined,
  }));

  return <Breadcrumb items={items} />;
}

// Usage
<FilePath path="/src/components/ui/breadcrumb.tsx" />
```

### With Router Integration
```tsx
function RouteBreadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathParts = location.pathname.split('/').filter(Boolean);

  const items = [
    { label: 'Home', onClick: () => navigate('/') },
    ...pathParts.map((part, index) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1),
      onClick: index < pathParts.length - 1
        ? () => navigate('/' + pathParts.slice(0, index + 1).join('/'))
        : undefined,
    })),
  ];

  return <Breadcrumb items={items} />;
}
```

## Styling Notes
- Clickable items have `cursor-pointer`
- Current item (last) has `font-medium text-foreground`
- Previous items have `text-muted-foreground`
- Hover state on clickable items
- Default separator is chevron-right icon

## Related Components
- `TabNavigation` - For horizontal navigation
- `Sidebar` - For sidebar navigation

## Best Practices
1. Current page should not be clickable
2. Use `maxItems` for deep hierarchies
3. Keep labels short
4. Consider icons for common items (Home, Folder)
