# My Blog - 极简个人技术博客

仅个人使用的极简前后端分离博客，围绕写作、发布、阅读流程设计。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + TypeScript + Tailwind CSS |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic 2.x |
| 数据库 | SQLite |
| 部署 | Docker + docker-compose + Nginx |

## 项目结构

```
.
├── .env.example              # 环境变量模板
├── docker-compose.yml        # 一键部署
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py           # FastAPI入口
│       ├── core/             # 配置、数据库、安全
│       │   ├── config.py     #   环境变量配置中心
│       │   ├── database.py   #   数据库连接与会话
│       │   └── security.py   #   JWT + bcrypt
│       ├── models/           # ORM模型
│       │   └── models.py     #   User/Article/Category/Tag/Image
│       ├── schemas/          # Pydantic请求/响应校验
│       │   └── schemas.py
│       ├── services/         # 业务逻辑层
│       │   ├── article_service.py  # 文章CRUD + 摘要生成 + 阅读时长
│       │   ├── md_service.py       # mistune MD→HTML解析
│       │   ├── storage_service.py  # 图片上传 + 压缩 + 存储后端
│       │   └── export_service.py   # 数据导入导出 + 备份
│       └── api/v1/           # 接口层
│           ├── public/       #   公开接口（无需鉴权，7个）
│           └── admin/        #   管理接口（JWT鉴权，8个）
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf            # Nginx配置（SPA路由 + API代理）
│   ├── tailwind.config.js    # 品牌色 + 灰阶 + 字体 + 动效规范
│   └── src/
│       ├── index.css         # 全局极简美观样式
│       ├── App.tsx           # 路由配置
│       ├── api/              # Axios请求封装
│       │   ├── request.ts    #   统一拦截器 + Token注入
│       │   ├── articles.ts   #   前台公开API
│       │   └── admin.ts      #   后台管理API
│       ├── types/index.ts    # TypeScript类型定义
│       ├── components/       # 共享组件
│       │   ├── MarkdownRenderer.tsx  # MD渲染（前后台共用）
│       │   ├── Navbar.tsx            # 导航栏 + 搜索 + 汉堡菜单
│       │   ├── DarkModeToggle.tsx    # 深色模式切换
│       │   ├── Footer.tsx            # 页脚
│       │   ├── ArticleCard.tsx       # 文章卡片
│       │   ├── Toc.tsx              # TOC目录
│       │   └── Pagination.tsx       # 分页
│       └── pages/            # 页面组件
│           ├── Home.tsx              # 首页（文章列表）
│           ├── ArticleDetail.tsx     # 文章详情
│           ├── Categories.tsx        # 分类页
│           ├── Tags.tsx             # 标签页（标签云）
│           ├── Archive.tsx          # 归档页
│           ├── Search.tsx           # 搜索页（关键词高亮）
│           └── admin/
│               ├── Login.tsx        # 登录页
│               ├── Layout.tsx       # 后台布局 + 鉴权守卫
│               ├── Articles.tsx     # 文章管理
│               └── Editor.tsx       # MD编辑器（核心）
```

## 核心功能

### 前台展示端
- 首页文章列表（分页、分类/标签筛选、关键词搜索）
- 文章详情页（MD渲染、代码高亮、图片懒加载+点击放大、TOC目录）
- 分类页 / 标签云 / 归档页（按年月聚合）
- 全文搜索（关键词高亮）
- 深色模式（跟随系统 + 手动切换 + localStorage持久化）
- SEO：自动生成 sitemap.xml、robots.txt、OG标签

### 后台管理端
- 单账号登录（JWT鉴权，30天有效期）
- 文章管理（列表筛选、发布/草稿、编辑、删除二次确认）
- **Markdown编辑器**：
  - 左右分屏实时预览，预览样式和前台100%一致
  - 工具栏：标题、加粗、斜体、引用、代码块、列表、链接、表格
  - 快捷键：Ctrl+B/I/K/S
  - 分屏拖拽调整宽度
  - 自动存草稿（30秒 + localStorage恢复）
- **图片上传三种方式**：
  - 剪贴板粘贴（Ctrl+V）
  - 拖拽上传
  - 点击工具栏按钮选择文件
  - 上传后自动插入 `![](url)` 到光标位置
  - 自动压缩（>2MB压缩到2MB以内）
  - 存储路径：`upload/年/月/随机8位.后缀`
- 数据导入导出（ZIP包，含文章+图片+元数据）
- 一键备份（数据库文件+图片）

### 设计规范
- 品牌色仅 `#165DFF`，中性灰阶统一
- 内容区最大宽度800px居中
- 字号阶梯：32/24/20/16/14/12px，无零散字号
- 动效≤0.3s，仅淡入淡出和轻微位移
- 图片圆角4-8px，代码块圆角6px，标签胶囊样式

## API接口

