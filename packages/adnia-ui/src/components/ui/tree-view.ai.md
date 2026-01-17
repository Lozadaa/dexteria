# TreeView Component - AI Documentation

## Overview
Expandable tree structure for hierarchical data. Supports selection, expansion control, and custom rendering.

## Import
```tsx
import { TreeView } from 'adnia-ui';
```

## Props Interface
```tsx
interface TreeViewProps<T> {
  data: TreeNode<T>[];
  renderNode: (node: T, depth: number, expanded: boolean) => React.ReactNode;
  expanded?: string[];                    // Array of expanded node IDs
  onExpand?: (id: string, expanded: boolean) => void;
  selected?: string | string[];
  onSelect?: (id: string | string[]) => void;
  multiSelect?: boolean;
  indentSize?: number;                    // Pixels per level (default: 16)
}

interface TreeNode<T> {
  id: string;
  data: T;
  children?: TreeNode<T>[];
  hasChildren?: boolean;                  // For lazy loading
}
```

## Usage Examples

### Basic File Tree
```tsx
interface FileNode {
  name: string;
  type: 'file' | 'folder';
}

const treeData: TreeNode<FileNode>[] = [
  {
    id: '1',
    data: { name: 'src', type: 'folder' },
    children: [
      { id: '1-1', data: { name: 'index.tsx', type: 'file' } },
      { id: '1-2', data: { name: 'App.tsx', type: 'file' } },
    ],
  },
  {
    id: '2',
    data: { name: 'package.json', type: 'file' },
  },
];

const [expanded, setExpanded] = useState<string[]>(['1']);
const [selected, setSelected] = useState<string | null>(null);

<TreeView
  data={treeData}
  expanded={expanded}
  onExpand={(id, isExpanded) => {
    setExpanded(prev =>
      isExpanded ? [...prev, id] : prev.filter(i => i !== id)
    );
  }}
  selected={selected}
  onSelect={setSelected}
  renderNode={(node, depth, isExpanded) => (
    <div className="flex items-center gap-2">
      {node.type === 'folder' ? (
        <FolderIcon className={isExpanded ? 'text-yellow-500' : ''} />
      ) : (
        <FileIcon />
      )}
      <span>{node.name}</span>
    </div>
  )}
/>
```

### With Icons by File Type
```tsx
const getIcon = (node: FileNode, expanded: boolean) => {
  if (node.type === 'folder') {
    return expanded ? <FolderOpenIcon /> : <FolderIcon />;
  }
  const ext = node.name.split('.').pop();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return <TypeScriptIcon />;
    case 'css':
      return <CssIcon />;
    case 'json':
      return <JsonIcon />;
    default:
      return <FileIcon />;
  }
};

<TreeView
  data={data}
  expanded={expanded}
  onExpand={handleExpand}
  renderNode={(node, depth, isExpanded) => (
    <div className="flex items-center gap-2">
      {getIcon(node, isExpanded)}
      <span>{node.name}</span>
    </div>
  )}
/>
```

### Lazy Loading Children
```tsx
const [data, setData] = useState<TreeNode<Folder>[]>(rootFolders);
const [loading, setLoading] = useState<string | null>(null);

const handleExpand = async (id: string, isExpanded: boolean) => {
  if (isExpanded) {
    const node = findNode(data, id);
    if (node.hasChildren && !node.children) {
      setLoading(id);
      const children = await fetchChildren(id);
      setData(updateNodeChildren(data, id, children));
      setLoading(null);
    }
  }
  // Update expanded state
};

<TreeView
  data={data}
  expanded={expanded}
  onExpand={handleExpand}
  renderNode={(node, depth, isExpanded) => (
    <div className="flex items-center gap-2">
      <FolderIcon />
      <span>{node.name}</span>
      {loading === node.id && <Spinner size="sm" />}
    </div>
  )}
/>
```

### Multi-Select Tree
```tsx
const [selected, setSelected] = useState<string[]>([]);

<TreeView
  data={data}
  expanded={expanded}
  onExpand={handleExpand}
  selected={selected}
  onSelect={setSelected}
  multiSelect
  renderNode={(node) => <span>{node.name}</span>}
/>
```

## Features
- **Expand/Collapse**: Click chevron or node
- **Selection**: Single or multi-select
- **Indentation**: Automatic based on depth
- **Lazy loading**: Use `hasChildren` without `children`
- **Keyboard**: Ctrl/Cmd+Click for multi-select

## Styling Notes
- Nodes have `cursor-pointer`
- Expand button has `cursor-pointer`
- Selected nodes have `bg-accent`
- Hover state on nodes
- Smooth rotation animation on expand icon

## Related Components
- `ListView` - For flat lists
- `VirtualList` - For large flat lists
- `Sidebar` - Often contains tree views

## Best Practices
1. Keep tree depth reasonable
2. Use lazy loading for large trees
3. Show loading state during fetch
4. Implement keyboard navigation for accessibility
