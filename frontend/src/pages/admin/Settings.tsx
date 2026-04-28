import { useState, useEffect } from "react";
import { getSiteConfig } from "../../api/articles";
import { updateSiteConfig, uploadImages } from "../../api/admin";

const CONFIG_FIELDS: { key: string; label: string; placeholder: string; type?: "text" | "textarea" | "image" }[] = [
  { key: "site_title", label: "站点标题", placeholder: "My Blog" },
  { key: "site_subtitle", label: "站点副标题", placeholder: "记录技术、思考与生活" },
  { key: "site_logo", label: "站点 Logo URL", placeholder: "https://example.com/logo.png", type: "image" },
  { key: "home_intro", label: "首页介绍语", placeholder: "这里分享...", type: "textarea" },
  { key: "github_url", label: "GitHub 链接", placeholder: "https://github.com/username" },
  { key: "xiaohongshu_url", label: "小红书 链接", placeholder: "https://www.xiaohongshu.com/user/profile/xxx" },
  { key: "footer_text", label: "页脚版权文字", placeholder: "All rights reserved." },
];

export default function AdminSettings() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await getSiteConfig();
      const data = res.data.data || {};
      // 确保所有字段都有值
      const filled: Record<string, string> = {};
      CONFIG_FIELDS.forEach((f) => {
        filled[f.key] = data[f.key] || "";
      });
      setConfigs(filled);
    } catch (err) {
      console.error("加载配置失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      CONFIG_FIELDS.forEach((f) => {
        const v = configs[f.key]?.trim();
        payload[f.key] = v || null;
      });
      await updateSiteConfig(payload);
      alert("配置已保存");
    } catch (err) {
      console.error("保存失败:", err);
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadImages(files);
      const images = res.data.data?.images || [];
      if (images.length > 0) {
        setConfigs((prev) => ({ ...prev, site_logo: images[0].url }));
      }
    } catch (err) {
      console.error("上传失败:", err);
      alert("Logo 上传失败");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">站点配置</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
          {saving ? "保存中..." : "保存配置"}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-10">加载中...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {CONFIG_FIELDS.map((field) => (
              <div key={field.key} className="px-4 py-4">
                <label className="block text-xs text-gray-500 mb-1.5">{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    value={configs[field.key] || ""}
                    onChange={(e) => setConfigs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500 resize-none"
                  />
                ) : field.type === "image" ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={configs[field.key] || ""}
                      onChange={(e) => setConfigs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500"
                    />
                    <label className="shrink-0">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <span className="inline-block px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors">
                        {uploading ? "上传中..." : "上传 Logo"}
                      </span>
                    </label>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={configs[field.key] || ""}
                    onChange={(e) => setConfigs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500"
                  />
                )}
                {field.type === "image" && configs[field.key] && (
                  <div className="mt-2">
                    <img src={configs[field.key]} alt="Logo 预览" className="h-10 w-auto rounded border border-gray-200 dark:border-gray-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
