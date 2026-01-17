import type { Meta, StoryObj } from "@storybook/react"
import { PanelGroup, ResizablePanel as Panel, PanelResizeHandle } from "../components/ui/dev"

const meta: Meta<typeof PanelGroup> = {
  title: "UI/PanelGroup",
  component: PanelGroup,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof PanelGroup>

const PanelContent = ({
  title,
  className = "",
}: {
  title: string
  className?: string
}) => (
  <div className={`h-full p-4 ${className}`}>
    <h3 className="font-semibold text-sm mb-2">{title}</h3>
    <p className="text-xs text-muted-foreground">
      Drag the handle to resize this panel
    </p>
  </div>
)

export const Horizontal: Story = {
  render: () => (
    <div className="h-[400px] border border-border rounded-md">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={30} minSize={20}>
          <PanelContent title="Left Panel" className="bg-muted/30" />
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={70} minSize={30}>
          <PanelContent title="Right Panel" className="bg-muted/10" />
        </Panel>
      </PanelGroup>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="h-[400px] border border-border rounded-md">
      <PanelGroup direction="vertical">
        <Panel defaultSize={60} minSize={20}>
          <PanelContent title="Top Panel" className="bg-muted/30" />
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={40} minSize={20}>
          <PanelContent title="Bottom Panel" className="bg-muted/10" />
        </Panel>
      </PanelGroup>
    </div>
  ),
}

export const ThreePanels: Story = {
  render: () => (
    <div className="h-[400px] border border-border rounded-md">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={15}>
          <PanelContent title="Sidebar" className="bg-muted/40" />
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={50} minSize={25}>
          <PanelContent title="Main Content" className="bg-muted/20" />
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={25} minSize={15}>
          <PanelContent title="Details" className="bg-muted/30" />
        </Panel>
      </PanelGroup>
    </div>
  ),
}

export const NestedPanels: Story = {
  render: () => (
    <div className="h-[500px] border border-border rounded-md">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={15}>
          <PanelContent title="Explorer" className="bg-muted/40" />
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={75} minSize={40}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={30}>
              <PanelContent title="Editor" className="bg-card" />
            </Panel>
            <PanelResizeHandle />
            <Panel defaultSize={30} minSize={15}>
              <PanelContent title="Terminal" className="bg-muted/20" />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  ),
}

export const IDELayout: Story = {
  render: () => (
    <div className="h-[600px] border border-border rounded-md">
      <PanelGroup direction="horizontal">
        {/* Activity Bar would go here in a real IDE */}
        <Panel defaultSize={20} minSize={12} maxSize={30}>
          <div className="h-full bg-muted/30 p-2">
            <div className="text-sm font-medium mb-2">Explorer</div>
            <div className="space-y-1 text-xs">
              <div className="p-1.5 rounded hover:bg-muted cursor-pointer">
                📁 src
              </div>
              <div className="p-1.5 rounded hover:bg-muted cursor-pointer pl-4">
                📁 components
              </div>
              <div className="p-1.5 rounded hover:bg-muted cursor-pointer pl-4">
                📁 hooks
              </div>
              <div className="p-1.5 rounded hover:bg-muted cursor-pointer">
                📄 package.json
              </div>
              <div className="p-1.5 rounded hover:bg-muted cursor-pointer">
                📄 tsconfig.json
              </div>
            </div>
          </div>
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={55} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={75} minSize={30}>
              <div className="h-full bg-card p-4">
                <div className="text-sm font-medium mb-2">Editor</div>
                <div className="font-mono text-xs text-muted-foreground">
                  <pre>{`function App() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}`}</pre>
                </div>
              </div>
            </Panel>
            <PanelResizeHandle />
            <Panel defaultSize={25} minSize={10} collapsible>
              <div className="h-full bg-muted/20 p-2">
                <div className="text-sm font-medium mb-2">Terminal</div>
                <div className="font-mono text-xs text-green-500">
                  $ npm run dev
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={25} minSize={15} collapsible>
          <div className="h-full bg-muted/20 p-2">
            <div className="text-sm font-medium mb-2">Problems</div>
            <div className="text-xs text-muted-foreground">
              No problems detected
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  ),
}

export const CollapsiblePanels: Story = {
  render: () => (
    <div className="h-[400px] border border-border rounded-md">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={30} minSize={15} collapsible collapsedSize={5}>
          <PanelContent title="Collapsible Panel" className="bg-muted/30" />
        </Panel>
        <PanelResizeHandle withHandle />
        <Panel defaultSize={70} minSize={30}>
          <PanelContent
            title="Main Panel"
            className="bg-muted/10"
          />
        </Panel>
      </PanelGroup>
    </div>
  ),
}

export const WithHandleIndicator: Story = {
  render: () => (
    <div className="h-[400px] border border-border rounded-md">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={50} minSize={20}>
          <PanelContent title="Panel A" className="bg-muted/30" />
        </Panel>
        <PanelResizeHandle withHandle />
        <Panel defaultSize={50} minSize={20}>
          <PanelContent title="Panel B" className="bg-muted/10" />
        </Panel>
      </PanelGroup>
    </div>
  ),
}

export const PersistentLayout: Story = {
  render: () => (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground px-4">
        This layout persists to localStorage. Resize the panels and refresh to see it restored.
      </p>
      <div className="h-[400px] border border-border rounded-md">
        <PanelGroup direction="horizontal" autoSaveId="storybook-demo">
          <Panel defaultSize={30} minSize={20}>
            <PanelContent title="Persistent Panel 1" className="bg-muted/30" />
          </Panel>
          <PanelResizeHandle />
          <Panel defaultSize={70} minSize={30}>
            <PanelContent title="Persistent Panel 2" className="bg-muted/10" />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  ),
}
