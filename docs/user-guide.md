# My Blog 功能介绍

> 面向使用者：博客管理员与访客

---

## 1. 产品定位

My Blog 是一款极简风格的前后端分离个人博客系统，围绕「写作、发布、阅读」核心流程设计，无多余功能与装饰，开箱即用。

**访问地址（默认部署）**

| 入口 | 地址 |
|------|------|
| 前台阅读 | `http://IP:3000` |
| 后台管理 | `http://IP:3000/admin/login` |
| API 文档（DEBUG 模式） | `http://IP:8000/docs` |

---

## 2. 前台阅读

### 2.1 文章浏览

- **文章列表**：支持分页加载，可按分类/标签筛选
- **详情页**：代码语法高亮、图片点击放大、TOC 目录导航
- **深色模式**：跟随系统偏好，支持手动切换，状态持久化

### 2.2 内容发现

- **标签云**：可视化展示全部标签，点击直达相关文章
- **归档**：按年月聚合，回溯历史内容
- **全文搜索**：关键词高亮，快速定位目标文章

### 2.3 内容渲染

前后台共用同一套 Markdown 渲染引擎，确保你在后台看到的预览与前台读者看到的最终效果完全一致。

---

## 3. 后台管理

### 3.1 登录鉴权

- 单管理员账号，JWT Token 鉴权（默认有效期 30 天）
- 首次部署时自动生成管理员账号
- 默认账号密码：`admin / change_me_in_production`
- **登录安全**：同一 IP 连续 5 次登录失败将锁定 5 分钟

### 3.2 文章管理

| 功能 | 说明 |
|------|------|
| 列表 | 查看全部文章，显示标题/状态/日期/操作 |
| 编辑 | 修改已有文章的所有字段 |
| 删除 | 二次确认后永久删除，同时删除关联的图片文件 |
| 筛选 | 按发布状态、分类、标签筛选 |

### 3.3 分类与标签管理

| 功能 | 说明 |
|------|------|
| 分类管理 | 创建/编辑/删除文章分类，自动处理分类下的文章关联 |
| 标签管理 | 创建/编辑/删除标签，支持批量操作 |
| Slug | 分类和标签的 URL 标识，创建时自动跟随名称生成，重复时自动加数字后缀 |

### 3.4 Markdown 编辑器

编辑器的核心设计目标：**让写作流程不被打断**。

#### 分屏实时预览

- 左侧 Markdown 源码，右侧实时渲染预览
- 拖拽中间分隔条可自由调整左右比例
- **操作按钮固定**：发布和存草稿按钮固定在视野范围内，无需滚动

#### 工具栏

- **标题**：二级标题 / 三级标题
- **排版**：加粗、斜体、引用、代码块
- **列表**：有序列表、无序列表
- **扩展**：链接、表格
- **图片**：一键插入图片

#### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + B` | 加粗选中文本 |
| `Ctrl + I` | 斜体选中文本 |
| `Ctrl + K` | 插入链接 |
| `Ctrl + S` | 保存文章 |
| `Tab` | 插入 2 空格缩进 |

#### 图片上传（三种方式）

编辑器支持三种图片上传方式，均支持多图批量上传：

1. **粘贴上传**：截图后 `Ctrl + V` 直接粘贴到编辑器
2. **拖拽上传**：从文件管理器拖拽图片到编辑器区域
3. **选择上传**：点击工具栏「图片」按钮，从本地选择文件

上传完成后，图片链接 `![](url)` 自动插入到光标所在位置。

#### 自动保存

- 每 30 秒自动保存草稿到浏览器本地存储
- 新建文章时离开页面不丢失内容
- 发布后自动清除草稿

### 3.5 站点配置

后台「站点配置」页面支持动态修改以下配置，无需重启服务：

| 字段 | 说明 | 前台展示位置 |
|------|------|-------------|
| 站点标题 | 博客主标题 | 导航栏、首页介绍卡片 |
| 站点副标题 | 简短描述 | 导航栏标题右侧 |
| 站点 Logo | 支持 URL 或本地上传 | 导航栏左侧 |
| 首页介绍语 | 首页顶部卡片文字 | 首页 |
| GitHub 链接 | 个人 GitHub 主页 | 页脚 |
| 小红书链接 | 个人小红书主页 | 页脚 |
| 页脚版权文字 | 底部版权信息 | 页脚 |

