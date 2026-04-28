/**
 * Markdown渲染组件
 * 支持：数学公式(KaTeX)、Mermaid图表、任务列表、脚注、提示块
 */
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";
import MermaidDiagram from "./MermaidDiagram";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/* Callout 类型配置 */
const CALLOUT_TYPES: Record<
  string,
  { icon: string; color: string; border: string; bg: string; darkBg: string; darkBorder: string; darkText: string }
> = {
  info: {
    icon: "ℹ️",
    color: "text-blue-700",
    border: "border-blue-300",
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-900/20",
    darkBorder: "dark:border-blue-700",
    darkText: "dark:text-blue-200",
  },
  warning: {
    icon: "⚠️",
    color: "text-yellow-700",
    border: "border-yellow-300",
    bg: "bg-yellow-50",
    darkBg: "dark:bg-yellow-900/20",
    darkBorder: "dark:border-yellow-700",
    darkText: "dark:text-yellow-200",
  },
  success: {
    icon: "✅",
    color: "text-green-700",
    border: "border-green-300",
    bg: "bg-green-50",
    darkBg: "dark:bg-green-900/20",
    darkBorder: "dark:border-green-700",
    darkText: "dark:text-green-200",
  },
  error: {
    icon: "❌",
    color: "text-red-700",
    border: "border-red-300",
    bg: "bg-red-50",
    darkBg: "dark:bg-red-900/20",
    darkBorder: "dark:border-red-700",
    darkText: "dark:text-red-200",
  },
  tip: {
    icon: "💡",
    color: "text-purple-700",
    border: "border-purple-300",
    bg: "bg-purple-50",
    darkBg: "dark:bg-purple-900/20",
    darkBorder: "dark:border-purple-700",
    darkText: "dark:text-purple-200",
  },
  note: {
    icon: "📝",
    color: "text-gray-700",
    border: "border-gray-300",
    bg: "bg-gray-50",
    darkBg: "dark:bg-gray-800",
    darkBorder: "dark:border-gray-600",
    darkText: "dark:text-gray-200",
  },
};

/* 解析 callout 标记，返回类型和标题 */
function parseCallout(text: string): { type: string; title: string } | null {
  const match = text.match(/^\[!(INFO|WARNING|SUCCESS|ERROR|TIP|NOTE)\]\s*(.*)$/i);
  if (!match) return null;
  const type = match[1].toLowerCase();
  const title = match[2].trim() || match[1].toUpperCase();
  return { type, title };
}

/* 自定义渲染器 */
const components: Components = {
  /* 图片：懒加载+点击放大 */
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt || ""}
      loading="lazy"
      className="rounded-md max-w-full h-auto my-4 mx-auto block"
      onClick={(e) => {
        const img = e.target as HTMLImageElement;
        if (img.requestFullscreen) {
          img.requestFullscreen();
        }
      }}
      {...props}
    />
  ),

  /* 代码块：区分普通代码和 Mermaid */
  pre: ({ children, ...props }) => {
    // 检查是否是 mermaid 代码块
    const childArray = Array.isArray(children) ? children : [children];
    const firstChild = childArray[0];
    if (
      typeof firstChild === "object" &&
      firstChild !== null &&
      "props" in firstChild
    ) {
      const codeProps = firstChild.props as { className?: string; children?: string };
      if (codeProps?.className?.includes("language-mermaid")) {
        return <MermaidDiagram code={codeProps.children || ""} />;
      }
    }
    return (
      <pre className="relative group" {...props}>
        {children}
      </pre>
    );
  },

  /* 行内代码 */
  code: ({ className, children, ...props }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="font-mono text-sm px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-brand-600 dark:text-brand-400"
        {...props}
      >
        {children}
      </code>
    );
  },

  /* 链接：新窗口打开 */
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),

  /* 表格：包裹一层横向滚动容器 */
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table {...props}>{children}</table>
    </div>
  ),

  /* Blockquote：支持 Callout 提示块 */
  blockquote: ({ children }) => {
    // 提取第一个 p 的文本以检测 callout
    let calloutType: string | null = null;
    let calloutTitle = "";

    // 尝试从 children 中提取 callout 信息
    if (Array.isArray(children)) {
      const firstChild = children[0];
      if (
        typeof firstChild === "object" &&
        firstChild !== null &&
        "props" in firstChild &&
        firstChild.type === "p"
      ) {
        const pChildren = firstChild.props.children;
        let text = "";
        if (typeof pChildren === "string") {
          text = pChildren;
        } else if (Array.isArray(pChildren)) {
          text = pChildren
            .map((c: unknown) => (typeof c === "string" ? c : ""))
            .join("");
        }
        const result = parseCallout(text);
        if (result) {
          calloutType = result.type;
          calloutTitle = result.title;
        }
      }
    }

    if (calloutType) {
      const style = CALLOUT_TYPES[calloutType] || CALLOUT_TYPES.info;
      return (
        <div
          className={`rounded-lg border-l-4 p-4 my-4 ${style.bg} ${style.border} ${style.color} ${style.darkBg} ${style.darkBorder} ${style.darkText}`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm mb-1">
            <span>{style.icon}</span>
            <span>{calloutTitle}</span>
          </div>
          <div className="text-sm opacity-90">{children}</div>
        </div>
      );
    }

    return (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
        {children}
      </blockquote>
    );
  },
};

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-gray max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex, [rehypeHighlight, { detect: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
