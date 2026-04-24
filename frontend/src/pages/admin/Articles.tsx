/**
 * 后台文章管理页（阶段3完善，当前为基础框架）
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminArticles, deleteArticle } from "../../api/admin";
import type { ArticleListItem } from "../../types";

export default function AdminArticles() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();

  /* 加载文章列表 */
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const res = await getAdminArticles({ page, page_size: 20 });
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

  /* 删除文章（二次确认） */
  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除这篇文章吗？")) return;
    try {
      await deleteArticle(id);
      setArticles(articles.filter((a) => a.id !== id));
    } catch (err) {
      console.error("删除失败:", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">文章管理</h1>
        <button onClick={() => navigate("/admin/editor")} className="btn-primary text-xs">
          写文章
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-10">加载中...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">标题</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400 w-20">状态</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400 w-24">日期</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400 w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{article.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${article.is_published ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                      {article.is_published ? "已发布" : "草稿"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {article.created_at ? new Date(article.created_at).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/admin/editor/${article.id}`)} className="text-xs text-brand-500 hover:text-brand-600 transition-colors">编辑</button>
                      <button onClick={() => handleDelete(article.id)} className="text-xs text-red-500 hover:text-red-600 transition-colors">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-ghost text-xs disabled:opacity-30">上一页</button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="btn-ghost text-xs disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}
