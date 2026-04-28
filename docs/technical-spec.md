# My Blog 技术方案文档

> 面向开发者：架构设计、技术选型与扩展指南

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────┐
│  前端 (React SPA, Vite Build)                        │
│  ├─ 前台：文章列表 / 详情 / 分类 / 标签 / 归档 / 搜索 │
│  ├─ 后台：登录 / 文章 CRUD / 分类 / 标签 / 站点配置    │
│  └─ 公共组件：MarkdownRenderer（前后台样式复用）      │
├─────────────────────────────────────────────────────┤
│  后端 (FastAPI, Uvicorn)                             │
│  ├─ 公开 API：文章/分类/标签/归档/搜索/sitemap/站点配置│
│  ├─ 管理 API：CRUD / 图片上传 / 数据导入导出 / 备份  │
│  ├─ 业务层：MD 解析 / 图片压缩 / 存储适配             │
│  └─ 数据层：SQLite + SQLAlchemy ORM                  │
├─────────────────────────────────────────────────────┤
│  基础设施                                            │
│  ├─ 本地文件存储 / 阿里云 OSS / Cloudflare R2 / 七牛云│
│  └─ systemd 服务守护 + 开机自启                       │
└─────────────────────────────────────────────────────┘
```

---

## 2. 技术栈与选型理由

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 前端框架 | React | 18 | 生态成熟，组件化开发，SPA 路由管理 |
| 构建工具 | Vite | 8 | 极速 HMR，生产构建优化，TypeScript 开箱支持 |
| 类型系统 | TypeScript | 5.x | 前后端共享类型定义，编译期排错 |
| 样式方案 | Tailwind CSS | 3.x | Utility-first，减少 CSS 文件体积，暗色模式支持 |
| 状态管理 | React Hooks | - | 项目规模可控，无需引入 Redux/Zustand |
| HTTP 客户端 | Axios | 1.x | 拦截器统一处理 Token 注入与错误响应 |
| 后端框架 | FastAPI | 0.115 | 自动 OpenAPI 文档，Pydantic 数据校验，异步原生支持 |
| ORM | SQLAlchemy | 2.0 | 现代声明式模型，关系定义清晰 |
| 数据库 | SQLite | - | 零运维，单文件部署，适合个人博客规模 |
| MD 渲染 | mistune | 3.x | 纯 Python，插件化扩展，服务端渲染 |
| 图片处理 | Pillow | 11.x | 格式转换、质量压缩、尺寸调整 |
| 对象存储 | oss2 / boto3 / qiniu | - | 支持阿里云 OSS、Cloudflare R2、七牛云 |
| 定时任务 | APScheduler | 3.11 | 内置定时备份，无需外部 crontab |
| 进程管理 | uvicorn + systemd | - | ASGI 服务器 + 系统级守护 |

---

## 3. 项目结构

```
my-blog/
├── backend/                          # 后端服务
│   ├── app/
│   │   ├── api/v1/                   # API 路由（按模块分目录）
│   │   │   ├── admin/                # 管理接口（文章/分类/标签/上传/数据/站点配置）
│   │   │   └── public/               # 公开接口（文章列表/搜索/归档/sitemap/站点配置）
│   │   ├── core/                     # 核心配置、数据库连接、安全工具
│   │   ├── models/                   # SQLAlchemy 数据模型
│   │   ├── schemas/                  # Pydantic 请求/响应模型
│   │   ├── services/                 # 业务逻辑层（MD 渲染、图片处理、存储、导出）
│   │   └── main.py                   # FastAPI 应用入口、CORS、静态文件挂载
│   ├── scripts/                      # 迁移脚本（本地 ↔ OSS）
│   └── requirements.txt
├── frontend/                         # 前端应用
│   ├── src/
│   │   ├── api/                      # API 调用封装（Axios 实例 + 各模块接口）
│   │   ├── components/               # 公共组件（MarkdownRenderer、DarkModeToggle）
│   │   ├── hooks/                    # 自定义 Hooks（useSiteConfig）
│   │   ├── pages/                    # 页面组件（前台 + 后台）
│   │   ├── types/                    # 全局 TypeScript 类型定义
│   │   └── App.tsx                   # 路由配置
│   └── vite.config.ts
├── deploy.sh                         # 一键部署脚本（Ubuntu/Debian）
├── docs/                             # 项目文档
└── .env.example                      # 环境变量模板
```

---

## 4. 前后端通信

### 4.1 REST API 设计

- 统一响应格式：`{ code: number, msg: string, data: any }`
- 公开接口：无鉴权，供前台调用
- 管理接口：JWT Bearer Token 鉴权（`Authorization: Bearer <token>`）

### 4.2 CORS 配置

生产环境严格限制来源：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # 非通配符
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**部署注意事项**：`FRONTEND_URL` 必须与前端实际访问地址完全一致（含端口号）。

### 4.3 环境变量加载

- 后端 `config.py` 使用 `python-dotenv` 加载 `.env`
- `BASE_DIR` 指向 `backend/` 目录，确保 `.env` 文件位于 `backend/.env`（生产环境通过符号链接指向项目根目录）
- 前端 Vite 环境变量必须以 `VITE_` 为前缀，在构建时静态替换

---

## 5. 数据模型

### 5.1 核心实体

| 实体 | 关键字段 | 关系 |
|------|----------|------|
| User | username, password_hash | - |
| Article | title, slug, content_md, content_html, summary, is_published | 多对一 Category，多对多 Tag |
| Category | name, slug | 一对多 Article（passive_deletes） |
| Tag | name, slug | 多对多 Article |
| Image | filename, original_name, url, file_size | 可选关联 Article |
| SiteConfig | key, value, description | 键值对配置存储 |
| BackupRecord | filename, oss_key, oss_url, file_size, trigger_type, status | 备份历史追踪 |

### 5.2 数据流

```
Editor (content_md)
    ↓
