import type { Meta, StoryObj } from "@storybook/react"
import { MarkdownViewer } from "../components/ui/dev"

const meta: Meta<typeof MarkdownViewer> = {
  title: "UI/MarkdownViewer",
  component: MarkdownViewer,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof MarkdownViewer>

const basicMarkdown = `# Heading 1
## Heading 2
### Heading 3

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2
- List item 3

1. Numbered item 1
2. Numbered item 2
3. Numbered item 3

> This is a blockquote
> with multiple lines

[Link to example](https://example.com)

Inline \`code\` looks like this.
`

const codeBlockMarkdown = `# Code Example

Here's a TypeScript function:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

And some JSON:

\`\`\`json
{
  "message": "Hello, World!"
}
\`\`\`
`

const tableMarkdown = `# Table Example

| Name | Age | City |
|------|-----|------|
| Alice | 25 | NYC |
| Bob | 30 | LA |
| Charlie | 35 | Chicago |
`

const taskListMarkdown = `# Task List

- [x] Completed task
- [x] Another completed task
- [ ] Pending task
- [ ] Another pending task
`

const fullMarkdown = `# Project Documentation

## Overview

This project is a **comprehensive UI library** for building *developer tools*.

### Features

- Multi-theme support
- TypeScript-first design
- Accessible components
- Desktop-optimized

## Installation

\`\`\`bash
npm install adnia-ui
\`\`\`

## Usage

\`\`\`typescript
import { CodeBlock, MarkdownViewer } from 'adnia-ui';

function App() {
  return (
    <MarkdownViewer content={markdown} />
  );
}
\`\`\`

## API Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| content | string | - | Markdown content |
| onLinkClick | function | - | Link click handler |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

> **Note:** Please follow the coding guidelines.

---

*Last updated: 2024*
`

export const Default: Story = {
  args: {
    content: basicMarkdown,
  },
}

export const WithCodeBlocks: Story = {
  args: {
    content: codeBlockMarkdown,
  },
}

export const WithTable: Story = {
  args: {
    content: tableMarkdown,
  },
}

export const WithTaskList: Story = {
  args: {
    content: taskListMarkdown,
  },
}

export const FullDocumentation: Story = {
  args: {
    content: fullMarkdown,
  },
}

export const WithLinkHandler: Story = {
  args: {
    content: `Click [this link](https://example.com) to test the handler.`,
    onLinkClick: (href, e) => {
      e.preventDefault()
      alert(`Link clicked: ${href}`)
    },
  },
}
