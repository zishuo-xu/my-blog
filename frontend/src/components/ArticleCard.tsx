/**
 * 文章卡片组件
 * 用于首页文章列表，显示标题、摘要、日期、标签、阅读时长、阅读量
 */
import { Link } from "react-router-dom";
import type { ArticleListItem } from "../types";

interface ArticleCardProps {
  article: ArticleListItem;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  /* 格式化日期 */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <article className="py-8">
      {/* 标题：可点击跳转详情 */}
      <Link
        to={`/article/${article.slug || article.id}`}
        className="text-xl font-semibold text-gray-800 dark:text-gray-100 hover:text-brand-500 transition-colors duration-200"
      >
        {article.title}
      </Link>

      {/* 元信息：日期、阅读时长、阅读量 */}
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
        {article.published_at && <span>{formatDate(article.published_at)}</span>}
        <span>{article.read_time} 分钟</span>
        <span>{article.read_count} 次阅读</span>
        {article.category && (
          <Link
            to={`/categories?category_id=${article.category.id}`}
            className="text-brand-500 hover:text-brand-600 transition-colors"
          >
            {article.category.name}
          </Link>
        )}
      </div>

      {/* 摘要 */}
      {article.summary && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
          {article.summary}
        </p>
      )}

      {/* 标签 */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {article.tags.map((tag) => (
            <Link
              key={tag.id}
              to={`/tags?tag_id=${tag.id}`}
              className="tag-pill"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
