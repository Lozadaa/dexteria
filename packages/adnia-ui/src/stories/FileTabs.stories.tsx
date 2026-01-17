import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { FileTabs, type FileTab } from "../components/ui/dev"

const meta: Meta<typeof FileTabs> = {
  title: "UI/FileTabs",
  component: FileTabs,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof FileTabs>

const sampleTabs: FileTab[] = [
  { id: "1", name: "index.ts", path: "/src/index.ts" },
  { id: "2", name: "App.tsx", path: "/src/App.tsx", isDirty: true },
  { id: "3", name: "Button.tsx", path: "/src/components/Button.tsx" },
  { id: "4", name: "package.json", path: "/package.json" },
]

// Interactive demo
function FileTabsDemo() {
  const [tabs, setTabs] = React.useState<FileTab[]>(sampleTabs)
  const [activeTab, setActiveTab] = React.useState("1")

  const handleClose = (id: string) => {
    const newTabs = tabs.filter((t) => t.id !== id)
    setTabs(newTabs)
    if (activeTab === id && newTabs.length > 0) {
      setActiveTab(newTabs[0].id)
    }
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newTabs = [...tabs]
    const [removed] = newTabs.splice(fromIndex, 1)
    newTabs.splice(toIndex, 0, removed)
    setTabs(newTabs)
  }

  return (
    <div className="space-y-4">
      <FileTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        onTabClose={handleClose}
        onTabReorder={handleReorder}
        onTabCloseAll={() => {
          setTabs([])
          setActiveTab("")
        }}
      />
      <div className="p-4 border border-border rounded-md bg-muted/30">
        <p className="text-sm">Active tab: {tabs.find((t) => t.id === activeTab)?.name || "None"}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tip: Drag tabs to reorder, middle-click to close
        </p>
      </div>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <FileTabsDemo />,
}

export const Default: Story = {
  args: {
    tabs: sampleTabs,
    activeTab: "1",
  },
}

export const WithDirtyIndicator: Story = {
  args: {
    tabs: [
      { id: "1", name: "index.ts", isDirty: false },
      { id: "2", name: "App.tsx", isDirty: true },
      { id: "3", name: "utils.ts", isDirty: true },
    ],
    activeTab: "2",
  },
}

export const WithPinnedTabs: Story = {
  args: {
    tabs: [
      { id: "1", name: "config.ts", isPinned: true },
      { id: "2", name: "App.tsx" },
      { id: "3", name: "Button.tsx" },
    ],
    activeTab: "2",
  },
}

export const PreviewTab: Story = {
  args: {
    tabs: [
      { id: "1", name: "index.ts" },
      { id: "2", name: "preview.tsx", isPreview: true },
    ],
    activeTab: "2",
  },
}

export const ManyTabs: Story = {
  args: {
    tabs: Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      name: `file${i + 1}.tsx`,
      isDirty: i % 3 === 0,
    })),
    activeTab: "1",
  },
}

export const NoCloseButton: Story = {
  args: {
    tabs: sampleTabs,
    activeTab: "1",
    showCloseButton: false,
  },
}

export const Empty: Story = {
  args: {
    tabs: [],
  },
}
