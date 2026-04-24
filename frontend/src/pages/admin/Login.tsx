/**
 * 后台登录页（阶段3完善，当前为占位符）
 * 极简设计：仅账号密码+登录按钮，居中对齐
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/admin";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await login(username, password);
      const { token } = res.data.data;
      localStorage.setItem("token", token);
      navigate("/admin/articles");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 text-center mb-8">
          博客管理
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              className="w-full px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
