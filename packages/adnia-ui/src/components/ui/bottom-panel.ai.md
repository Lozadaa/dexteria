# BottomPanel Component - AI Documentation

## Overview
Resizable bottom panel for terminal, logs, output, etc. Supports tabs and collapse functionality.

## Import
```tsx
import { BottomPanel } from 'adnia-ui';
```

## Props Interface
```tsx
interface BottomPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs?: PanelTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  defaultHeight?: number;      // Default: 200
  minHeight?: number;          // Default: 100
  maxHeight?: number;          // Default: 500
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

interface PanelTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;              // For error/warning counts
}
```

## Usage Examples

### Basic Panel
```tsx
<BottomPanel>
  <pre className="p-4 font-mono text-sm">
    Console output here...
  </pre>
</BottomPanel>
```

### With Tabs
```tsx
const [activeTab, setActiveTab] = useState('terminal');

const tabs = [
  { id: 'terminal', label: 'Terminal', icon: <TerminalIcon /> },
  { id: 'output', label: 'Output', icon: <OutputIcon /> },
  { id: 'problems', label: 'Problems', icon: <WarningIcon />, badge: 3 },
];

<BottomPanel
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
>
  {activeTab === 'terminal' && <Terminal />}
  {activeTab === 'output' && <OutputLog />}
  {activeTab === 'problems' && <ProblemsList />}
</BottomPanel>
```

### Collapsible Panel
```tsx
const [collapsed, setCollapsed] = useState(false);

<BottomPanel
  collapsed={collapsed}
  onCollapse={setCollapsed}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
>
  {/* content */}
</BottomPanel>
```

### IDE-Style Panel
```tsx
function IDEBottomPanel() {
  const [activeTab, setActiveTab] = useState('terminal');
  const [collapsed, setCollapsed] = useState(false);
  const { errors, warnings } = useDiagnostics();

  const tabs = [
    { id: 'terminal', label: 'Terminal' },
    { id: 'output', label: 'Output' },
    {
      id: 'problems',
      label: 'Problems',
      badge: errors.length + warnings.length,
    },
    { id: 'debug', label: 'Debug Console' },
  ];

  return (
    <BottomPanel
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      collapsed={collapsed}
      onCollapse={setCollapsed}
      defaultHeight={250}
      minHeight={100}
      maxHeight={600}
    >
      {activeTab === 'terminal' && (
        <div className="h-full">
          <Terminal />
        </div>
      )}
      {activeTab === 'problems' && (
        <div className="p-2 space-y-1">
          {errors.map(e => (
            <div key={e.id} className="text-red-500 text-sm">{e.message}</div>
          ))}
          {warnings.map(w => (
            <div key={w.id} className="text-yellow-500 text-sm">{w.message}</div>
          ))}
        </div>
      )}
    </BottomPanel>
  );
}
```

### Custom Height Range
```tsx
<BottomPanel
  defaultHeight={300}
  minHeight={150}
  maxHeight={700}
>
  {/* Large content */}
</BottomPanel>
```

## Features
- **Drag to resize**: Drag top edge to change height
- **Collapse toggle**: Chevron button to collapse/expand
- **Tab badges**: Show counts (errors, notifications)
- **Keyboard shortcut**: Consider adding toggle shortcut

## Styling Notes
- Header with tabs and collapse button
- Resize handle at top
- Tabs have `cursor-pointer`
- Active tab has bottom border
- Badge shows count with destructive color
- Collapse animation

## Related Components
- `SplitView` - Alternative for split layouts
- `TabGroup` - Similar tab interface
- `Sidebar` - For side panels

## Layout Pattern
```tsx
<div className="flex flex-col h-screen">
  <AppHeader />
  <div className="flex-1 flex overflow-hidden">
    <Sidebar />
    <main className="flex-1 flex flex-col">
      <TabGroup />
      <div className="flex-1">
        <Editor />
      </div>
      <BottomPanel tabs={...} />
    </main>
  </div>
  <StatusBar />
</div>
```
