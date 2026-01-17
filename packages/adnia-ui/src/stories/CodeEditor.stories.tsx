import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { CodeEditor, type CodeDecoration } from "../components/ui/dev"

const meta: Meta<typeof CodeEditor> = {
  title: "UI/CodeEditor",
  component: CodeEditor,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof CodeEditor>

const sampleCode = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate the 10th Fibonacci number
const result = fibonacci(10);
console.log(\`Fibonacci(10) = \${result}\`);`

const pythonCode = `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

numbers = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(numbers))`

// Interactive demo
function CodeEditorDemo() {
  const [code, setCode] = React.useState(sampleCode)
  const [saved, setSaved] = React.useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      <CodeEditor
        value={code}
        onChange={setCode}
        language="typescript"
        onSave={handleSave}
        onFormat={() => alert("Format triggered (Ctrl+Shift+F)")}
        onRun={() => alert("Run triggered (Ctrl+Enter)")}
        className="h-[350px]"
      />
      {saved && (
        <p className="text-sm text-green-600">Saved successfully!</p>
      )}
    </div>
  )
}

export const Interactive: Story = {
  render: () => <CodeEditorDemo />,
}

export const Default: Story = {
  args: {
    value: sampleCode,
    language: "typescript",
    className: "h-[300px]",
  },
}

export const ReadOnly: Story = {
  args: {
    value: sampleCode,
    language: "typescript",
    readOnly: true,
    className: "h-[300px]",
  },
}

export const WithLineNumbers: Story = {
  args: {
    value: sampleCode,
    language: "typescript",
    showLineNumbers: true,
    className: "h-[300px]",
  },
}

export const WithMinimap: Story = {
  args: {
    value: sampleCode,
    language: "typescript",
    showMinimap: true,
    className: "h-[300px]",
  },
}

export const PythonCode: Story = {
  args: {
    value: pythonCode,
    language: "python",
    className: "h-[350px]",
  },
}

const decorations: CodeDecoration[] = [
  { line: 2, type: "error", message: "Potential stack overflow for large n" },
  { line: 6, type: "warning", message: "Consider memoization for better performance" },
  { line: 7, type: "info", message: "Result will be 55" },
]

export const WithDecorations: Story = {
  args: {
    value: sampleCode,
    language: "typescript",
    decorations,
    className: "h-[300px]",
  },
}

export const WithAllActions: Story = {
  args: {
    value: sampleCode,
    language: "typescript",
    onSave: () => alert("Save (Ctrl+S)"),
    onFormat: () => alert("Format (Ctrl+Shift+F)"),
    onRun: () => alert("Run (Ctrl+Enter)"),
    className: "h-[300px]",
  },
}

export const CustomTheme: Story = {
  args: {
    value: sampleCode,
    language: "typescript",
    theme: "vs-dark",
    className: "h-[300px]",
  },
}

export const WordWrap: Story = {
  args: {
    value: `const veryLongString = "This is a very long string that will demonstrate word wrapping in the code editor. It should wrap to the next line when it reaches the edge of the container instead of scrolling horizontally.";

console.log(veryLongString);`,
    language: "typescript",
    wordWrap: true,
    className: "h-[200px]",
  },
}
