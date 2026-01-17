// Dev Components Layer - AI-powered developer tool UI primitives

// Phase 1: Content Layer
export { CodeBlock, simpleHighlight, type CodeBlockProps } from "./code-block"
export {
  MarkdownViewer,
  type MarkdownViewerProps,
  type CodeBlockRenderProps,
  type MarkdownComponents,
  type MarkdownParserOptions,
} from "./markdown-viewer"

// Phase 2: Streaming Layer
export {
  StreamingTypewriter,
  useStreamingText,
  type StreamingTypewriterProps,
  type StreamingTypewriterRef,
} from "./streaming-typewriter"
export {
  StreamingMarkdown,
  useStreamingMarkdown,
  type StreamingMarkdownProps,
  type StreamingMarkdownRef,
} from "./streaming-markdown"

// Phase 3: Code Editing Layer
export {
  CodeEditor,
  DefaultEditor,
  type CodeEditorProps,
  type DefaultEditorProps,
  type EditorDecoration,
  type EditorPosition,
  type EditorRange,
  type EditorRenderProps,
} from "./code-editor"
export {
  DiffViewer,
  computeDiff,
  getDiffStats,
  type DiffViewerProps,
  type DiffLine,
  type DiffLineType,
  type LineActionProps,
} from "./diff-viewer"

// Phase 4: Execution Layer
export {
  TerminalPanel,
  type TerminalPanelProps,
  type TerminalPanelRef,
  type TerminalSession,
  type TerminalLine,
} from "./terminal-panel"
export {
  LogViewer,
  type LogViewerProps,
  type LogViewerRef,
  type LogEntry,
  type LogFilter,
  type LogLevel,
} from "./log-viewer"

// Phase 5: Navigation Layer
export {
  FileTree,
  type FileTreeProps,
  type FileNode,
  type FileNodeStatus,
} from "./file-tree"
export {
  FileTabs,
  type FileTabsProps,
  type FileTab,
} from "./file-tabs"

// Phase 6: Review & AI Layer
export {
  PatchReviewPanel,
  type PatchReviewPanelProps,
  type PatchFile,
  type PatchFileStatus,
} from "./patch-review-panel"
export {
  InlineComment,
  type InlineCommentProps,
  type Comment,
  type CommentThread,
} from "./inline-comment"
export {
  AIResponseCard,
  type AIResponseCardProps,
  type AIResponseStatus,
} from "./ai-response-card"

// Phase 7: Layout Primitives
export {
  SplitPane,
  type SplitPaneProps,
} from "./split-pane"
export {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
  type DrawerProps,
} from "./drawer"
export {
  PanelGroup,
  Panel as ResizablePanel,
  PanelResizeHandle,
  usePanelGroup,
  type PanelGroupProps,
  type PanelProps as ResizablePanelProps,
  type PanelResizeHandleProps,
} from "./panel-group"
