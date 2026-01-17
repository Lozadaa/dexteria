# Toolbar Component - AI Documentation

## Overview
Action toolbar with buttons, groups, and separators. Built for desktop app interfaces like editors.

## Import
```tsx
import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator } from 'adnia-ui';
```

## Props Interface

### Toolbar
```tsx
interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'compact';
}
```

### ToolbarGroup
```tsx
interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  separator?: boolean;  // Add separator after group
}
```

### ToolbarButton
```tsx
interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;    // Required
  label?: string;           // Optional text label
  tooltip?: string;         // Hover tooltip
  shortcut?: string;        // Keyboard shortcut for tooltip
  active?: boolean;         // Active/pressed state
}
```

## Usage Examples

### Basic Toolbar
```tsx
<Toolbar>
  <ToolbarGroup>
    <ToolbarButton
      icon={<SaveIcon />}
      tooltip="Save"
      shortcut="mod+s"
      onClick={handleSave}
    />
    <ToolbarButton
      icon={<UndoIcon />}
      tooltip="Undo"
      shortcut="mod+z"
      onClick={handleUndo}
    />
    <ToolbarButton
      icon={<RedoIcon />}
      tooltip="Redo"
      shortcut="mod+shift+z"
      onClick={handleRedo}
    />
  </ToolbarGroup>

  <ToolbarSeparator />

  <ToolbarGroup>
    <ToolbarButton
      icon={<BoldIcon />}
      tooltip="Bold"
      shortcut="mod+b"
      active={isBold}
      onClick={toggleBold}
    />
    <ToolbarButton
      icon={<ItalicIcon />}
      tooltip="Italic"
      shortcut="mod+i"
      active={isItalic}
      onClick={toggleItalic}
    />
  </ToolbarGroup>
</Toolbar>
```

### With Labels
```tsx
<Toolbar>
  <ToolbarGroup>
    <ToolbarButton icon={<PlayIcon />} label="Run" />
    <ToolbarButton icon={<StopIcon />} label="Stop" />
  </ToolbarGroup>
</Toolbar>
```

### Compact Variant
```tsx
<Toolbar variant="compact">
  <ToolbarGroup>
    <ToolbarButton icon={<ZoomInIcon />} tooltip="Zoom In" />
    <ToolbarButton icon={<ZoomOutIcon />} tooltip="Zoom Out" />
  </ToolbarGroup>
</Toolbar>
```

### With Group Separators
```tsx
<Toolbar>
  <ToolbarGroup separator>
    <ToolbarButton icon={<FileIcon />} tooltip="New File" />
    <ToolbarButton icon={<FolderIcon />} tooltip="Open Folder" />
  </ToolbarGroup>

  <ToolbarGroup separator>
    <ToolbarButton icon={<CutIcon />} tooltip="Cut" />
    <ToolbarButton icon={<CopyIcon />} tooltip="Copy" />
    <ToolbarButton icon={<PasteIcon />} tooltip="Paste" />
  </ToolbarGroup>

  <ToolbarGroup>
    <ToolbarButton icon={<SettingsIcon />} tooltip="Settings" />
  </ToolbarGroup>
</Toolbar>
```

### Toggle Button Group (Formatting)
```tsx
function FormattingToolbar({ format, onFormatChange }) {
  return (
    <Toolbar>
      <ToolbarGroup>
        <ToolbarButton
          icon={<BoldIcon />}
          active={format.bold}
          onClick={() => onFormatChange({ ...format, bold: !format.bold })}
        />
        <ToolbarButton
          icon={<ItalicIcon />}
          active={format.italic}
          onClick={() => onFormatChange({ ...format, italic: !format.italic })}
        />
        <ToolbarButton
          icon={<UnderlineIcon />}
          active={format.underline}
          onClick={() => onFormatChange({ ...format, underline: !format.underline })}
        />
      </ToolbarGroup>
    </Toolbar>
  );
}
```

## Styling Notes
- Default height: `h-10` (40px)
- Compact height: `h-8` (32px)
- Border bottom
- Buttons have `cursor-pointer`
- Active buttons have `bg-accent`
- Tooltips powered by TooltipProvider (included)

## Related Components
- `AppHeader` - For app-level header
- `TabGroup` - For document tabs above toolbar
- `IconButton` - Standalone icon buttons

## Layout Pattern
```tsx
<div className="flex flex-col h-screen">
  <AppHeader />
  <TabGroup />
  <Toolbar />
  <main className="flex-1">{/* content */}</main>
</div>
```
