import * as React from "react"
import { cn } from "../../../lib/utils"
import { CodeBlock, type CodeBlockProps } from "./code-block"

export interface CodeBlockRenderProps {
  code: string
  language?: string
  filename?: string
}

export interface MarkdownComponents {
  h1?: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>
  h2?: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>
  h3?: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>
  h4?: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>
  p?: React.ComponentType<React.HTMLAttributes<HTMLParagraphElement>>
  a?: React.ComponentType<React.AnchorHTMLAttributes<HTMLAnchorElement>>
  ul?: React.ComponentType<React.HTMLAttributes<HTMLUListElement>>
  ol?: React.ComponentType<React.OlHTMLAttributes<HTMLOListElement>>
  li?: React.ComponentType<React.LiHTMLAttributes<HTMLLIElement>>
  blockquote?: React.ComponentType<React.BlockquoteHTMLAttributes<HTMLQuoteElement>>
  code?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  pre?: React.ComponentType<React.HTMLAttributes<HTMLPreElement>>
  table?: React.ComponentType<React.TableHTMLAttributes<HTMLTableElement>>
  th?: React.ComponentType<React.ThHTMLAttributes<HTMLTableCellElement>>
  td?: React.ComponentType<React.TdHTMLAttributes<HTMLTableCellElement>>
  hr?: React.ComponentType<React.HTMLAttributes<HTMLHRElement>>
  img?: React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>
}

export interface MarkdownViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string
  /** Custom renderer for code blocks */
  renderCodeBlock?: (props: CodeBlockRenderProps) => React.ReactNode
  /** Handle link clicks */
  onLinkClick?: (href: string, event: React.MouseEvent) => void
  /** Custom markdown parser - receives content, returns React nodes */
  parser?: (content: string, options: MarkdownParserOptions) => React.ReactNode
  /** Component overrides */
  components?: Partial<MarkdownComponents>
  /** CodeBlock props to pass to default code block renderer */
  codeBlockProps?: Partial<CodeBlockProps>
}

export interface MarkdownParserOptions {
  components: MarkdownComponents
  onLinkClick?: (href: string, event: React.MouseEvent) => void
  renderCodeBlock?: (props: CodeBlockRenderProps) => React.ReactNode
}

