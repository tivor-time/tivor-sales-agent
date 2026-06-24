'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

/**
 * Renders assistant chat content as Markdown. react-markdown does NOT render raw
 * HTML by default (we intentionally do not add rehype-raw), so untrusted model
 * output is safe. Styling is via arbitrary-variant classes on the wrapper so
 * inline code vs fenced blocks both look right.
 */
export function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-foreground',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        // Block flow
        '[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-1 [&_li]:marker:text-muted-foreground/60',
        '[&_li>ul]:my-1 [&_li>ol]:my-1',
        // Emphasis
        '[&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic',
        // Links
        '[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-2 [&_a]:transition-colors hover:[&_a]:decoration-primary',
        // Headings
        '[&_h1]:mb-1.5 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:tracking-tight',
        '[&_h2]:mb-1.5 [&_h2]:mt-4 [&_h2]:text-[0.9375rem] [&_h2]:font-semibold [&_h2]:tracking-tight',
        '[&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold',
        // Inline code
        '[&_code]:rounded [&_code]:border [&_code]:border-border/60 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125em] [&_code]:text-foreground',
        // Code blocks
        '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-muted [&_pre]:p-3.5 [&_pre]:text-[0.8125rem] [&_pre]:leading-relaxed scrollbar-thin',
        '[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground',
        // Blockquote
        '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3.5 [&_blockquote]:text-muted-foreground',
        // Horizontal rule
        '[&_hr]:my-4 [&_hr]:border-border',
        // Tables (remark-gfm)
        '[&_table]:my-3 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-[0.8125rem] scrollbar-thin',
        '[&_thead]:border-b [&_thead]:border-border',
        '[&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground',
        '[&_td]:border-t [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-1.5',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node, ...props }) {
            void node
            return <a {...props} target="_blank" rel="noopener noreferrer" />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