Backend: save content_md + generate content_html (mistune)
    ↓
Database: store both fields
    ↓
Frontend Detail: render content_md via MarkdownRenderer (React)
    ↓
Frontend List: display summary (auto-generated or custom)
```

**设计决策**：同时存储 `content_md` 和 `content_html`。
- `content_md` 用于编辑回显和前台渲染（保证前后台一致性）
- `content_html` 用于导出/备份等需要预渲染 HTML 的场景

---

## 6. Markdown 渲染方案

### 6.1 服务端解析

使用 `mistune 3.x` 插件化解析：

```python
_md_parser = mistune.create_markdown(plugins=[
    "mistune.plugins.table.table",
    "mistune.plugins.task_lists.task_lists",
    "mistune.plugins.footnotes.footnotes",
])
```

### 6.2 客户端渲染

前端使用 `react-markdown` + `rehype-highlight` + `rehype-slug`：

- 前后台共用 `<MarkdownRenderer>` 组件，确保预览与最终效果一致
- 代码块使用 `highlight.js` 进行语法高亮
- **安全处理**：已移除 `rehypeRaw`，防止 XSS 攻击
- TOC 从渲染后的 DOM 提取 heading ID，保证与 `rehype-slug` 生成的 ID 一致

---

## 7. 图片存储与压缩

### 7.1 上传流程

```
Frontend (File/Blob)
    ↓ 三种方式：粘贴 / 拖拽 / 选择文件
Axios (FormData, multipart/form-data)
    ↓
Backend: FastAPI UploadFile
    ├─ 校验：格式（jpg/png/gif/webp）、内容真实性（PIL 验证）、大小（默认 ≤5MB）
    ├─ 压缩：>2MB 自动压缩，质量 85%，PNG 保留透明度
    ├─ 存储：通过 StorageBackend 统一接口（本地 / OSS / R2 / 七牛）
    └─ 记录：写入 Image 表
    ↓
Response: { images: [{ url, filename, original_name, file_size }] }
```

### 7.2 存储架构

采用策略模式封装存储后端：

```python
class StorageBackend(ABC):
    def save(self, file_data: bytes, filepath: str) -> str: ...
    def delete(self, filepath: str) -> bool: ...
```

| 后端 | 配置 | 说明 |
|------|------|------|
| **LocalStorage** | `STORAGE_TYPE=local` | 默认，文件保存在 `UPLOAD_DIR` |
| **AliyunOSSStorage** | `STORAGE_TYPE=aliyun_oss` | 已接入，支持自定义域名 |
| **CloudflareR2Storage** | `STORAGE_TYPE=cloudflare_r2` | 已接入，S3 兼容 |
| **QiniuStorage** | `STORAGE_TYPE=qiniu` | 已接入 |

### 7.3 静态文件挂载

```python
# main.py
app.mount("/static/upload", StaticFiles(directory=settings.UPLOAD_DIR), name="upload")
```

本地存储返回 URL 格式：`{SITE_URL}/static/upload/{year}/{month}/{filename}`  
OSS 存储返回 URL 格式：`https://{bucket}.{endpoint}/{year}/{month}/{filename}`

---

## 8. 鉴权与安全

### 8.1 JWT 设计

| 参数 | 值 |
|------|-----|
| 算法 | HS256 |
| 密钥 | `JWT_SECRET_KEY`（生产环境建议 32 字节随机字符串） |
| 有效期 | 30 天（`JWT_EXPIRE_DAYS`） |
| 存储 | `localStorage`（前端） |

### 8.2 安全策略

- Token 通过 HTTP Header 传输，非 Cookie（避免 CSRF 问题）
- 后端 `/api/v1/admin/*` 路由统一使用 `get_current_user` 依赖注入鉴权
- `get_current_user` 解码 JWT 后**查询 User 表验证账号存在**，防止删除账号后 Token 仍有效
- 密码使用 `bcrypt` 哈希存储
- 登录接口 IP 限流：5 次失败 → 锁定 5 分钟

