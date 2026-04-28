/**
 * 首页：文章列表
 * 显示标题、摘要、发布日期、标签、阅读时长、阅读量
 * 分页加载，默认按发布时间倒序，列表项之间用留白分隔
 */
import { useState, useEffect } from "react";
import { getPublishedArticles } from "../api/articles";
import type { ArticleListItem } from "../types";
import ArticleCard from "../components/ArticleCard";
import Pagination from "../components/Pagination";
import { useSiteConfig } from "../hooks/useSiteConfig";

export default function Home() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const { config } = useSiteConfig();

  /* 加载文章列表 */
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const res = await getPublishedArticles({ page, page_size: 10 });
        const data = res.data.data;
        setArticles(data.items || []);
        setTotalPages(data.total_pages || 0);
      } catch (err) {
        console.error("加载文章列表失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [page]);

  /* 页码变化时滚动到顶部 */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="content-container min-h-screen">
      {/* 首页介绍卡片 */}
      <div className="my-8 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {config.site_title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {config.home_intro}
        </p>
      </div>

      {loading ? (
        /* 加载状态：极简loading，不花哨 */
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">加载中...</div>
        </div>
      ) : articles.length === 0 ? (
        /* 空状态 */
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">暂无文章</div>
        </div>
      ) : (
        <>
          {/* 文章列表：用留白分隔，不用分割线 */}
          <div className="divide-y-0">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* 分页 */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
