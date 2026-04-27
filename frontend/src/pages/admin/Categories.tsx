import { useState, useEffect } from "react";
import { getCategories } from "../../api/articles";
import { createCategory, updateCategory, deleteCategory } from "../../api/admin";
import type { Category } from "../../types";

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data.data || []);
    } catch (err) {
      console.error("加载分类失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setName("");
    setSlug("");
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) {
      alert("名称和 slug 不能为空");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name, slug });
      } else {
        await createCategory({ name, slug });
      }
      resetForm();
      fetchCategories();
    } catch (err: any) {
      console.error("保存分类失败:", err);
      const msg = err.response?.data?.msg || "保存失败，请重试";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除这个分类吗？关联文章将变为无分类状态。")) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      console.error("删除失败:", err);
      alert("删除失败，请重试");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">分类管理</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
          + 新建分类
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!editing && !slug) {
                    setSlug(
                      v
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9一-龥-]/g, "")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, "")
                    );
                  }
                }}
                placeholder="分类名称"
                className="w-full px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-slug"
                className="w-full px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500"
              />
              {categories.length > 0 && (
                <div className="mt-1 text-[10px] text-gray-400">
                  已有 slug: {categories.map((c) => c.slug).join(", ")}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={resetForm} className="btn-ghost text-xs">取消</button>
              <button onClick={handleSubmit} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
                {saving ? "保存中..." : editing ? "更新" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-10">加载中...</div>
      ) : categories.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-10">暂无分类</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">名称</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Slug</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400 w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{cat.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{cat.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(cat)} className="text-xs text-brand-500 hover:text-brand-600 transition-colors">编辑</button>
                      <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-500 hover:text-red-600 transition-colors">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
