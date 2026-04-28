import { useState, useEffect } from "react";
import request from "../../api/request";

interface BackupRecord {
  id: number;
  filename: string;
  oss_url: string;
  file_size: number;
  trigger_type: string;
  status: string;
  error_msg: string | null;
  created_at: string;
}

interface BackupStats {
  total: number;
  success: number;
  failed: number;
  latest_backup: string | null;
}

export default function AdminBackup() {
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        request.get("/api/v1/admin/backup/history"),
        request.get("/api/v1/admin/backup/stats"),
      ]);
      setRecords(historyRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      console.error("加载备份数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTrigger = async () => {
    if (!confirm("确定立即执行一次备份吗？备份文件将上传至阿里云OSS。")) return;
    setTriggering(true);
    try {
      const res = await request.post("/api/v1/admin/backup/trigger");
      if (res.data.code === 200) {
        alert("备份成功！");
        fetchData();
      } else {
        alert(`备份失败: ${res.data.msg}`);
      }
    } catch (err: any) {
      alert(`备份失败: ${err.response?.data?.msg || err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (iso: string) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("zh-CN");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">备份管理</h1>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="btn-primary text-xs disabled:opacity-50"
        >
          {triggering ? "备份中..." : "立即备份"}
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-400">总备份次数</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-400">成功</div>
            <div className="text-lg font-semibold text-green-600">{stats.success}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-400">失败</div>
            <div className="text-lg font-semibold text-red-500">{stats.failed}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-400">最近备份</div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {stats.latest_backup ? formatDate(stats.latest_backup) : "-"}
            </div>
          </div>
        </div>
      )}

      {/* 备份记录表格 */}
      {loading ? (
        <div className="text-sm text-gray-400 text-center py-10">加载中...</div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-sm text-gray-400">暂无备份记录</div>
          <div className="text-xs text-gray-300 mt-1">点击右上角「立即备份」开始第一次备份</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">文件名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">大小</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">触发方式</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">时间</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                      {r.filename}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatSize(r.file_size)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        r.trigger_type === "manual"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700"
                      }`}>
                        {r.trigger_type === "manual" ? "手动" : "定时"}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        r.status === "success"
                          ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                          : "bg-red-50 text-red-500 dark:bg-red-900/20"
                      }`}>
                        {r.status === "success" ? "成功" : "失败"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {r.status === "success" && r.oss_url && (
                        <a
                          href={r.oss_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-500 hover:underline"
                        >
                          下载
                        </a>
                      )}
                      {r.status === "failed" && r.error_msg && (
                        <span className="text-xs text-red-400" title={r.error_msg}>
                          查看错误
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
