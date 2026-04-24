/**
 * 分页组件
 */
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-8">
      {/* 上一页 */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
      >
        上一页
      </button>

      {/* 页码 */}
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {page} / {totalPages}
      </span>

      {/* 下一页 */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
      >
        下一页
      </button>
    </div>
  );
}
