import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { FontProvider, FontSelector, useFonts, type FontConfig } from "../components/ui/font-provider"

const meta: Meta<typeof FontProvider> = {
  title: "Theme/FontProvider",
  component: FontProvider,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof FontProvider>

// Demo component that shows current fonts
function FontDemo() {
  const { fonts, setFont, resetFonts } = useFonts()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">Current Font Configuration</h3>
        <div className="p-4 bg-muted/30 rounded-md font-mono text-sm">
          <pre>{JSON.stringify(fonts, null, 2)}</pre>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Font Preview</h3>
        <div className="space-y-2">
          <p style={{ fontFamily: "var(--font-family-sans)" }}>
            Sans-serif: The quick brown fox jumps over the lazy dog.
          </p>
          <p style={{ fontFamily: "var(--font-family-mono)" }} className="font-mono">
            Monospace: const greeting = "Hello, World!";
          </p>
          {fonts.display && (
            <p style={{ fontFamily: "var(--font-family-display)" }} className="text-xl">
              Display: Welcome to the App
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFont("sans", "Georgia, serif")}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted cursor-pointer"
        >
          Set Sans to Georgia
        </button>
        <button
          onClick={() => setFont("mono", "Courier New, monospace")}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted cursor-pointer"
        >
          Set Mono to Courier
        </button>
        <button
          onClick={resetFonts}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
        >
          Reset Fonts
        </button>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: () => (
    <FontProvider>
      <FontDemo />
    </FontProvider>
  ),
}

export const WithFontSelector: Story = {
  render: () => (
    <FontProvider>
      <div className="space-y-6">
        <h3 className="font-semibold">Font Selector Component</h3>
        <FontSelector showPreview />
      </div>
    </FontProvider>
  ),
}

export const SelectorWithoutPreview: Story = {
  render: () => (
    <FontProvider>
      <div className="space-y-6">
        <h3 className="font-semibold">Compact Font Selector</h3>
        <FontSelector showPreview={false} />
      </div>
    </FontProvider>
  ),
}

export const CustomInitialFonts: Story = {
  render: () => {
    const customFonts: FontConfig = {
      sans: "Verdana, Geneva, sans-serif",
      mono: "Consolas, Monaco, monospace",
      baseFontSize: "16px",
      codeFontSize: "14px",
    }

    return (
      <FontProvider fonts={customFonts}>
        <div className="space-y-4">
          <h3 className="font-semibold">Custom Initial Fonts</h3>
          <p>This provider was initialized with Verdana for sans-serif and Consolas for monospace.</p>
          <FontDemo />
        </div>
      </FontProvider>
    )
  },
}

export const WithDisplayFont: Story = {
  render: () => {
    const fontsWithDisplay: FontConfig = {
      sans: "system-ui, sans-serif",
      mono: "ui-monospace, monospace",
      display: "Georgia, serif",
    }

    return (
      <FontProvider fonts={fontsWithDisplay}>
        <div className="space-y-4">
          <h3 className="font-semibold">With Display Font</h3>
          <p className="text-sm text-muted-foreground">
            Display fonts are used for headings and prominent text.
          </p>
          <FontDemo />
        </div>
      </FontProvider>
    )
  },
}

export const FontSizeVariations: Story = {
  render: () => (
    <FontProvider>
      <div className="space-y-6">
        <h3 className="font-semibold">Font Size Variations</h3>

        <div className="space-y-4">
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Extra Small (text-xs)</p>
            <p className="text-xs">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Small (text-sm)</p>
            <p className="text-sm">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Base</p>
            <p>The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Large (text-lg)</p>
            <p className="text-lg">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Extra Large (text-xl)</p>
            <p className="text-xl">The quick brown fox jumps over the lazy dog.</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Monospace Sizes</h4>
          <div className="font-mono space-y-2">
            <p className="text-xs">text-xs: const x = 42;</p>
            <p className="text-sm">text-sm: const x = 42;</p>
            <p>base: const x = 42;</p>
          </div>
        </div>
      </div>
    </FontProvider>
  ),
}

export const PersistentStorage: Story = {
  render: () => (
    <FontProvider storageKey="storybook-font-demo">
      <div className="space-y-4">
        <h3 className="font-semibold">Persistent Font Storage</h3>
        <p className="text-sm text-muted-foreground">
          Font choices are saved to localStorage with the key "storybook-font-demo".
          Change fonts and refresh the page to see persistence.
        </p>
        <FontSelector showPreview />
      </div>
    </FontProvider>
  ),
}

export const CodeEditorExample: Story = {
  render: () => (
    <FontProvider>
      <div className="space-y-4">
        <h3 className="font-semibold">Code Editor Font Example</h3>
        <FontSelector showPreview={false} />

        <div className="mt-4 p-4 bg-code-background text-code-foreground rounded-md">
          <pre className="font-mono text-sm" style={{ fontFamily: "var(--font-family-mono)" }}>
{`function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate first 10 numbers
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}`}
          </pre>
        </div>
      </div>
    </FontProvider>
  ),
}
