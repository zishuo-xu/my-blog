/**
 * 后台布局组件
 * 侧边栏导航 + 顶部登录状态 + 退出按钮 + 路由鉴权守卫
 * 未登录访问后台路径自动跳转到登录页
 */
import { useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import DarkModeToggle from "../../components/DarkModeToggle";

/* 侧边栏导航项 */
const SIDEBAR_ITEMS = [
  { label: "文章管理", path: "/admin/articles" },
  { label: "写文章", path: "/admin/editor" },
  { label: "分类管理", path: "/admin/categories" },
  { label: "标签管理", path: "/admin/tags" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  /* 鉴权守卫：未登录自动跳转登录页 */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  /* 退出登录 */
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 */}
      <aside className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* 侧边栏标题 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">后台管理</h2>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 p-2 space-y-0.5">
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin/articles"}
              className={({ isActive }) =>
                `block px-3 py-2 text-sm rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 侧边栏底部：深色模式切换 */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400">主题</span>
          <DarkModeToggle />
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <span className="text-xs text-gray-400">
            {localStorage.getItem("token") ? "已登录" : ""}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors duration-200"
          >
            退出登录
          </button>
        </header>

        {/* 内容区 */}
        <main className="flex-1 p-6 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
