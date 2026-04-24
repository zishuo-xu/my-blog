/**
 * 文章详情页
 * 头部：标题、发布日期、分类、标签、阅读量
 * 内容区：MD完美渲染，代码块带语法高亮，图片懒加载+点击放大
 * 右侧固定TOC目录（移动端隐藏），滚动时自动高亮当前章节
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getArticleDetail } from "../api/articles";
import type { Article, TocItem } from "../types";
import MarkdownRenderer from "../components/MarkdownRenderer";
import Toc from "../components/Toc";

export default function ArticleDetail() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* 加载文章详情 */
  useEffect(() => {
    if (!idOrSlug) return;

    const fetchArticle = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getArticleDetail(idOrSlug);
        setArticle(res.data.data);
        /* 从Markdown原文中提取TOC */
        extractTocFromMd(res.data.data.content_md || "");
      } catch (err) {
        setError("文章不存在或加载失败");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [idOrSlug]);

  /* 从Markdown原文中提取目录结构 */
  const extractTocFromMd = (md: string) => {
    const pattern = /^(#{1,6})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;
    while ((match = pattern.exec(md)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^\w一-鿿]+/g, "-").replace(/^-|-$/g, "");
      items.push({ level, text, id });
    }
    setToc(items);
  };

  /* 格式化日期 */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="content-container flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="content-container flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">{error || "文章不存在"}</div>
      </div>
    );
  }

  return (
    <div className="content-container py-10">
      <div className="flex gap-8">
        {/* 左侧：文章内容区 */}
        <div className="flex-1 min-w-0">
          {/* 文章头部 */}
          <header className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-400 dark:text-gray-500">
              {article.published_at && <span>{formatDate(article.published_at)}</span>}
              <span>{article.read_time} 分钟</span>
              <span>{article.read_count} 次阅读</span>
              {article.category && (
                <a href={`/categories?category_id=${article.category.id}`} className="text-brand-500 hover:text-brand-600 transition-colors">
                  {article.category.name}
                </a>
              )}
            </div>
            {/* 标签 */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {article.tags.map((tag) => (
                  <a key={tag.id} href={`/tags?tag_id=${tag.id}`} className="tag-pill">
                    {tag.name}
                  </a>
                ))}
              </div>
            )}
          </header>

          {/* MD渲染内容：用content_md前端渲染，和后台预览区100%一致 */}
          <MarkdownRenderer content={article.content_md || ""} />
        </div>

        {/* 右侧：TOC目录（移动端隐藏） */}
        <Toc items={toc} />
      </div>
    </div>
  );
}
