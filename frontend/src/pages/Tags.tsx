/**
 * 标签页
 * 标签云展示所有标签，点击显示对应标签下的文章
 * 标签大小按文章数量区分
 */
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getTags, getPublishedArticles } from "../api/articles";
import type { Tag, ArticleListItem } from "../types";

export default function Tags() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState<Tag[]>([]);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [activeTag, setActiveTag] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /* 加载标签列表 */
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await getTags();
        setTags(res.data.data || []);
      } catch (err) {
        console.error("加载标签失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  /* URL参数中有tag_id时自动加载该标签下的文章 */
  useEffect(() => {
    const tagId = searchParams.get("tag_id");
    if (tagId) {
      setActiveTag(Number(tagId));
      loadTagArticles(Number(tagId));
    }
  }, [searchParams]);

  /* 加载某个标签下的文章 */
  const loadTagArticles = async (tagId: number) => {
    setActiveTag(tagId);
    setSearchParams({ tag_id: String(tagId) });
    try {
      const res = await getPublishedArticles({ tag_id: tagId, page_size: 50 });
      setArticles(res.data.data.items || []);
    } catch (err) {
      console.error("加载标签文章失败:", err);
    }
  };

  /* 根据文章数量计算标签字号（标签云效果） */
  const getTagFontSize = (count: number): string => {
    if (count >= 10) return "text-xl";
    if (count >= 5) return "text-lg";
    if (count >= 3) return "text-base";
    return "text-sm";
  };

  /* 格式化日期 */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="content-container flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="content-container py-10">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-8">标签</h1>

      {/* 标签云 */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => loadTagArticles(tag.id)}
            className={`${getTagFontSize(tag.article_count)} px-3 py-1 rounded-md transition-colors duration-200 ${
              activeTag === tag.id
                ? "bg-brand-500 text-white font-medium"
                : "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50"
            }`}
          >
            {tag.name}
            <span className="ml-1 text-xs opacity-60">({tag.article_count})</span>
          </button>
        ))}
      </div>

      {/* 标签下的文章列表 */}
      {activeTag && (
        <div>
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            {tags.find((t) => t.id === activeTag)?.name}
          </h2>
          {articles.length === 0 ? (
            <div className="text-sm text-gray-400 py-8">该标签下暂无文章</div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <div key={article.id} className="py-4">
                  <Link
                    to={`/article/${article.slug || article.id}`}
                    className="text-base font-medium text-gray-800 dark:text-gray-100 hover:text-brand-500 transition-colors"
                  >
                    {article.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {article.published_at && <span>{formatDate(article.published_at)}</span>}
                    <span>{article.read_time} 分钟</span>
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
