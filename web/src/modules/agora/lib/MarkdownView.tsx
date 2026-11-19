import type { ReactNode } from "react";
import { parseMarkdown, type Block, type Inline } from "./markdown";

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "code":
        return (
          <code
            key={index}
            className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[0.9em]"
          >
            {node.text}
          </code>
        );
      case "link": {
        const external = /^https?:/i.test(node.href);
        return (
          <a
            key={index}
            href={node.href}
            className="font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer nofollow" }
              : {})}
          >
            {renderInline(node.children)}
          </a>
        );
      }
    }
  });
}

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const className =
        block.level === 2
          ? "mt-8 text-xl font-bold tracking-tight text-fg"
          : "mt-6 text-lg font-semibold text-fg";
      const Tag = `h${block.level}` as "h2" | "h3" | "h4";
      return (
        <Tag key={key} className={className}>
          {renderInline(block.children)}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p key={key} className="leading-relaxed text-fg">
          {renderInline(block.children)}
        </p>
      );
    case "quote":
      return (
        <blockquote
          key={key}
          className="flex flex-col gap-3 border-l-4 border-accent pl-4 text-fg-secondary"
        >
          {block.blocks.map(renderBlock)}
        </blockquote>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          key={key}
          className={`${block.ordered ? "list-decimal" : "list-disc"} flex flex-col gap-1.5 pl-6 text-fg`}
        >
          {block.items.map((item, index) => (
            <li key={index} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </Tag>
      );
    }
    case "code":
      return (
        <pre
          key={key}
          tabIndex={0}
          className="overflow-x-auto rounded-xl border border-line bg-surface-raised p-4 text-sm"
        >
          <code>{block.text}</code>
        </pre>
      );
    case "rule":
      return <hr key={key} className="border-line" />;
  }
}

/** Cuerpo de una pieza. Nunca inserta HTML: todo se construye como elementos de React. */
export function MarkdownView({ source }: { source: string }) {
  return (
    <div className="flex max-w-prose flex-col gap-4 text-base">
      {parseMarkdown(source).map(renderBlock)}
    </div>
  );
}
