import type { Meta, StoryObj } from "@storybook/react"
import { SplitPane } from "../components/ui/dev"

const meta: Meta<typeof SplitPane> = {
  title: "UI/SplitPane",
  component: SplitPane,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof SplitPane>

const Panel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`h-full p-4 ${className || ""}`}>
    {children}
  </div>
)

export const Horizontal: Story = {
  args: {
    direction: "horizontal",
    defaultSizes: [30, 70],
    className: "h-[400px] border border-border rounded-md",
    children: [
      <Panel key="left" className="bg-muted/30">
        <h3 className="font-semibold mb-2">Left Panel</h3>
        <p className="text-sm text-muted-foreground">Resize by dragging the divider</p>
      </Panel>,
      <Panel key="right" className="bg-muted/10">
        <h3 className="font-semibold mb-2">Right Panel</h3>
        <p className="text-sm text-muted-foreground">This is the main content area</p>
      </Panel>,
    ],
  },
}

export const Vertical: Story = {
  args: {
    direction: "vertical",
    defaultSizes: [60, 40],
    className: "h-[400px] border border-border rounded-md",
    children: [
      <Panel key="top" className="bg-muted/30">
        <h3 className="font-semibold mb-2">Top Panel</h3>
        <p className="text-sm text-muted-foreground">Main content area</p>
      </Panel>,
      <Panel key="bottom" className="bg-muted/10">
        <h3 className="font-semibold mb-2">Bottom Panel</h3>
        <p className="text-sm text-muted-foreground">Secondary content</p>
      </Panel>,
    ],
  },
}

export const ThreePanels: Story = {
  args: {
    direction: "horizontal",
    defaultSizes: [20, 50, 30],
    minSizes: [100, 200, 100],
    className: "h-[400px] border border-border rounded-md",
    children: [
      <Panel key="sidebar" className="bg-muted/40">
        <h3 className="font-semibold text-sm mb-2">Sidebar</h3>
      </Panel>,
      <Panel key="main" className="bg-muted/20">
        <h3 className="font-semibold text-sm mb-2">Editor</h3>
      </Panel>,
      <Panel key="details" className="bg-muted/30">
        <h3 className="font-semibold text-sm mb-2">Details</h3>
      </Panel>,
    ],
  },
}

export const IDELayout: Story = {
  args: {
    direction: "horizontal",
    defaultSizes: [20, 80],
    className: "h-[500px] border border-border rounded-md",
    children: [
      <Panel key="sidebar" className="bg-muted/30 p-2">
        <div className="text-sm font-medium mb-2">Explorer</div>
        <div className="space-y-1 text-xs">
          <div className="p-1 hover:bg-muted rounded cursor-pointer">src/</div>
          <div className="p-1 hover:bg-muted rounded cursor-pointer pl-4">components/</div>
          <div className="p-1 hover:bg-muted rounded cursor-pointer pl-4">hooks/</div>
          <div className="p-1 hover:bg-muted rounded cursor-pointer">package.json</div>
        </div>
      </Panel>,
      <SplitPane key="main" direction="vertical" defaultSizes={[70, 30]} className="h-full">
        <Panel className="bg-card">
          <div className="text-sm font-medium mb-2">Editor</div>
          <div className="font-mono text-xs text-muted-foreground">
            <pre>{`function App() {
  return <div>Hello!</div>
}`}</pre>
          </div>
        </Panel>
        <Panel className="bg-muted/20">
          <div className="text-sm font-medium mb-2">Terminal</div>
          <div className="font-mono text-xs text-green-500">$ npm start</div>
        </Panel>
      </SplitPane>,
    ],
  },
}

export const WithMinMax: Story = {
  args: {
    direction: "horizontal",
    defaultSizes: [50, 50],
    minSizes: [150, 150],
    maxSizes: [400, undefined],
    className: "h-[300px] border border-border rounded-md",
    children: [
      <Panel key="left" className="bg-muted/30">
        <p className="text-sm">Min: 150px, Max: 400px</p>
      </Panel>,
      <Panel key="right" className="bg-muted/10">
        <p className="text-sm">Min: 150px, No max</p>
      </Panel>,
    ],
  },
}
