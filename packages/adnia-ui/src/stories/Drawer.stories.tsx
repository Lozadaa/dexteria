import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "../components/ui/dev"

const meta: Meta<typeof Drawer> = {
  title: "UI/Drawer",
  component: Drawer,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Drawer>

// Interactive demo
function DrawerDemo({ side = "right" as const }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="p-8 h-[400px]">
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
      >
        Open Drawer ({side})
      </button>

      <Drawer open={open} onOpenChange={setOpen} side={side}>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>Configure your preferences</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                className="w-full p-2 border border-border rounded bg-background"
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-border rounded bg-background"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full p-2 border border-border rounded bg-background"
                rows={4}
                placeholder="Enter description"
              />
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              alert("Saved!")
              setOpen(false)
            }}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
          >
            Save
          </button>
        </DrawerFooter>
      </Drawer>
    </div>
  )
}

export const RightSide: Story = {
  render: () => <DrawerDemo side="right" />,
}

export const LeftSide: Story = {
  render: () => <DrawerDemo side="left" />,
}

export const TopSide: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-8 h-[400px]">
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
        >
          Open Top Drawer
        </button>
        <Drawer open={open} onOpenChange={setOpen} side="top" size={200}>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Notification</h3>
            <p className="text-sm text-muted-foreground">
              This is a top drawer, great for notifications or alerts.
            </p>
          </div>
        </Drawer>
      </div>
    )
  },
}

export const BottomSide: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-8 h-[400px]">
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
        >
          Open Bottom Drawer
        </button>
        <Drawer open={open} onOpenChange={setOpen} side="bottom" size={250}>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Actions</h3>
            <div className="flex gap-2">
              <button className="flex-1 p-3 border border-border rounded hover:bg-muted cursor-pointer">
                Share
              </button>
              <button className="flex-1 p-3 border border-border rounded hover:bg-muted cursor-pointer">
                Download
              </button>
              <button className="flex-1 p-3 border border-border rounded hover:bg-muted cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </Drawer>
      </div>
    )
  },
}

export const CustomSize: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-8 h-[400px]">
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
        >
          Open Wide Drawer (500px)
        </button>
        <Drawer open={open} onOpenChange={setOpen} size={500}>
          <DrawerHeader>
            <DrawerTitle>Large Drawer</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <p>This drawer is 500px wide.</p>
          </DrawerBody>
        </Drawer>
      </div>
    )
  },
}

export const NonModal: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-8 h-[400px]">
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
        >
          Open Non-Modal Drawer
        </button>
        <p className="mt-4 text-sm text-muted-foreground">
          Click the button - the drawer won't have an overlay.
        </p>
        <Drawer open={open} onOpenChange={setOpen} modal={false}>
          <DrawerHeader>
            <DrawerTitle>Non-Modal</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <p>This drawer has no overlay. You can interact with the page behind it.</p>
          </DrawerBody>
        </Drawer>
      </div>
    )
  },
}

export const NoCloseButton: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-8 h-[400px]">
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
        >
          Open Drawer
        </button>
        <Drawer open={open} onOpenChange={setOpen} showCloseButton={false}>
          <DrawerHeader>
            <DrawerTitle>No Close Button</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <p>Click outside or press Escape to close.</p>
          </DrawerBody>
          <DrawerFooter>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded cursor-pointer"
            >
              Close
            </button>
          </DrawerFooter>
        </Drawer>
      </div>
    )
  },
}
