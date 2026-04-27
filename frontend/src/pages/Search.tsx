/**
 * 搜索页
 * 支持按标题/内容/标签全文搜索，输入时实时返回结果，搜索结果高亮匹配关键词
 */
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchArticles } from "../api/articles";
import type { ArticleListItem } from "../types";

export default function Search() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  /* URL参数中有q时自动搜索 */
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  /* 执行搜索 */
  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchArticles({ q: q.trim(), page_size: 20 });
      const data = res.data.data;
      setArticles(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("搜索失败:", err);
    } finally {
      setLoading(false);
    }
  };

  /* 表单提交搜索 */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
    }
  };

  /* 高亮匹配关键词 */
  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    const lowerKeyword = keyword.toLowerCase();
    return parts.map((part, i) =>
      part.toLowerCase() === lowerKeyword ? (
        <mark key={i} className="bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  /* 格式化日期 */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  return (
    <div className="content-container py-10">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">搜索</h1>

      {/* 搜索框 */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入关键词搜索文章..."
          className="flex-1 px-4 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500 transition-colors"
          autoFocus
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "搜索中..." : "搜索"}
        </button>
      </form>

      {/* 搜索结果 */}
      {searched && (
        <div>
          <div className="text-xs text-gray-400 mb-4">
            {loading ? "搜索中..." : `找到 ${total} 篇相关文章`}
          </div>

          {articles.length === 0 && !loading ? (
            <div className="text-sm text-gray-400 py-8">未找到相关文章</div>
          ) : (
            <div className="space-y-6">
              {articles.map((article) => (
                <div key={article.id} className="py-4">
                  <Link
                    to={`/article/${article.slug || article.id}`}
                    className="text-base font-medium text-gray-800 dark:text-gray-100 hover:text-brand-500 transition-colors"
                  >
                    {highlightText(article.title, query)}
                  </Link>
                  {article.summary && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                      {highlightText(article.summary, query)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {article.published_at && <span>{formatDate(article.published_at)}</span>}
                    <span>{article.read_time} 分钟</span>
                    {article.category && (
                      <span className="text-brand-500">{article.category.name}</span>
                    )}
                    {article.tags && article.tags.map((tag) => (
                      <span key={tag.id} className="tag-pill">{tag.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
