import * as React from "react"
import { cn } from "../../../lib/utils"

// Simple syntax highlighting patterns
type TokenType = "keyword" | "string" | "comment" | "number" | "function" | "operator" | "punctuation"

interface HighlightRule {
  pattern: RegExp
  type: TokenType
}

// Language-specific rules
const languageRules: Record<string, HighlightRule[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, type: "string" },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|throw|finally|typeof|instanceof|in|of|null|undefined|true|false)\b/g, type: "keyword" },
    { pattern: /\b(\d+\.?\d*)\b/g, type: "number" },
    { pattern: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, type: "function" },
    { pattern: /([+\-*/%=<>!&|^~?:]|&&|\|\||===|!==|==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|=>)/g, type: "operator" },
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, type: "string" },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|throw|finally|typeof|instanceof|in|of|null|undefined|true|false|type|interface|enum|implements|public|private|protected|readonly|abstract|static|as|is|keyof|never|unknown|any|void|boolean|number|string|symbol|object)\b/g, type: "keyword" },
    { pattern: /\b(\d+\.?\d*)\b/g, type: "number" },
    { pattern: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, type: "function" },
    { pattern: /([+\-*/%=<>!&|^~?:]|&&|\|\||===|!==|==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|=>)/g, type: "operator" },
  ],
  python: [
    { pattern: /(#.*$)/gm, type: "comment" },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, type: "string" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|and|or|not|in|is|True|False|None|pass|break|continue|raise|global|nonlocal|assert|async|await)\b/g, type: "keyword" },
    { pattern: /\b(\d+\.?\d*)\b/g, type: "number" },
    { pattern: /\b([a-zA-Z_][\w]*)\s*(?=\()/g, type: "function" },
    { pattern: /([+\-*/%=<>!&|^~@]|==|!=|<=|>=|\*\*|\/\/|\+=|-=|\*=|\/=|->)/g, type: "operator" },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /(#[0-9a-fA-F]{3,8})\b/g, type: "number" },
    { pattern: /\b(\d+\.?\d*)(px|em|rem|%|vh|vw|deg|s|ms)?\b/g, type: "number" },
    { pattern: /(@media|@keyframes|@import|@font-face|@supports|!important)\b/g, type: "keyword" },
  ],
  html: [
    { pattern: /(<!--[\s\S]*?-->)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /(<\/?[\w-]+)/g, type: "keyword" },
    { pattern: /([\w-]+)(?==)/g, type: "function" },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")(?=\s*:)/g, type: "function" },
    { pattern: /("(?:[^"\\]|\\.)*")/g, type: "string" },
    { pattern: /\b(true|false|null)\b/g, type: "keyword" },
    { pattern: /\b(-?\d+\.?\d*)\b/g, type: "number" },
  ],
  bash: [
    { pattern: /(#.*$)/gm, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|source|alias|unset|local|readonly)\b/g, type: "keyword" },
    { pattern: /(\$[\w{}_]+|\$\{[^}]+\})/g, type: "function" },
  ],
}

// Alias common language names
const languageAliases: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
}

// Token colors using CSS variables
const tokenColors: Record<TokenType, string> = {
  keyword: "text-[hsl(var(--code-keyword,280_100%_70%))]",
  string: "text-[hsl(var(--code-string,120_70%_60%))]",
  comment: "text-[hsl(var(--code-comment,0_0%_50%))]",
  number: "text-[hsl(var(--code-number,30_100%_60%))]",
  function: "text-[hsl(var(--code-function,200_100%_70%))]",
  operator: "text-[hsl(var(--code-operator,0_0%_70%))]",
  punctuation: "text-[hsl(var(--code-punctuation,0_0%_60%))]",
}

// Simple highlighter function
function simpleHighlight(code: string, language: string): React.ReactNode {
  const lang = languageAliases[language] || language
  const rules = languageRules[lang]

  if (!rules) {
    // No rules for this language, return plain text
    return code
  }

  // Find all matches
  const matches: { start: number; end: number; type: TokenType; text: string }[] = []

  for (const rule of rules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
    let match
    while ((match = regex.exec(code)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: rule.type,
        text: match[0],
      })
    }
  }

  // Sort matches by start position, then by length (longer matches first)
  matches.sort((a, b) => a.start - b.start || b.end - a.end)

  // Remove overlapping matches (keep the first one)
  const filtered: typeof matches = []
  let lastEnd = 0
  for (const match of matches) {
    if (match.start >= lastEnd) {
      filtered.push(match)
      lastEnd = match.end
    }
  }

  // Build result
  const result: React.ReactNode[] = []
  let pos = 0

  for (const match of filtered) {
    // Add plain text before this match
    if (match.start > pos) {
      result.push(code.slice(pos, match.start))
    }
    // Add highlighted match
    result.push(
      <span key={`${match.start}-${match.type}`} className={tokenColors[match.type]}>
        {match.text}
      </span>
    )
    pos = match.end
  }

  // Add remaining text
  if (pos < code.length) {
    result.push(code.slice(pos))
  }

  return result
}

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
  collapsible?: boolean
  defaultCollapsed?: boolean
  copyable?: boolean
  wrapLines?: boolean
  maxHeight?: number | string
  onCopy?: () => void
  /** Enable syntax highlighting (default: true) */
  highlight?: boolean
  /** Custom syntax highlighter - receives code and language, returns highlighted HTML or React nodes */
  highlighter?: (code: string, language: string) => React.ReactNode
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  (
    {
      className,
      code,
      language = "text",
      filename,
      showLineNumbers = true,
      highlightLines = [],
      collapsible = false,
      defaultCollapsed = false,
      copyable = true,
      wrapLines = false,
      maxHeight,
      onCopy,
      highlight = true,
      highlighter,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed)
    const [copied, setCopied] = React.useState(false)

    const lines = code.split("\n")
    const lineCount = lines.length

    const handleCopy = React.useCallback(async () => {
      try {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        onCopy?.()
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Failed to copy:", err)
      }
    }, [code, onCopy])

    const toggleCollapse = React.useCallback(() => {
      setCollapsed((prev) => !prev)
    }, [])

    // Get highlight function to use
    const highlightFn = highlighter || (highlight ? simpleHighlight : null)

    // Render code content - either highlighted or plain
    const renderCode = () => {
      return lines.map((line, index) => {
        const lineNumber = index + 1
        const isHighlighted = highlightLines.includes(lineNumber)

        // Highlight the line content
        const lineContent = highlightFn ? highlightFn(line, language) : line

        return (
          <div
            key={index}
            className={cn(
              "code-line flex",
              isHighlighted && "bg-[hsl(var(--line-highlight))]"
            )}
          >
            {showLineNumbers && (
              <span
                className="code-line-number select-none pr-4 text-right text-muted-foreground/60 w-[3ch] shrink-0"
                style={{ minWidth: `${String(lineCount).length + 1}ch` }}
              >
                {lineNumber}
              </span>
            )}
            <span
              className={cn(
                "code-line-content flex-1",
                wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"
              )}
            >
              {lineContent || " "}
            </span>
          </div>
        )
      })
    }

    return (
      <div
        ref={ref}
        className={cn(
          "code-block group relative rounded-md border border-border overflow-hidden",
          "bg-[hsl(var(--code-background))] text-[hsl(var(--code-foreground))]",
          className
        )}
        {...props}
      >
        {/* Header */}
        {(filename || collapsible || copyable) && (
          <div className="code-block-header flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              {collapsible && (
                <button
                  onClick={toggleCollapse}
                  className="p-0.5 hover:bg-muted rounded cursor-pointer transition-colors"
                  aria-label={collapsed ? "Expand code" : "Collapse code"}
                >
                  <svg
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform",
                      !collapsed && "rotate-90"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              {filename && (
                <span className="text-xs font-medium text-muted-foreground">
                  {filename}
                </span>
              )}
              {language && language !== "text" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium">
                  {language}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {copyable && (
                <button
                  onClick={handleCopy}
                  className={cn(
                    "p-1 rounded cursor-pointer transition-colors",
                    "text-muted-foreground hover:text-foreground hover:bg-muted",
                    copied && "text-green-500"
                  )}
                  aria-label={copied ? "Copied!" : "Copy code"}
                >
                  {copied ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Code content */}
        {!collapsed && (
          <div
            className={cn(
              "code-block-content overflow-auto",
              "font-mono text-[13px] leading-[1.6]"
            )}
            style={{
              maxHeight: maxHeight,
              fontFamily: "var(--font-family-mono)",
            }}
          >
            <pre className="p-3 m-0">
              <code className="block">{renderCode()}</code>
            </pre>
          </div>
        )}

        {/* Collapsed indicator */}
        {collapsed && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {lineCount} lines hidden
          </div>
        )}
      </div>
    )
  }
)
CodeBlock.displayName = "CodeBlock"

export { CodeBlock, simpleHighlight }
