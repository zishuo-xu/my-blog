/**
 * Markdown编辑器页面
 * 核心功能：左右分屏、工具栏、快捷键、图片上传三种方式、自动存草稿、分屏拖拽
 * 预览样式和前台文章详情页100%一致（共用MarkdownRenderer组件）
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminArticle, createArticle, updateArticle } from "../../api/admin";
import { uploadImages } from "../../api/admin";
import { getCategories, getTags } from "../../api/articles";
import type { Category, Tag } from "../../types";
import MarkdownRenderer from "../../components/MarkdownRenderer";

/* ===== 工具栏按钮配置 ===== */
interface ToolItem {
  label: string;
  icon: string;
  action: (textarea: HTMLTextAreaElement, insert: (before: string, after: string) => void) => void;
  title: string;
}

const TOOL_ITEMS: ToolItem[] = [
  {
    label: "H2", icon: "标题", title: "二级标题",
    action: (_, insert) => insert("## ", ""),
  },
  {
    label: "H3", icon: "小标题", title: "三级标题",
    action: (_, insert) => insert("### ", ""),
  },
  {
    label: "B", icon: "加粗", title: "加粗 (Ctrl+B)",
    action: (_, insert) => insert("**", "**"),
  },
  {
    label: "I", icon: "斜体", title: "斜体 (Ctrl+I)",
    action: (_, insert) => insert("*", "*"),
  },
  {
    label: ">", icon: "引用", title: "引用块",
    action: (_, insert) => insert("> ", ""),
  },
  {
    label: "</>", icon: "代码", title: "代码块",
    action: (_, insert) => insert("```\n", "\n```"),
  },
  {
    label: "ol", icon: "有序列表", title: "有序列表",
    action: (_, insert) => insert("1. ", ""),
  },
  {
    label: "ul", icon: "无序列表", title: "无序列表",
    action: (_, insert) => insert("- ", ""),
  },
  {
    label: "K", icon: "链接", title: "插入链接 (Ctrl+K)",
    action: (_, insert) => insert("[", "](url)"),
  },
  {
    label: "_tbl", icon: "表格", title: "插入表格",
    action: (_, insert) => insert("| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ", " |  |  |"),
  },
];

/* ===== 自动保存的localStorage key前缀 ===== */
const DRAFT_PREFIX = "blog_draft_";
const AUTOSAVE_INTERVAL = 30000; // 30秒自动保存

