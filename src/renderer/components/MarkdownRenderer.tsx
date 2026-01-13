import React, { useMemo } from 'react';
import { cn } from '../lib/utils';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

/**
 * Simple Markdown renderer for chat messages.
 * Supports: code blocks, inline code, bold, italic, lists, links
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
    const rendered = useMemo(() => {
        if (!content) return null;

        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let i = 0;
        let key = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Code block ```
            if (line.startsWith('```')) {
                const lang = line.slice(3).trim();
                const codeLines: string[] = [];
                i++;
                while (i < lines.length && !lines[i].startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                elements.push(
                    <div key={key++} className="my-2 rounded-lg overflow-hidden">
                        {lang && (
                            <div className="bg-zinc-800 text-zinc-400 text-xs px-3 py-1 border-b border-zinc-700">
                                {lang}
                            </div>
                        )}
                        <pre className="bg-zinc-900 text-zinc-100 p-3 overflow-x-auto text-xs leading-relaxed">
                            <code>{codeLines.join('\n')}</code>
                        </pre>
                    </div>
                );
                i++;
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                elements.push(<div key={key++} className="h-2" />);
                i++;
                continue;
            }

            // Horizontal rule ---
            if (line.trim().match(/^[-*_]{3,}$/)) {
                elements.push(
                    <hr key={key++} className="my-3 border-border" />
                );
                i++;
                continue;
            }

            // Blockquote >
            if (line.startsWith('> ')) {
                const quoteLines: string[] = [];
                while (i < lines.length && lines[i].startsWith('> ')) {
                    quoteLines.push(lines[i].slice(2));
                    i++;
                }
                elements.push(
                    <blockquote key={key++} className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">
                        {quoteLines.map((ql, idx) => (
                            <p key={idx} className="text-sm">{parseInline(ql)}</p>
                        ))}
                    </blockquote>
                );
                continue;
            }

            // Headers (check longer patterns first)
            if (line.startsWith('###### ')) {
                elements.push(
                    <h6 key={key++} className="font-medium text-xs mt-2 mb-1 text-muted-foreground">
                        {parseInline(line.slice(7))}
                    </h6>
                );
                i++;
                continue;
            }
            if (line.startsWith('##### ')) {
                elements.push(
                    <h5 key={key++} className="font-medium text-xs mt-2 mb-1">
                        {parseInline(line.slice(6))}
                    </h5>
                );
                i++;
                continue;
            }
            if (line.startsWith('#### ')) {
                elements.push(
                    <h4 key={key++} className="font-semibold text-sm mt-2 mb-1">
                        {parseInline(line.slice(5))}
                    </h4>
                );
                i++;
                continue;
            }
            if (line.startsWith('### ')) {
                elements.push(
                    <h3 key={key++} className="font-semibold text-sm mt-3 mb-1">
                        {parseInline(line.slice(4))}
                    </h3>
                );
                i++;
                continue;
            }
            if (line.startsWith('## ')) {
                elements.push(
                    <h2 key={key++} className="font-semibold text-base mt-3 mb-1">
                        {parseInline(line.slice(3))}
                    </h2>
                );
                i++;
                continue;
            }
            if (line.startsWith('# ')) {
                elements.push(
                    <h1 key={key++} className="font-bold text-lg mt-3 mb-1">
                        {parseInline(line.slice(2))}
                    </h1>
                );
                i++;
                continue;
            }

            // Unordered list
            if (line.match(/^[\-\*]\s/)) {
                const listItems: string[] = [];
                while (i < lines.length && lines[i].match(/^[\-\*]\s/)) {
                    listItems.push(lines[i].slice(2));
                    i++;
                }
                elements.push(
                    <ul key={key++} className="list-disc list-inside my-1 space-y-0.5">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="text-sm">{parseInline(item)}</li>
                        ))}
                    </ul>
                );
                continue;
            }

            // Numbered list
            if (line.match(/^\d+\.\s/)) {
                const listItems: string[] = [];
                while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
                    listItems.push(lines[i].replace(/^\d+\.\s/, ''));
                    i++;
                }
                elements.push(
                    <ol key={key++} className="list-decimal list-inside my-1 space-y-0.5">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="text-sm">{parseInline(item)}</li>
                        ))}
                    </ol>
                );
                continue;
            }

            // Regular paragraph
            elements.push(
                <p key={key++} className="text-sm leading-relaxed">
                    {parseInline(line)}
                </p>
            );
            i++;
        }

        return elements;
    }, [content]);

    return (
        <div className={cn("markdown-content", className)}>
            {rendered}
        </div>
    );
};

/**
 * Parse inline markdown: bold, italic, code, links
 */
function parseInline(text: string): React.ReactNode {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Inline code `code`
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
            parts.push(
                <code key={key++} className="bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">
                    {codeMatch[1]}
                </code>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
        }

        // Bold **text**
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // Italic *text* or _text_
        const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
        if (italicMatch) {
            parts.push(<em key={key++} className="italic">{italicMatch[2]}</em>);
            remaining = remaining.slice(italicMatch[0].length);
            continue;
        }

        // Link [text](url)
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
            parts.push(
                <a
                    key={key++}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    {linkMatch[1]}
                </a>
            );
            remaining = remaining.slice(linkMatch[0].length);
            continue;
        }

        // Regular text - find next special character
        const nextSpecial = remaining.search(/[`*_\[]/);
        if (nextSpecial === -1) {
            parts.push(remaining);
            break;
        } else if (nextSpecial === 0) {
            // Special char but didn't match pattern, treat as regular
            parts.push(remaining[0]);
            remaining = remaining.slice(1);
        } else {
            parts.push(remaining.slice(0, nextSpecial));
            remaining = remaining.slice(nextSpecial);
        }
    }

    return parts.length === 1 ? parts[0] : parts;
}

/**
 * Thinking/Loading indicator with animated dots
 */
export const ThinkingIndicator: React.FC = () => {
    return (
        <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-sm">Thinking</span>
            <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
        </div>
    );
};
