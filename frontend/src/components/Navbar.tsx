/**
 * 顶部导航组件
 * 首页/分类/标签/归档/搜索框，移动端收起为汉堡菜单
 */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DarkModeToggle from "./DarkModeToggle";
import { useSiteConfig } from "../hooks/useSiteConfig";

/* 导航项配置 */
const NAV_ITEMS = [
  { label: "首页", path: "/" },
  { label: "分类", path: "/categories" },
  { label: "标签", path: "/tags" },
  { label: "归档", path: "/archive" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const { config } = useSiteConfig();

  /* 执行搜索：跳转到搜索页 */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <nav className="content-container flex items-center justify-between h-14">
        {/* 站点名称 */}
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 hover:text-brand-500 transition-colors">
          {config.site_logo && (
            <img src={config.site_logo} alt="" className="h-7 w-7 rounded-full object-cover" />
          )}
          <span>{config.site_title}</span>
        </Link>

        {/* PC端导航项 */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm transition-colors duration-200 hover:text-brand-500 ${
                location.pathname === item.path
                  ? "text-brand-500 font-medium"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* 搜索按钮 */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-gray-500 hover:text-brand-500 transition-colors duration-200"
            aria-label="搜索"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <DarkModeToggle />
        </div>

        {/* 移动端汉堡菜单按钮 */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-gray-500 hover:text-brand-500 transition-colors"
            aria-label="搜索"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <DarkModeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors"
            aria-label="菜单"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* 搜索框下拉 */}
      {searchOpen && (
        <div className="content-container pb-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章..."
              className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500 transition-colors"
              autoFocus
            />
            <button type="submit" className="btn-primary text-xs px-3 py-1.5">搜索</button>
          </form>
        </div>
      )}

      {/* 移动端菜单下拉 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-6 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                location.pathname === item.path
                  ? "text-brand-500 font-medium"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
