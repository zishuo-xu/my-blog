/**
 * Markdown渲染组件
 * 前台详情页和后台预览区共用，保证样式100%一致
 * 使用react-markdown + remark-gfm + rehype-highlight
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/* 自定义渲染器：保证MD渲染后的样式和极简美观规范一致 */
const components: Components = {
  /* 图片：懒加载+点击放大 */
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt || ""}
      loading="lazy"
      className="rounded-md max-w-full h-auto my-4 mx-auto block"
      onClick={(e) => {
        /* 点击图片放大查看 */
        const img = e.target as HTMLImageElement;
        if (img.requestFullscreen) {
          img.requestFullscreen();
        }
      }}
      {...props}
    />
  ),
  /* 代码块：包裹一层容器，方便后续添加复制按钮和语言标识 */
  pre: ({ children, ...props }) => (
    <pre className="relative group" {...props}>
      {children}
    </pre>
  ),
  /* 行内代码 */
  code: ({ className, children, ...props }) => {
    /* 判断是否为代码块内的code（有className说明是高亮代码块） */
    const isBlock = !!className;
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    /* 行内代码 */
    return (
      <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-brand-600 dark:text-brand-400" {...props}>
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
};

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-gray max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