---

## 9. 站点配置系统

### 9.1 配置项

| 配置键 | 用途 | 前台展示位置 |
|--------|------|-------------|
| `site_title` | 站点标题 | Navbar、Home 介绍卡片 |
| `site_subtitle` | 站点副标题 | Navbar 标题右侧 |
| `site_logo` | 站点 Logo | Navbar |
| `home_intro` | 首页介绍语 | Home 介绍卡片 |
| `github_url` | GitHub 链接 | Footer |
| `xiaohongshu_url` | 小红书链接 | Footer |
| `footer_text` | 页脚版权文字 | Footer |

### 9.2 配置初始化

首次启动时，`_init_site_config()` 自动插入默认配置。新增配置项需同步更新：
1. `backend/app/main.py` - `_init_site_config()` 默认值
2. `frontend/src/hooks/useSiteConfig.ts` - `DEFAULT_CONFIG` 默认值
3. `frontend/src/types/index.ts` - `SiteConfig` 接口
4. `frontend/src/pages/admin/Settings.tsx` - 后台表单字段

---

## 10. 部署架构

### 10.1 生产部署

```
Nginx / 直接暴露端口
    ├─ 前端：serve dist/ (port 3000)
    └─ 后端：uvicorn (port 8000)
        └─ SQLite 文件
```

### 10.2 systemd 服务

- `blog-backend.service`：Uvicorn 运行 FastAPI，WorkingDirectory 指向 `backend/`
- `blog-frontend.service`：`serve` 运行静态构建产物，Environment PATH 包含 nvm node 目录

### 10.3 一键部署脚本关键逻辑

1. 环境检测：Python ≥3.10，Node.js ≥20（通过 nvm 安装）
2. `.env` 配置：自动生成 `JWT_SECRET_KEY`，检测服务器公网 IP
3. `frontend/.env` 生成：在 `npm run build` **之前**写入 `VITE_API_BASE_URL`
4. `backend/.env` 符号链接：`config.py` 从 `backend/` 目录加载 `.env`
5. 构建：显式使用 nvm 的 Node 路径，避免系统默认 Node 版本冲突
6. 服务注册：`systemctl daemon-reload && enable && restart`

---

## 11. 定时备份架构

### 11.1 备份流程

```
[APScheduler BackgroundScheduler]
    ↓ IntervalTrigger(days=BACKUP_INTERVAL_DAYS)
perform_backup(trigger_type="scheduled")
    ↓
backup_database_and_images()  # 使用 VACUUM INTO
    ↓
_upload_to_oss(data, oss_key)  # 上传至 OSS backups/ 前缀
    ↓
写入 BackupRecord (success/failed)
    ↓
_cleanup_old_backups()  # 删除超过保留期的备份
```

### 11.2 备份配置

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `BACKUP_ENABLED` | 是否启用自动备份 | `true` |
| `BACKUP_INTERVAL_DAYS` | 备份间隔（天） | `3` |
| `BACKUP_RETENTION_DAYS` | 备份保留天数 | `30` |
| `BACKUP_OSS_PREFIX` | OSS 存储前缀 | `backups` |

### 11.3 管理接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/admin/backup/trigger` | POST | 手动触发备份 |
| `/api/v1/admin/backup/history` | GET | 获取备份历史 |
| `/api/v1/admin/backup/stats` | GET | 获取备份统计 |

---

## 12. 扩展指南

### 11.1 接入新的云存储

1. 继承 `StorageBackend` 实现对应云存储后端
2. 在 `get_storage_backend()` 中添加分支判断
3. 配置对应的环境变量（AccessKey、SecretKey、Bucket 等）
4. 安装对应 SDK 到 `requirements.txt`

### 11.2 更换数据库

当前使用 SQLite，如需迁移到 PostgreSQL/MySQL：

1. 修改 `.env` 中的 `DATABASE_URL`（如 `postgresql://user:pass@localhost/blog`）
2. 安装对应数据库驱动（`psycopg2` / `pymysql`）
3. 无需修改模型代码（SQLAlchemy 已做抽象）

### 11.3 前端二次开发

- 品牌色：`BRAND_COLOR` 环境变量（十六进制，不含 `#`）
- 新增页面：在 `frontend/src/pages/` 添加组件，在 `App.tsx` 注册路由
- API 新增：在 `frontend/src/api/` 添加接口函数，在 `types/` 补充类型

---

## 12. 已知限制

| 限制 | 说明 |
|------|------|
| 单管理员 | 当前仅支持一个管理员账号 |
| 无评论系统 | 如需评论需额外集成第三方服务 |
| SQLite 并发 | 高并发写入场景建议迁移 PostgreSQL |
| 图片删除 | 删除文章时同步删除关联图片文件，但文章正文中手动引用的外链图片不处理 |
