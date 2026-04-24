# My Blog - 极简个人技术博客

仅个人使用的极简前后端分离博客，围绕写作、发布、阅读流程设计。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + TypeScript + Tailwind CSS |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic 2.x |
| 数据库 | SQLite |

## 核心功能

- 首页文章列表 / 分类 / 标签云 / 归档 / 全文搜索（关键词高亮）
- 文章详情（MD渲染、代码高亮、图片懒加载+点击放大、TOC目录）
- 深色模式（跟随系统 + 手动切换 + localStorage持久化）
- 后台单账号登录（JWT 30天有效期）
- **Markdown编辑器**：左右分屏实时预览 / 工具栏 / 快捷键(Ctrl+B/I/K/S) / 分屏拖拽 / 自动存草稿
- **图片上传三种方式**：Ctrl+V粘贴 / 拖拽 / 选择文件，上传后自动插入`![](url)`到光标位置，>2MB自动压缩
- 数据导入导出（ZIP）+ 一键备份

## 本地部署

```bash
# 1. 准备环境变量
cp .env.example .env

# 2. 启动后端
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. 启动前端（另开终端）
cd frontend
npm install && npm run dev
```

访问：前台 http://localhost:5173 | 后台 http://localhost:5173/admin/login | API文档 http://localhost:8000/docs

默认账号：`admin` / `change_me_in_production`

## 服务器快速部署

### 一键脚本（推荐）

```bash
# 下载并运行，自动完成环境安装+代码拉取+构建+启动
curl -fsSL https://raw.githubusercontent.com/zishuo-xu/my-blog/main/deploy.sh | bash

# 或先下载再运行（可修改脚本顶部的配置项）
wget https://raw.githubusercontent.com/zishuo-xu/my-blog/main/deploy.sh
# 编辑 ADMIN_PASSWORD 等配置后再执行
bash deploy.sh
```

脚本自动完成：Python3 + Node.js 安装 → 代码拉取 → .env配置 → 依赖安装 → 前端构建 → systemd服务配置 → 开机自启

### 手动部署

```bash
# 1. 拉取代码
git clone https://github.com/zishuo-xu/my-blog.git && cd my-blog

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，必须修改：ADMIN_PASSWORD、JWT_SECRET_KEY（用 openssl rand -hex 32 生成）
# 同时修改 FRONTEND_URL 和 SITE_URL 为服务器IP或域名，DEBUG=false

# 3. 启动后端（systemd守护进程，开机自启）
cd backend
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
mkdir -p app/static/upload
cat > /etc/systemd/system/blog-backend.service << EOF
[Unit]
Description=Blog Backend
After=network.target
[Service]
Type=simple
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now blog-backend

# 4. 构建前端 + 启动前端服务（同样systemd守护）
cd ../frontend && npm install && npm run build
cat > /etc/systemd/system/blog-frontend.service << EOF
[Unit]
Description=Blog Frontend
After=network.target
[Service]
Type=simple
WorkingDirectory=$(pwd)
ExecStart=$(which npx) serve dist -s -l 3000
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now blog-frontend
```

部署完成：前台 http://你的IP:3000 | 后台 http://你的IP:3000/admin/login

### 常用运维

```bash
journalctl -u blog-backend -f      # 查看后端日志
journalctl -u blog-frontend -f     # 查看前端日志
systemctl restart blog-backend      # 重启后端
systemctl restart blog-frontend     # 重启前端

# 更新代码后
cd my-blog && git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt && systemctl restart blog-backend
cd ../frontend && npm install && npm run build && systemctl restart blog-frontend

# 备份
cp backend/blog.db backup_$(date +%Y%m%d).db           # 备份数据库
cp -r backend/app/static/upload/ backup_upload_$(date +%Y%m%d)/  # 备份图片
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ADMIN_PASSWORD` | change_me_in_production | 管理员密码（**生产环境必须修改**） |
| `JWT_SECRET_KEY` | - | JWT密钥（**生产环境必须修改**，`openssl rand -hex 32`生成） |
| `FRONTEND_URL` | http://localhost:5173 | 前端地址（CORS） |
| `SITE_URL` | http://localhost:8000 | 站点URL |
| `DEBUG` | true | 调试模式（生产设false） |
| `UPLOAD_DIR` | ./app/static/upload | 图片存储目录 |
| `MAX_IMAGE_SIZE_MB` | 5 | 单图最大体积（MB） |
| `STORAGE_TYPE` | local | 存储类型（local/aliyun_oss/cloudflare_r2/qiniu） |

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| `pip install` 失败 | 确保已激活虚拟环境 `source backend/venv/bin/activate` |
| 前端请求后端404 | 确保后端在8000端口运行，Vite proxy配置生效 |
| 登录返回401 | 检查 `.env` 中 ADMIN_USERNAME/ADMIN_PASSWORD |
| 图片上传失败 | 仅支持jpg/png/gif/webp，单文件≤5MB |
| 文章摘要未更新 | 编辑文章时清空摘要框，后端会自动重新生成 |
