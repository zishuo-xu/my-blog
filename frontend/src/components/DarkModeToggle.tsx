/**
 * 深色模式切换组件
 * 默认跟随系统，手动切换状态持久化到localStorage
 */
import { useState, useEffect } from "react";

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  /* 初始化：读取localStorage或跟随系统 */
  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      setIsDark(stored === "true");
      document.documentElement.classList.toggle("dark", stored === "true");
    } else {
      /* 跟随系统偏好 */
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  /* 切换深色/浅色模式 */
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("darkMode", String(next));
  };

  return (
    <button
      onClick={toggle}
      className="text-gray-500 hover:text-brand-500 transition-colors duration-200"
      aria-label={isDark ? "切换浅色模式" : "切换深色模式"}
    >
      {isDark ? (
        /* 太阳图标（深色模式下点击切换到浅色） */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        /* 月亮图标（浅色模式下点击切换到深色） */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
