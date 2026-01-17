import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { FileTree, type FileNode } from "../components/ui/dev"

const meta: Meta<typeof FileTree> = {
  title: "UI/FileTree",
  component: FileTree,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof FileTree>

const sampleFiles: FileNode[] = [
  {
    name: "src",
    path: "/src",
    type: "folder",
    children: [
      {
        name: "components",
        path: "/src/components",
        type: "folder",
        children: [
          { name: "Button.tsx", path: "/src/components/Button.tsx", type: "file", status: "modified" },
          { name: "Input.tsx", path: "/src/components/Input.tsx", type: "file" },
          { name: "Card.tsx", path: "/src/components/Card.tsx", type: "file", status: "added" },
        ],
      },
      {
        name: "hooks",
        path: "/src/hooks",
        type: "folder",
        children: [
          { name: "useAuth.ts", path: "/src/hooks/useAuth.ts", type: "file" },
          { name: "useTheme.ts", path: "/src/hooks/useTheme.ts", type: "file", status: "modified" },
        ],
      },
      { name: "App.tsx", path: "/src/App.tsx", type: "file" },
      { name: "index.ts", path: "/src/index.ts", type: "file" },
    ],
  },
  {
    name: "public",
    path: "/public",
    type: "folder",
    children: [
      { name: "index.html", path: "/public/index.html", type: "file" },
      { name: "favicon.ico", path: "/public/favicon.ico", type: "file" },
    ],
  },
  { name: "package.json", path: "/package.json", type: "file" },
  { name: "tsconfig.json", path: "/tsconfig.json", type: "file" },
  { name: "README.md", path: "/README.md", type: "file" },
]

// Interactive demo
function FileTreeDemo() {
  const [selectedPath, setSelectedPath] = React.useState<string>()
  const [expandedPaths, setExpandedPaths] = React.useState<string[]>(["/src"])

  return (
    <div className="flex gap-4">
      <div className="w-64 border border-border rounded-md">
        <FileTree
          files={sampleFiles}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onSelect={(path) => setSelectedPath(path)}
          onOpen={(path) => alert(`Open: ${path}`)}
          onExpandChange={setExpandedPaths}
          onContextMenu={(path, node, e) => {
            e.preventDefault()
            alert(`Context menu for: ${path}`)
          }}
          showStatus
        />
      </div>
      <div className="flex-1 p-4 border border-border rounded-md bg-muted/30">
        <p className="text-sm text-muted-foreground">Selected: {selectedPath || "None"}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Expanded: {expandedPaths.join(", ") || "None"}
        </p>
      </div>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <FileTreeDemo />,
}

export const Default: Story = {
  args: {
    files: sampleFiles,
  },
}

export const WithSelection: Story = {
  args: {
    files: sampleFiles,
    selectedPath: "/src/App.tsx",
    expandedPaths: ["/src"],
  },
}

export const WithStatusIndicators: Story = {
  args: {
    files: sampleFiles,
    showStatus: true,
    expandedPaths: ["/src", "/src/components"],
  },
}

export const Compact: Story = {
  args: {
    files: sampleFiles,
    compact: true,
    expandedPaths: ["/src", "/src/components", "/src/hooks"],
  },
}

export const AllExpanded: Story = {
  args: {
    files: sampleFiles,
    expandedPaths: ["/src", "/src/components", "/src/hooks", "/public"],
  },
}

export const Empty: Story = {
  args: {
    files: [],
  },
}

export const SingleFile: Story = {
  args: {
    files: [
      { name: "index.ts", path: "/index.ts", type: "file" },
    ],
  },
}
