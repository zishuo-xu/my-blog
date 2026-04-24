/**
 * 页脚组件
 * 版权信息、社交链接、RSS入口，文字浅灰色居中
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="content-container py-8 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>&copy; {year} My Blog. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="/public/robots.txt" className="hover:text-brand-500 transition-colors">Robots</a>
          <a href="/api/v1/public/sitemap.xml" className="hover:text-brand-500 transition-colors">Sitemap</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
