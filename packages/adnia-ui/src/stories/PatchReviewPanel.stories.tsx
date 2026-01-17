import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { PatchReviewPanel, type PatchFile } from "../components/ui/dev"

const meta: Meta<typeof PatchReviewPanel> = {
  title: "UI/PatchReviewPanel",
  component: PatchReviewPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof PatchReviewPanel>

const sampleFiles: PatchFile[] = [
  { path: "src/components/Button.tsx", status: "modified", additions: 15, deletions: 5 },
  { path: "src/components/Input.tsx", status: "modified", additions: 8, deletions: 2 },
  { path: "src/components/Card.tsx", status: "added", additions: 45, deletions: 0 },
  { path: "src/utils/helpers.ts", status: "deleted", additions: 0, deletions: 23 },
  { path: "src/types/index.ts", status: "renamed", oldPath: "src/types/types.ts", additions: 2, deletions: 1 },
]

// Interactive demo
function PatchReviewDemo() {
  const [files, setFiles] = React.useState<PatchFile[]>(sampleFiles)
  const [selectedFile, setSelectedFile] = React.useState<string>()

  const handleAcceptFile = (path: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, accepted: true, rejected: false } : f))
    )
  }

  const handleRejectFile = (path: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, rejected: true, accepted: false } : f))
    )
  }

  const handleAcceptAll = () => {
    setFiles((prev) =>
      prev.map((f) => (f.accepted || f.rejected ? f : { ...f, accepted: true }))
    )
  }

  const handleRejectAll = () => {
    setFiles((prev) =>
      prev.map((f) => (f.accepted || f.rejected ? f : { ...f, rejected: true }))
    )
  }

  return (
    <div className="space-y-4">
      <PatchReviewPanel
        files={files}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        onAcceptFile={handleAcceptFile}
        onRejectFile={handleRejectFile}
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectAll}
      />
      {selectedFile && (
        <div className="p-4 border border-border rounded-md bg-muted/30">
          <p className="text-sm">Selected: {selectedFile}</p>
        </div>
      )}
    </div>
  )
}

export const Interactive: Story = {
  render: () => <PatchReviewDemo />,
}

export const Default: Story = {
  args: {
    files: sampleFiles,
  },
}

export const WithActions: Story = {
  args: {
    files: sampleFiles,
    onAcceptFile: (path) => alert(`Accept: ${path}`),
    onRejectFile: (path) => alert(`Reject: ${path}`),
    onAcceptAll: () => alert("Accept all"),
    onRejectAll: () => alert("Reject all"),
  },
}

export const PartiallyReviewed: Story = {
  args: {
    files: [
      { path: "src/Button.tsx", status: "modified", additions: 15, deletions: 5, accepted: true },
      { path: "src/Input.tsx", status: "modified", additions: 8, deletions: 2, rejected: true },
      { path: "src/Card.tsx", status: "added", additions: 45, deletions: 0 },
    ],
    onAcceptFile: (path) => alert(`Accept: ${path}`),
    onRejectFile: (path) => alert(`Reject: ${path}`),
  },
}

export const AllAccepted: Story = {
  args: {
    files: sampleFiles.map((f) => ({ ...f, accepted: true })),
  },
}

export const AllRejected: Story = {
  args: {
    files: sampleFiles.map((f) => ({ ...f, rejected: true })),
  },
}

export const Collapsible: Story = {
  args: {
    files: sampleFiles,
    collapsible: true,
    defaultCollapsed: false,
  },
}

export const CollapsedByDefault: Story = {
  args: {
    files: sampleFiles,
    collapsible: true,
    defaultCollapsed: true,
  },
}

export const CustomTitle: Story = {
  args: {
    files: sampleFiles,
    title: "AI Generated Changes",
  },
}

export const SingleFile: Story = {
  args: {
    files: [
      { path: "src/index.ts", status: "modified", additions: 3, deletions: 1 },
    ],
  },
}
