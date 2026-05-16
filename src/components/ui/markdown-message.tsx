"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  streaming?: boolean;
}

export function MarkdownMessage({ content, streaming }: MarkdownMessageProps) {
  return (
    <div className={cn("markdown-body", streaming && "streaming")}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0 pb-2 border-b border-border/40"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="text-base font-bold text-foreground mt-6 mb-2 first:mt-0"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="text-sm font-semibold text-foreground/90 mt-5 mb-1.5 first:mt-0"
              {...props}
            >
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p
              className="text-sm leading-[1.8] text-foreground/85 my-2.5 first:mt-0 last:mb-0"
              {...props}
            >
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong
              className="font-bold text-foreground"
              {...props}
            >
              {children}
            </strong>
          ),
          ul: ({ children, ...props }) => (
            <ul
              className="my-2.5 pl-0 space-y-1.5 list-none first:mt-0 last:mb-0"
              {...props}
            >
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol
              className="my-2.5 pl-0 space-y-1.5 list-none first:mt-0 last:mb-0"
              {...props}
            >
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li
              className="text-sm text-foreground/85 leading-[1.7] pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-muted-foreground/50"
              {...props}
            >
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="my-3 pl-4 border-l-2 border-sky-400/50 bg-sky-400/5 py-2.5 pr-3 rounded-r-lg text-sm text-foreground/80 leading-[1.7] first:mt-0 last:mb-0"
              {...props}
            >
              {children}
            </blockquote>
          ),
          hr: ({ ...props }) => (
            <hr
              className="my-5 border-border/30"
              {...props}
            />
          ),
          table: ({ children, ...props }) => (
            <div className="my-4 overflow-x-auto first:mt-0 last:mb-0">
              <table
                className="w-full text-sm border-collapse"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead
              className="border-b border-border/60"
              {...props}
            >
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="text-left py-2 px-3 text-xs font-semibold text-foreground/70 bg-muted/30 first:rounded-l-md last:rounded-r-md"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="py-2 px-3 text-sm text-foreground/80 border-b border-border/20"
              {...props}
            >
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr
              className="hover:bg-muted/20 transition-colors"
              {...props}
            >
              {children}
            </tr>
          ),
          code: ({ children, className, ...props }: any) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-muted/80 text-xs text-sky-500 font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={cn("block my-3 p-3 rounded-xl bg-muted/60 text-xs leading-[1.6] overflow-x-auto", className)}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre
              className="my-3 first:mt-0 last:mb-0"
              {...props}
            >
              {children}
            </pre>
          ),
          em: ({ children, ...props }) => (
            <em
              className="italic text-foreground/80"
              {...props}
            >
              {children}
            </em>
          ),
        }}
      >
        {content}
      </Markdown>
      {streaming && (
        <span className="inline-block w-2 h-4 bg-sky-400/60 rounded-sm ml-0.5 animate-pulse align-text-bottom" />
      )}
    </div>
  );
}
