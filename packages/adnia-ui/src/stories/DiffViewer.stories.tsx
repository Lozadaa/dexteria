import type { Meta, StoryObj } from "@storybook/react"
import { DiffViewer } from "../components/ui/dev"

const meta: Meta<typeof DiffViewer> = {
  title: "UI/DiffViewer",
  component: DiffViewer,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof DiffViewer>

const originalCode = `function greet(name) {
  console.log("Hello, " + name);
}

function main() {
  greet("World");
}

main();`

const modifiedCode = `function greet(name: string): void {
  console.log(\`Hello, \${name}!\`);
}

function farewell(name: string): void {
  console.log(\`Goodbye, \${name}!\`);
}

function main(): void {
  greet("World");
  farewell("World");
}

main();`

export const SplitView: Story = {
  args: {
    original: originalCode,
    modified: modifiedCode,
    language: "typescript",
    filename: "greet.ts",
    mode: "split",
  },
}

export const UnifiedView: Story = {
  args: {
    original: originalCode,
    modified: modifiedCode,
    language: "typescript",
    filename: "greet.ts",
    mode: "unified",
  },
}

export const WithActions: Story = {
  args: {
    original: originalCode,
    modified: modifiedCode,
    language: "typescript",
    filename: "greet.ts",
    onAccept: () => alert("Changes accepted!"),
    onReject: () => alert("Changes rejected!"),
  },
}

export const NewFile: Story = {
  args: {
    original: "",
    modified: `// New file
export function newFeature() {
  return "Hello from new feature!";
}`,
    language: "typescript",
    filename: "newFeature.ts",
  },
}

export const DeletedFile: Story = {
  args: {
    original: `// This file will be deleted
export function oldFeature() {
  return "This is deprecated";
}`,
    modified: "",
    language: "typescript",
    filename: "oldFeature.ts",
  },
}

export const LargeFile: Story = {
  args: {
    original: Array(50).fill("const x = 1;").join("\n"),
    modified: Array(50).fill("const x = 2;").join("\n"),
    language: "javascript",
    filename: "large.js",
  },
}

export const JSONDiff: Story = {
  args: {
    original: `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^17.0.0"
  }
}`,
    modified: `{
  "name": "my-app",
  "version": "1.1.0",
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}`,
    language: "json",
    filename: "package.json",
  },
}
