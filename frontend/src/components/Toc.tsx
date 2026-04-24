/**
 * TOC目录组件
 * 右侧固定目录，滚动时自动高亮当前章节
 * 移动端隐藏
 */
import { useState, useEffect } from "react";
import type { TocItem } from "../types";

interface TocProps {
  items: TocItem[];
}

export default function Toc({ items }: TocProps) {
  const [activeId, setActiveId] = useState<string>("");

  /* 监听滚动，自动高亮当前阅读章节 */
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    /* 观察所有标题元素 */
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="hidden xl:block sticky top-20 ml-8 w-56 shrink-0">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
        目录
      </div>
      <ul className="space-y-1.5 border-l border-gray-200 dark:border-gray-700">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-xs leading-relaxed transition-colors duration-200 hover:text-brand-500 ${
                activeId === item.id
                  ? "text-brand-500 font-medium border-l-2 border-brand-500 -ml-px pl-[calc(0.75rem-1px)]"
                  : "text-gray-500 dark:text-gray-400 pl-3"
              }`}
              style={{ paddingLeft: `${(item.level - 1) * 8 + 12}px` }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
