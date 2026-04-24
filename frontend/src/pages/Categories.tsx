/**
 * 分类页
 * 所有分类列表，点击显示对应分类下的文章，显示每个分类的文章数量
 */
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCategories, getPublishedArticles } from "../api/articles";
import type { Category, ArticleListItem } from "../types";

export default function Categories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /* 加载分类列表 */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getCategories();
        setCategories(res.data.data || []);
      } catch (err) {
        console.error("加载分类失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  /* URL参数中有category_id时自动加载该分类下的文章 */
  useEffect(() => {
    const categoryId = searchParams.get("category_id");
    if (categoryId) {
      setActiveCategory(Number(categoryId));
      loadCategoryArticles(Number(categoryId));
    }
  }, [searchParams]);

  /* 加载某个分类下的文章 */
  const loadCategoryArticles = async (categoryId: number) => {
    setActiveCategory(categoryId);
    setSearchParams({ category_id: String(categoryId) });
    try {
      const res = await getPublishedArticles({ category_id: categoryId, page_size: 50 });
      setArticles(res.data.data.items || []);
    } catch (err) {
      console.error("加载分类文章失败:", err);
    }
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
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-8">分类</h1>

      {/* 分类列表 */}
      <div className="flex flex-wrap gap-3 mb-10">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => loadCategoryArticles(cat.id)}
            className={`px-4 py-2 rounded-md text-sm transition-colors duration-200 ${
              activeCategory === cat.id
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {cat.name}
            <span className="ml-1.5 text-xs opacity-70">({cat.article_count})</span>
          </button>
        ))}
      </div>

      {/* 分类下的文章列表 */}
      {activeCategory && (
        <div>
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            {categories.find((c) => c.id === activeCategory)?.name}
          </h2>
          {articles.length === 0 ? (
            <div className="text-sm text-gray-400 py-8">该分类下暂无文章</div>
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