### 3.6 元数据配置

| 字段 | 说明 |
|------|------|
| 标题 | 文章标题（必填） |
| 分类 | 单选，文章所属分类 |
| 标签 | 多选，可标记多个标签 |
| Slug | 自定义 URL 路径（可选） |
| 摘要 | 自定义摘要（留空自动生成） |
| 状态 | 存草稿 / 发布 |

### 3.7 数据备份

- **导入导出**：支持 ZIP 格式的全量数据导入/导出
- **一键备份**：快速备份当前数据库状态（使用 SQLite `VACUUM INTO` 保证一致性）

---

## 4. 部署方式

### 4.1 一键部署（推荐）

适用于 Ubuntu/Debian 服务器，以 root 身份执行：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/zishuo-xu/my-blog/main/deploy.sh)
```

脚本自动完成：环境检测与安装 → 代码拉取 → 配置生成 → 依赖安装 → 前端构建 → systemd 守护进程设置 → 开机自启。

### 4.2 本地开发

```bash
cp .env.example .env

# 后端
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# 前端（另开终端）
cd frontend && npm install && npm run dev
```

---

## 5. 环境变量速查

### 5.1 基础配置

| 变量 | 用途 | 部署时必须 |
|------|------|----------|
| `ADMIN_PASSWORD` | 管理员密码 | 是 |
| `JWT_SECRET_KEY` | JWT 密钥 | 是 |
| `FRONTEND_URL` | 前端地址（CORS） | 是 |
| `SITE_URL` | 站点 URL | 是 |
| `DEBUG` | 调试模式（生产设 false） | 否 |

### 5.2 图片上传

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `UPLOAD_DIR` | 图片存储目录 | `./app/static/upload` |
| `MAX_IMAGE_SIZE_MB` | 单图最大体积 | 5 |
| `STORAGE_TYPE` | 存储类型：`local` / `aliyun_oss` / `cloudflare_r2` / `qiniu` | `local` |

### 5.3 阿里云 OSS 配置（`STORAGE_TYPE=aliyun_oss`）

| 变量 | 说明 |
|------|------|
| `OSS_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
| `OSS_ENDPOINT` | 如 `oss-cn-shenzhen.aliyuncs.com`（不含 `https://`） |
| `OSS_BUCKET_NAME` | Bucket 名称 |
| `OSS_CUSTOM_DOMAIN` | 可选：自定义域名/CDN |

### 5.4 Cloudflare R2 配置（`STORAGE_TYPE=cloudflare_r2`）

| 变量 | 说明 |
|------|------|
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 Access Key |
| `R2_ACCESS_KEY_SECRET` | R2 Secret Key |
| `R2_BUCKET_NAME` | Bucket 名称 |

### 5.5 七牛云配置（`STORAGE_TYPE=qiniu`）

| 变量 | 说明 |
|------|------|
| `QINIU_ACCESS_KEY` | 七牛 AccessKey |
| `QINIU_SECRET_KEY` | 七牛 SecretKey |
| `QINIU_BUCKET_NAME` | Bucket 名称 |
| `QINIU_DOMAIN` | 自定义域名 |

---

## 6. 常见问题

**Q：首次部署后无法登录，提示 Network Error？**
> 检查 `FRONTEND_URL` 环境变量是否与前端实际访问地址一致（包括端口号），后端需要正确配置 CORS 允许来源。

**Q：图片上传成功但前台无法显示？**
> 检查 `SITE_URL` 是否配置为实际的服务器地址，图片访问 URL 依赖此配置生成。

**Q：切换到阿里云 OSS 后图片访问返回 403？**
> 登录阿里云 OSS 控制台，将 Bucket 权限从「私有」改为「公共读」。

**Q：如何修改管理员密码？**
> 目前仅支持通过环境变量 `ADMIN_PASSWORD` 修改，修改后重启后端服务生效。

**Q：如何将本地已有图片迁移到 OSS？**
> 修改 `.env` 为 `STORAGE_TYPE=aliyun_oss` 并填写 OSS 配置后，执行：
> ```bash
> cd backend && source venv/bin/activate
> python scripts/migrate_to_oss.py
> ```

**Q：如何回退 OSS 图片到本地？**
> ```bash
> cd backend && source venv/bin/activate
> python scripts/migrate_from_oss.py
> ```