### 公开接口（无需鉴权）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/public/articles` | 已发布文章列表（分页/筛选/搜索） |
| GET | `/api/v1/public/articles/{id_or_slug}` | 文章详情（自动累加阅读量） |
| GET | `/api/v1/public/categories` | 分类列表 + 文章数量 |
| GET | `/api/v1/public/tags` | 标签列表 + 文章数量 |
| GET | `/api/v1/public/archive` | 按年月归档 |
| GET | `/api/v1/public/search` | 全文搜索 |
| GET | `/api/v1/public/sitemap.xml` | sitemap |
| GET | `/api/v1/public/robots.txt` | robots.txt |

### 管理接口（需JWT鉴权）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/admin/login` | 登录 |
| GET/POST | `/api/v1/admin/articles` | 文章列表/创建 |
| GET/PUT/DELETE | `/api/v1/admin/articles/{id}` | 文章详情/更新/删除 |
| POST/PUT/DELETE | `/api/v1/admin/categories` | 分类增删改 |
| POST/PUT/DELETE | `/api/v1/admin/tags` | 标签增删改 |
| POST | `/api/v1/admin/upload/image` | 图片上传（多图） |
| GET | `/api/v1/admin/export` | 导出ZIP |
| POST | `/api/v1/admin/import` | 导入ZIP |
| GET | `/api/v1/admin/backup` | 一键备份 |

## 快速开始

### 本地开发

**1. 准备环境变量**

```bash
cp .env.example .env
# 编辑 .env，修改管理员密码和JWT密钥
```

**2. 启动后端**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**3. 启动前端**

```bash
cd frontend
npm install
npm run dev
```

**4. 访问**

- 前台：http://localhost:5173
- 后台：http://localhost:5173/admin/login
- API文档：http://localhost:8000/docs

默认账号：`admin` / `change_me_in_production`（在 `.env` 中修改）

### Docker部署

```bash
# 一键启动
docker-compose up -d

# 访问
# 前台：http://localhost
# 后台：http://localhost/admin/login
```

数据持久化：SQLite数据库和图片文件挂载到宿主机 `./data/backend/` 目录。

### 生产环境部署

1. 修改 `.env` 中的敏感配置：
   - `ADMIN_PASSWORD`：设为强密码
   - `JWT_SECRET_KEY`：设为随机字符串（≥32位）
   - `FRONTEND_URL`：设为实际域名
   - `SITE_URL`：设为实际域名
   - `DEBUG=false`：关闭调试模式

2. 配置HTTPS（推荐使用 Caddy 或 Nginx + Let's Encrypt）

3. 定期备份数据：调用 `GET /api/v1/admin/backup` 下载数据库+图片ZIP包

## 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_NAME` | MyBlog | 应用名称 |
| `DEBUG` | true | 调试模式（生产环境设false） |
| `FRONTEND_URL` | http://localhost:5173 | 前端地址（CORS配置） |
| `ADMIN_USERNAME` | admin | 管理员用户名 |
| `ADMIN_PASSWORD` | change_me_in_production | 管理员密码 |
| `JWT_SECRET_KEY` | - | JWT密钥（生产环境必须修改） |
| `JWT_EXPIRE_DAYS` | 30 | Token有效期（天） |
| `DATABASE_URL` | sqlite:///./blog.db | 数据库连接 |
| `UPLOAD_DIR` | ./app/static/upload | 图片存储目录 |
| `MAX_IMAGE_SIZE_MB` | 5 | 单图最大体积（MB） |
| `COMPRESS_THRESHOLD_MB` | 2 | 自动压缩阈值（MB） |
| `COMPRESS_QUALITY` | 85 | JPEG压缩质量 |
| `ALLOWED_IMAGE_TYPES` | jpg,jpeg,png,gif,webp | 允许的图片格式 |
| `STORAGE_TYPE` | local | 存储类型（local/aliyun_oss/cloudflare_r2/qiniu） |
| `BRAND_COLOR` | 165DFF | 品牌主色（十六进制） |
| `SITE_URL` | http://localhost:8000 | 站点URL |
| `SITE_NAME` | My Blog | 站点名称 |

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| `pip install` 失败 | 确保已激活虚拟环境 `source backend/venv/bin/activate` |
| 前端请求后端404 | 确保后端在8000端口运行，Vite proxy配置生效 |
| 登录返回401 | 检查 `.env` 中 ADMIN_USERNAME/ADMIN_PASSWORD |
| 图片上传失败 | 仅支持jpg/png/gif/webp，单文件≤5MB |
| 深色模式不生效 | 清除浏览器缓存或手动切换 |
| Docker前端构建失败 | 配置npm镜像：`npm config set registry https://registry.npmmirror.com` |
| 文章摘要未更新 | 编辑文章时清空摘要框，后端会自动重新生成 |
| mistune插件报错 | mistune 3.x插件需用完整路径格式，已内置处理 |
