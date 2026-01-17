import type { Meta, StoryObj } from "@storybook/react"
import { CodeBlock } from "../components/ui/dev"

const meta: Meta<typeof CodeBlock> = {
  title: "UI/CodeBlock",
  component: CodeBlock,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof CodeBlock>

const sampleCode = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate the 10th fibonacci number
const result = fibonacci(10);
console.log(result); // 55`

const jsonCode = `{
  "name": "adnia-ui",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "tailwindcss": "^4.0.0"
  }
}`

export const Default: Story = {
  args: {
    code: sampleCode,
    language: "typescript",
  },
}

export const WithFilename: Story = {
  args: {
    code: sampleCode,
    language: "typescript",
    filename: "fibonacci.ts",
  },
}

export const WithHighlightedLines: Story = {
  args: {
    code: sampleCode,
    language: "typescript",
    filename: "fibonacci.ts",
    highlightLines: [2, 3],
  },
}

export const Collapsible: Story = {
  args: {
    code: sampleCode,
    language: "typescript",
    filename: "fibonacci.ts",
    collapsible: true,
  },
}

export const CollapsedByDefault: Story = {
  args: {
    code: sampleCode,
    language: "typescript",
    filename: "fibonacci.ts",
    collapsible: true,
    defaultCollapsed: true,
  },
}

export const WithoutLineNumbers: Story = {
  args: {
    code: sampleCode,
    language: "typescript",
    showLineNumbers: false,
  },
}

export const WithLineWrap: Story = {
  args: {
    code: `const longText = "This is a very long line of text that should wrap when the wrapLines option is enabled. It demonstrates how the component handles long lines of code.";`,
    language: "typescript",
    wrapLines: true,
  },
}

export const WithMaxHeight: Story = {
  args: {
    code: Array(50).fill("console.log('Line of code');").join("\n"),
    language: "javascript",
    maxHeight: 200,
  },
}

export const JSON: Story = {
  args: {
    code: jsonCode,
    language: "json",
    filename: "package.json",
  },
}

export const NoCopyButton: Story = {
  args: {
    code: sampleCode,
    language: "typescript",
    copyable: false,
  },
}
