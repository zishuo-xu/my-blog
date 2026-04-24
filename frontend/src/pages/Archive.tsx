/**
 * 归档页
 * 按年份/月份聚合展示所有文章，年份/月份用稍大字号区分，文章列表缩进对齐
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getArchive } from "../api/articles";
import type { ArchiveItem } from "../types";

export default function Archive() {
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* 加载归档数据 */
  useEffect(() => {
    const fetchArchive = async () => {
      try {
        const res = await getArchive();
        setArchive(res.data.data || []);
      } catch (err) {
        console.error("加载归档失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArchive();
  }, []);

  /* 按年份分组 */
  const groupedByYear = archive.reduce<Record<number, ArchiveItem[]>>((acc, item) => {
    if (!acc[item.year]) acc[item.year] = [];
    acc[item.year].push(item);
    return acc;
  }, {});

  /* 格式化日期 */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "long", day: "numeric",
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
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-8">归档</h1>

      {Object.keys(groupedByYear).length === 0 ? (
        <div className="text-sm text-gray-400 py-8">暂无文章</div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedByYear)
            .sort(([a], [b]) => Number(b) - Number(a)) // 按年份倒序
            .map(([year, items]) => (
              <div key={year}>
                {/* 年份标题：用稍大字号区分 */}
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  {year}
                </h2>

                {items.map((item) => (
                  <div key={`${item.year}-${item.month}`} className="mb-6">
                    {/* 月份标题 */}
                    <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-2 ml-2">
                      {item.month}月
                      <span className="ml-2 text-xs text-gray-400">({item.article_count}篇)</span>
                    </h3>

                    {/* 文章列表：缩进对齐 */}
                    <div className="ml-6 space-y-2">
                      {item.articles.map((article) => (
                        <div key={article.id} className="flex items-baseline gap-3 py-1">
                          {/* 日期 */}
                          <span className="text-xs text-gray-400 shrink-0 w-16">
                            {formatDate(article.published_at)}
                          </span>
                          {/* 标题 */}
                          <Link
                            to={`/article/${article.slug || article.id}`}
                            className="text-sm text-gray-700 dark:text-gray-300 hover:text-brand-500 transition-colors"
                          >
                            {article.title}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
