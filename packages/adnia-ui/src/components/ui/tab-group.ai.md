# TabGroup Component - AI Documentation

## Overview
IDE-style tabs with support for close buttons, dirty indicators, and pinned tabs. For document/file tabs.

## Import
```tsx
import { TabGroup } from 'adnia-ui';
```

## Props Interface

### TabGroup
```tsx
interface TabGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onTabClose?: (id: string) => void;
  closable?: boolean;              // Show close buttons
  overflow?: 'scroll' | 'dropdown';
}

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  dirty?: boolean;      // Unsaved changes indicator
  pinned?: boolean;     // Cannot be closed
  disabled?: boolean;
}
```

## Usage Examples

### Basic Tabs
```tsx
const [activeTab, setActiveTab] = useState('tab1');

const tabs = [
  { id: 'tab1', label: 'index.tsx' },
  { id: 'tab2', label: 'styles.css' },
  { id: 'tab3', label: 'README.md' },
];

<TabGroup
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Closable Tabs
```tsx
const [tabs, setTabs] = useState([
  { id: '1', label: 'Document 1' },
  { id: '2', label: 'Document 2' },
]);
const [activeTab, setActiveTab] = useState('1');

const handleClose = (id: string) => {
  setTabs(tabs.filter(t => t.id !== id));
  if (activeTab === id && tabs.length > 1) {
    const remaining = tabs.filter(t => t.id !== id);
    setActiveTab(remaining[0].id);
  }
};

<TabGroup
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  onTabClose={handleClose}
  closable
/>
```

### With Icons and Dirty State
```tsx
const tabs = [
  {
    id: '1',
    label: 'App.tsx',
    icon: <ReactIcon />,
    dirty: true,  // Shows dot indicator
  },
  {
    id: '2',
    label: 'styles.css',
    icon: <CssIcon />,
    dirty: false,
  },
  {
    id: '3',
    label: 'package.json',
    icon: <JsonIcon />,
    pinned: true,  // Cannot close
  },
];

<TabGroup
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  onTabClose={handleClose}
  closable
/>
```

### File Editor Pattern
```tsx
function FileEditor() {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const openFile = (file: File) => {
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles([...openFiles, { ...file, dirty: false }]);
    }
    setActiveFile(file.id);
  };

  const closeFile = (id: string) => {
    const file = openFiles.find(f => f.id === id);
    if (file?.dirty) {
      // Show save dialog
      return;
    }
    setOpenFiles(openFiles.filter(f => f.id !== id));
  };

  const markDirty = (id: string) => {
    setOpenFiles(openFiles.map(f =>
      f.id === id ? { ...f, dirty: true } : f
    ));
  };

  return (
    <div className="flex flex-col h-full">
      <TabGroup
        tabs={openFiles.map(f => ({
          id: f.id,
          label: f.name,
          icon: getFileIcon(f.type),
          dirty: f.dirty,
        }))}
        activeTab={activeFile || ''}
        onTabChange={setActiveFile}
        onTabClose={closeFile}
        closable
      />
      <div className="flex-1">
        {activeFile && <Editor file={openFiles.find(f => f.id === activeFile)} />}
      </div>
    </div>
  );
}
```

## Features
- **Close button**: Appears on hover (or always for active)
- **Middle-click close**: Click middle mouse button to close
- **Dirty indicator**: Dot shows unsaved changes
- **Pinned tabs**: Can't be closed, shows pin icon
- **Active indicator**: Bottom border on active tab

## Styling Notes
- Tabs have `cursor-pointer`
- Close buttons have `cursor-pointer`
- Active tab has bottom primary border
- Dirty tabs show italic label + dot
- Smooth transitions on hover

## Related Components
- `Tabs` - For simple tab navigation (not closable)
- `TabNavigation` - For page navigation tabs
- `Toolbar` - Often used below tab group

## Layout Pattern
```tsx
<div className="flex flex-col h-screen">
  <AppHeader />
  <TabGroup tabs={...} />  {/* Document tabs */}
  <Toolbar />              {/* Actions for active document */}
  <main className="flex-1">{/* Document content */}</main>
</div>
```
