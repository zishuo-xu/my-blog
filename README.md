# My Blog

极简前后端分离个人博客，围绕写作、发布、阅读流程设计。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | React + Vite + TypeScript + Tailwind CSS | React 18 / Vite 8 |
| 后端 | FastAPI + SQLAlchemy + Pydantic | FastAPI 0.115 / SQLAlchemy 2.0 |
| 数据库 | SQLite | - |
| MD渲染 | react-markdown + rehype-highlight | 前后台共用 |
| 鉴权 | JWT (python-jose) + bcrypt | - |

## 项目架构

```
┌─────────────────────────────────────────────────────┐
│  前端 (React SPA)                                    │
│  ├─ 前台：首页 / 详情 / 分类 / 标签 / 归档 / 搜索    │
│  ├─ 后台：登录 / 文章管理 / MD编辑器 / 图片上传       │
│  └─ 公共：MarkdownRenderer（前后台共用，样式一致）    │
├─────────────────────────────────────────────────────┤
│  后端 (FastAPI)                                      │
│  ├─ 公开接口：文章/分类/标签/归档/搜索/sitemap       │
│  ├─ 管理接口：CRUD/图片上传/数据导入导出/备份        │
│  ├─ 业务层：MD解析 / 图片压缩 / 存储适配             │
│  └─ 数据层：SQLite + 本地/云存储                     │
└─────────────────────────────────────────────────────┘
```

## 功能概览

**前台阅读**
- 文章列表（分页、分类/标签筛选）、详情页（代码高亮、图片放大、TOC目录）
- 标签云、归档（按年月）、全文搜索（关键词高亮）
- 深色模式（跟随系统 + 手动切换 + 持久化）

**后台写作**
- 单账号登录（JWT 30天有效期）
- Markdown编辑器：左右分屏实时预览 / 工具栏 / 快捷键 Ctrl+B I K S / 分屏拖拽 / 30秒自动存草稿
- 图片上传三种方式：**Ctrl+V粘贴 / 拖拽 / 选择文件** → 自动插入`![](url)`到光标位置
- 图片>2MB自动压缩，按`年/月/随机名`存储
- 数据导入导出（ZIP）+ 一键备份

**设计规范**
- 品牌色 `#165DFF`，统一灰阶，内容区800px居中
- 字号阶梯 32/24/20/16/14/12px，动效≤0.3s，无多余装饰

## 部署

### 本地启动

```bash
cp .env.example .env

# 后端
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# 前端（另开终端）
cd frontend && npm install && npm run dev
```

前台 http://localhost:5173 | 后台 http://localhost:5173/admin/login | API文档 http://localhost:8000/docs

### 服务器一键部署

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/zishuo-xu/my-blog/main/deploy.sh)
```

脚本自动完成：环境安装 → 代码拉取 → 配置生成 → 依赖安装 → 前端构建 → systemd守护 + 开机自启

部署后：前台 `http://IP:3000` | 后台 `http://IP:3000/admin/login` | 默认密码 `admin/change_me_in_production`

## 环境变量

| 变量 | 说明 | 必须 |
|------|------|------|
| `ADMIN_PASSWORD` | 管理员密码 | ✅ |
| `JWT_SECRET_KEY` | JWT密钥（`openssl rand -hex 32`生成） | ✅ |
| `FRONTEND_URL` | 前端地址（CORS） | ✅ |
| `SITE_URL` | 站点URL | ✅ |
| `DEBUG` | 调试模式，生产环境设false | |
| `UPLOAD_DIR` | 图片存储目录 | |
| `MAX_IMAGE_SIZE_MB` | 单图最大体积，默认5MB | |
| `STORAGE_TYPE` | 存储类型：local / aliyun_oss / cloudflare_r2 / qiniu | |