export default function AdminEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  /* ===== 文章状态 ===== */
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [summary, setSummary] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");

  /* ===== 分类和标签 ===== */
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  /* ===== 编辑器相关 ===== */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [splitRatio, setSplitRatio] = useState(50); // 分屏比例
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  /* ===== 加载分类和标签 ===== */
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([getCategories(), getTags()]);
        setCategories(catRes.data.data || []);
        setTags(tagRes.data.data || []);
      } catch (err) {
        console.error("加载分类/标签失败:", err);
      }
    };
    fetchMeta();
  }, []);

  /* ===== 编辑模式：加载已有文章 ===== */
  useEffect(() => {
    if (!id) return;
    const fetchArticle = async () => {
      try {
        const res = await getAdminArticle(Number(id));
        const article = res.data.data;
        setTitle(article.title);
        setContent(article.content_md || "");
        setCategoryId(article.category?.id || null);
        setTagIds(article.tags?.map((t) => t.id) || []);
        setSummary(article.summary || "");
        setSlug(article.slug || "");
      } catch (err) {
        console.error("加载文章失败:", err);
      }
    };
    fetchArticle();
  }, [id]);

  /* ===== 新建模式：恢复localStorage中的草稿 ===== */
  useEffect(() => {
    if (isEdit) return;
    const draftKey = `${DRAFT_PREFIX}new`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const data = JSON.parse(draft);
        if (data.title) setTitle(data.title);
        if (data.content) setContent(data.content);
        if (data.summary) setSummary(data.summary);
      } catch {
        // 草稿数据损坏，忽略
      }
    }
  }, [isEdit]);

  /* ===== 自动存草稿：每30秒保存到localStorage ===== */
  useEffect(() => {
    const timer = setInterval(() => {
      const draftKey = `${DRAFT_PREFIX}${isEdit ? id : "new"}`;
      const data = { title, content, summary, categoryId, tagIds, slug };
      // 只有内容非空才保存
      if (title || content) {
        localStorage.setItem(draftKey, JSON.stringify(data));
        setLastSaved(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(timer);
  }, [title, content, summary, categoryId, tagIds, slug, isEdit, id]);

  /* ===== 图片上传核心逻辑 ===== */

  /**
   * 上传图片文件列表并插入MD链接到光标位置
   * 三种方式（粘贴/拖拽/选择）最终都调用此方法
   */
  const handleImageUpload = useCallback(async (files: File[]) => {
    if (!textareaRef.current) return;

    // 过滤出允许的图片格式
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const validFiles = files.filter((f) => allowedTypes.includes(f.type));

    if (validFiles.length === 0) {
      alert("仅支持 jpg/png/gif/webp 格式的图片");
      return;
    }

    // 检查单文件大小限制（5MB）
    const maxSize = 5 * 1024 * 1024;
    const oversized = validFiles.filter((f) => f.size > maxSize);
    if (oversized.length > 0) {
      alert(`以下文件超过5MB限制：${oversized.map((f) => f.name).join(", ")}`);
      return;
    }

    setUploadingImages(true);
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;

    // 在光标位置插入上传中的占位符
    const placeholders = validFiles.map(() => "![上传中...]()").join("\n");
    const newContent = content.slice(0, cursorPos) + placeholders + content.slice(cursorPos);
    setContent(newContent);

    try {
      const res = await uploadImages(validFiles);
      const result = res.data.data;
      const uploadedImages = result.images || [];

      // 替换占位符为实际图片链接
      let updatedContent = newContent;
      let placeholderIndex = 0;
      updatedContent = updatedContent.replace(/!\[上传中\.\.\.\]\(\)/g, () => {
        if (placeholderIndex < uploadedImages.length) {
          const img = uploadedImages[placeholderIndex];
          placeholderIndex++;
          return `![${img.original_name}](${img.url})`;
        }
        return "![上传失败]()";
      });

      // 处理上传失败的文件
      if (result.errors && result.errors.length > 0) {
        const errMsg = result.errors.map((e) => `${e.filename}: ${e.error}`).join("\n");
        alert(`部分图片上传失败：\n${errMsg}`);
      }

      setContent(updatedContent);
    } catch (err) {
      console.error("图片上传失败:", err);
      alert("图片上传失败，请重试");
      // 移除所有占位符
      setContent(content);
    } finally {
      setUploadingImages(false);
    }
  }, [content]);

  /* ===== 剪贴板粘贴上传（截图后Ctrl+V直接上传） ===== */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault(); // 阻止默认粘贴行为
      handleImageUpload(imageFiles);
    }
  }, [handleImageUpload]);

  /* ===== 拖拽上传（拖入编辑器自动上传） ===== */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length > 0) {
      handleImageUpload(imageFiles);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // 允许拖放
  }, []);

  /* ===== 点击工具栏图片按钮选择文件上传 ===== */
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleImageUpload(files);
    }
    // 清空input值，允许重复选择同一文件
    e.target.value = "";
  }, [handleImageUpload]);

  /* ===== 工具栏操作：在光标位置插入MD语法 ===== */
  const insertAtCursor = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    const newText = content.slice(0, start) + before + selectedText + after + content.slice(end);
    setContent(newText);

    // 恢复光标位置
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [content]);

  /* ===== 快捷键处理 ===== */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+B: 加粗
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      insertAtCursor("**", "**");
      return;
    }
    // Ctrl+I: 斜体
    if (e.ctrlKey && e.key === "i") {
      e.preventDefault();
      insertAtCursor("*", "*");
      return;
    }
    // Ctrl+K: 插入链接
    if (e.ctrlKey && e.key === "k") {
      e.preventDefault();
      insertAtCursor("[", "](url)");
      return;
    }
    // Ctrl+S: 保存
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      handleSave(false);
      return;
    }
    // Tab键：插入2个空格缩进
    if (e.key === "Tab") {
      e.preventDefault();
      insertAtCursor("  ", "");
      return;
    }
  }, [insertAtCursor]);

  /* ===== 保存文章 ===== */
  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      alert("请输入标题");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title,
        content_md: content,
        is_published: publish,
        category_id: categoryId,
        tag_ids: tagIds,
        summary: summary || undefined,
        slug: slug || undefined,
      };
      if (isEdit) {
        await updateArticle(Number(id), data);
      } else {
        const res = await createArticle(data);
        // 创建成功后清除草稿
        localStorage.removeItem(`${DRAFT_PREFIX}new`);
        // 如果是发布，跳转到文章预览页
        if (publish && res.data.data) {
          const articleId = res.data.data.slug || res.data.data.id;
          window.open(`/article/${articleId}`, "_blank");
        }
      }
      navigate("/admin/articles");
    } catch (err) {
      console.error("保存失败:", err);
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  /* ===== 分屏拖拽调整宽度 ===== */
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      /* 计算拖拽位置相对于编辑区容器的比例 */
      const container = textareaRef.current?.parentElement?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      // 限制分屏比例在20%-80%之间
      setSplitRatio(Math.max(20, Math.min(80, ratio)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="h-full flex flex-col">
      {/* ===== 顶部配置表单 ===== */}
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 mb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题"
          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <select
          value={categoryId || ""}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          className="px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500"
        >
          <option value="">选择分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="自定义slug（可选）"
          className="w-40 px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* ===== 标签选择 ===== */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-brand-500 transition-colors">
              <input
                type="checkbox"
                checked={tagIds.includes(tag.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTagIds([...tagIds, tag.id]);
                  } else {
                    setTagIds(tagIds.filter((tid) => tid !== tag.id));
                  }
                }}
                className="rounded"
              />
              {tag.name}
            </label>
          ))}
        </div>
      )}

      {/* ===== 工具栏 ===== */}
      <div className="flex items-center gap-1 py-1.5 border-b border-gray-200 dark:border-gray-700 mb-2 flex-wrap">
        {TOOL_ITEMS.map((tool) => (
          <button
            key={tool.label}
            onClick={() => tool.action(textareaRef.current!, insertAtCursor)}
            title={tool.title}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
          >
            {tool.icon}
          </button>
        ))}

        {/* 图片上传按钮：点击选择文件 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="插入图片（粘贴/拖拽/选择文件）"
          className="px-2 py-1 text-xs text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded transition-colors duration-200"
          disabled={uploadingImages}
        >
          {uploadingImages ? "上传中..." : "图片"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 自动保存提示 */}
        {lastSaved && (
          <span className="ml-auto text-xs text-gray-400">已自动保存 {lastSaved}</span>
        )}
      </div>

      {/* ===== 左右分屏编辑区 ===== */}
      <div className="flex-1 min-h-0 flex overflow-hidden" style={{ cursor: isDragging ? "col-resize" : "default" }}>
        {/* 左侧：编辑区 */}
        <div style={{ width: `${splitRatio}%` }} className="flex flex-col min-w-0 h-full overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onKeyDown={handleKeyDown}
            placeholder="开始写作...&#10;&#10;支持三种图片上传方式：&#10;1. 截图后 Ctrl+V 粘贴上传&#10;2. 拖拽图片到编辑器上传&#10;3. 点击工具栏「图片」按钮选择文件上传"
            className="h-full p-4 text-sm font-mono leading-relaxed rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500 resize-none overflow-y-auto"
          />
        </div>

        {/* 拖拽分隔条 */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors duration-200 mx-1 rounded-full"
        />

        {/* 右侧：实时预览区（和前台样式100%一致） */}
        <div style={{ width: `${100 - splitRatio}%` }} className="h-full overflow-y-auto p-4 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-w-0">
          <MarkdownRenderer content={content} />
        </div>
      </div>

      {/* ===== 底部操作栏 ===== */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
        <div className="flex-1">
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="自定义摘要（可选，留空自动生成）"
            className="w-full max-w-md px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving} className="btn-ghost text-xs disabled:opacity-50">
            {saving ? "保存中..." : "存草稿"}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
            {saving ? "发布中..." : "发布"}
          </button>
        </div>
      </div>
    </div>
  );
}
