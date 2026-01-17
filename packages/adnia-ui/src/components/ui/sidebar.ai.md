# Sidebar Component - AI Documentation

## Overview
Collapsible sidebar for application navigation. Supports resizing, sections, and tooltip labels when collapsed.

## Import
```tsx
import { Sidebar, SidebarSection, SidebarItem } from 'adnia-ui';
```

## Props Interface

### Sidebar
```tsx
interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  width?: number;              // Default: 240
  minWidth?: number;           // Default: 180
  maxWidth?: number;           // Default: 400
  collapsedWidth?: number;     // Default: 48
  position?: 'left' | 'right';
  resizable?: boolean;         // Default: true
  onWidthChange?: (width: number) => void;
}
```

### SidebarSection
```tsx
interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}
```

### SidebarItem
```tsx
interface SidebarItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;       // Required icon
  label: string;               // Required label text
  active?: boolean;
  badge?: number | string;
  collapsed?: boolean;         // Inherited from parent
  disabled?: boolean;
}
```

## Usage Examples

### Basic Sidebar
```tsx
const [collapsed, setCollapsed] = useState(false);

<Sidebar collapsed={collapsed} onCollapse={setCollapsed}>
  <SidebarSection title="Main">
    <SidebarItem
      icon={<HomeIcon />}
      label="Dashboard"
      active={pathname === '/'}
    />
    <SidebarItem
      icon={<FileIcon />}
      label="Documents"
      badge={3}
    />
    <SidebarItem
      icon={<SettingsIcon />}
      label="Settings"
    />
  </SidebarSection>
</Sidebar>
```

### With Collapsible Sections
```tsx
<Sidebar>
  <SidebarSection title="Workspace" collapsible>
    <SidebarItem icon={<FolderIcon />} label="Projects" />
    <SidebarItem icon={<TeamIcon />} label="Team" />
  </SidebarSection>

  <SidebarSection title="Personal" collapsible defaultCollapsed>
    <SidebarItem icon={<StarIcon />} label="Favorites" />
    <SidebarItem icon={<ArchiveIcon />} label="Archive" />
  </SidebarSection>
</Sidebar>
```

### Right-side Sidebar
```tsx
<Sidebar position="right" width={300}>
  <SidebarSection title="Properties">
    {/* Property editors */}
  </SidebarSection>
</Sidebar>
```

### Controlled Width
```tsx
const [width, setWidth] = useState(240);

<Sidebar
  width={width}
  onWidthChange={setWidth}
  minWidth={200}
  maxWidth={500}
>
  {/* ... */}
</Sidebar>
```

### With Navigation
```tsx
function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: <HomeIcon />, label: 'Home' },
    { path: '/files', icon: <FileIcon />, label: 'Files' },
    { path: '/settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <Sidebar>
      <SidebarSection>
        {navItems.map(item => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </SidebarSection>
    </Sidebar>
  );
}
```

## Features
- **Resizable**: Drag edge to resize
- **Collapsible**: Toggle between full and icon-only mode
- **Tooltips**: When collapsed, labels show as tooltips
- **Badges**: Show counts on items
- **Sections**: Group items with optional collapse

## Styling Notes
- Border on inner edge (left sidebar = right border)
- Background: `bg-background`
- Transition animation when collapsing
- Items have `cursor-pointer`
- Active items have `bg-accent` background

## Related Components
- `TabNavigation` - For top-level navigation
- `BottomPanel` - For bottom panels
- `ResizeHandle` - Used internally

## Layout Pattern
```tsx
<div className="flex h-screen">
  <Sidebar>{/* nav */}</Sidebar>
  <main className="flex-1 overflow-auto">
    {/* content */}
  </main>
</div>
```