// Simple inline markdown parser (for basic rendering without external deps)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/)
    if (boldMatch) {
      elements.push(<strong key={key++}>{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Italic *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/)
    if (italicMatch) {
      elements.push(<em key={key++}>{italicMatch[2]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      elements.push(
        <code
          key={key++}
          className="px-1 py-0.5 rounded bg-muted font-mono text-[0.9em]"
        >
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      elements.push(
        <a
          key={key++}
          href={linkMatch[2]}
          className="text-primary hover:underline"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Strikethrough ~~text~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/)
    if (strikeMatch) {
      elements.push(<del key={key++}>{strikeMatch[1]}</del>)
      remaining = remaining.slice(strikeMatch[0].length)
      continue
    }

    // Regular text - consume until next special char
    const textMatch = remaining.match(/^[^*_`\[~]+/)
    if (textMatch) {
      elements.push(textMatch[0])
      remaining = remaining.slice(textMatch[0].length)
      continue
    }

    // Single special char that didn't match a pattern
    elements.push(remaining[0])
    remaining = remaining.slice(1)
  }

  return elements
}

// Default simple markdown parser
function defaultParser(
  content: string,
  options: MarkdownParserOptions
): React.ReactNode {
  const { renderCodeBlock } = options
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block ```lang
    if (line.startsWith("```")) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // Skip closing ```

      const code = codeLines.join("\n")
      if (renderCodeBlock) {
        elements.push(
          <div key={key++} className="my-3">
            {renderCodeBlock({ code, language })}
          </div>
        )
      } else {
        elements.push(
          <CodeBlock
            key={key++}
            code={code}
            language={language}
            className="my-3"
          />
        )
      }
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const Tag = `h${level}` as keyof JSX.IntrinsicElements
      const sizes: Record<number, string> = {
        1: "text-2xl font-bold mt-6 mb-3",
        2: "text-xl font-semibold mt-5 mb-2",
        3: "text-lg font-semibold mt-4 mb-2",
        4: "text-base font-semibold mt-3 mb-1",
        5: "text-sm font-semibold mt-2 mb-1",
        6: "text-sm font-medium mt-2 mb-1",
      }
      elements.push(
        <Tag key={key++} className={sizes[level]}>
          {parseInlineMarkdown(text)}
        </Tag>
      )
      i++
      continue
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      elements.push(<hr key={key++} className="my-4 border-border" />)
      i++
      continue
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].slice(1).trim())
        i++
      }
      elements.push(
        <blockquote
          key={key++}
          className="my-3 pl-4 border-l-2 border-muted-foreground/30 text-muted-foreground italic"
        >
          {quoteLines.map((l, j) => (
            <p key={j}>{parseInlineMarkdown(l)}</p>
          ))}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (line.match(/^[-*+]\s/)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^[-*+]\s/)) {
        listItems.push(lines[i].replace(/^[-*+]\s/, ""))
        i++
      }
      elements.push(
        <ul key={key++} className="my-2 ml-4 list-disc space-y-1">
          {listItems.map((item, j) => (
            <li key={j}>{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ""))
        i++
      }
      elements.push(
        <ol key={key++} className="my-2 ml-4 list-decimal space-y-1">
          {listItems.map((item, j) => (
            <li key={j}>{parseInlineMarkdown(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    // Task list
    if (line.match(/^[-*+]\s\[[ x]\]/i)) {
      const listItems: { checked: boolean; text: string }[] = []
      while (i < lines.length && lines[i].match(/^[-*+]\s\[[ x]\]/i)) {
        const checked = lines[i].match(/\[x\]/i) !== null
        const text = lines[i].replace(/^[-*+]\s\[[ x]\]\s*/i, "")
        listItems.push({ checked, text })
        i++
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                readOnly
                className="mt-1 cursor-default"
              />
              <span className={item.checked ? "text-muted-foreground line-through" : ""}>
                {parseInlineMarkdown(item.text)}
              </span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].match(/^\|?[\s-:|]+\|?$/)) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i])
        i++
      }

      if (tableLines.length >= 2) {
        const parseRow = (row: string) =>
          row
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0)

        const headers = parseRow(tableLines[0])
        const rows = tableLines.slice(2).map(parseRow)

        elements.push(
          <div key={key++} className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {headers.map((header, j) => (
                    <th
                      key={j}
                      className="px-3 py-2 text-left font-semibold text-muted-foreground"
                    >
                      {parseInlineMarkdown(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, j) => (
                  <tr key={j} className="border-b border-border/50">
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2">
                        {parseInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Empty line
    if (line.trim() === "") {
      i++
      continue
    }

    // Paragraph
    const paragraphLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith(">") &&
      !lines[i].match(/^[-*+]\s/) &&
      !lines[i].match(/^\d+\.\s/) &&
      !lines[i].match(/^(-{3,}|\*{3,}|_{3,})$/)
    ) {
      paragraphLines.push(lines[i])
      i++
    }

    if (paragraphLines.length > 0) {
      const text = paragraphLines.join(" ")
      elements.push(
        <p key={key++} className="my-2 leading-relaxed">
          {parseInlineMarkdown(text)}
        </p>
      )
    }
  }

  return elements
}

const MarkdownViewer = React.forwardRef<HTMLDivElement, MarkdownViewerProps>(
  (
    {
      className,
      content,
      renderCodeBlock,
      onLinkClick,
      parser,
      components = {},
      codeBlockProps,
      ...props
    },
    ref
  ) => {
    const defaultComponents: MarkdownComponents = {
      ...components,
    }

    const handleLinkClick = React.useCallback(
      (event: React.MouseEvent) => {
        const target = event.target as HTMLElement
        if (target.tagName === "A") {
          const href = (target as HTMLAnchorElement).href
          if (onLinkClick) {
            event.preventDefault()
            onLinkClick(href, event)
          }
        }
      },
      [onLinkClick]
    )

    const defaultRenderCodeBlock = React.useCallback(
      (props: CodeBlockRenderProps) => (
        <CodeBlock {...props} {...codeBlockProps} />
      ),
      [codeBlockProps]
    )

    const rendered = React.useMemo(() => {
      const parserOptions: MarkdownParserOptions = {
        components: defaultComponents,
        onLinkClick,
        renderCodeBlock: renderCodeBlock || defaultRenderCodeBlock,
      }

      if (parser) {
        return parser(content, parserOptions)
      }

      return defaultParser(content, parserOptions)
    }, [content, parser, defaultComponents, onLinkClick, renderCodeBlock, defaultRenderCodeBlock])

    return (
      <div
        ref={ref}
        className={cn(
          "markdown-viewer prose prose-sm max-w-none",
          "text-foreground",
          "[&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline",
          "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em]",
          "[&_pre]:bg-transparent [&_pre]:p-0",
          className
        )}
        onClick={handleLinkClick}
        {...props}
      >
        {rendered}
      </div>
    )
  }
)
MarkdownViewer.displayName = "MarkdownViewer"

export { MarkdownViewer }
