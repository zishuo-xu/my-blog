# My Blog - 极简个人技术博客

仅个人使用的极简前后端分离博客，围绕写作、发布、阅读流程设计。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + TypeScript + Tailwind CSS |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic 2.x |
| 数据库 | SQLite |
| 部署 | Docker / 直接运行 + Nginx |

## 核心功能

- 首页文章列表 / 分类 / 标签云 / 归档 / 全文搜索（关键词高亮）
- 文章详情（MD渲染、代码高亮、图片懒加载+点击放大、TOC目录）
- 深色模式（跟随系统 + 手动切换 + localStorage持久化）
- 后台单账号登录（JWT 30天有效期）
- **Markdown编辑器**：左右分屏实时预览 / 工具栏 / 快捷键(Ctrl+B/I/K/S) / 分屏拖拽 / 自动存草稿
- **图片上传三种方式**：Ctrl+V粘贴 / 拖拽 / 选择文件，上传后自动插入`![](url)`到光标位置，>2MB自动压缩
- 数据导入导出（ZIP）+ 一键备份
- SEO：sitemap.xml / robots.txt / OG标签

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

### 1. 拉取代码 + 配置环境变量

```bash
git clone https://github.com/zishuo-xu/my-blog.git && cd my-blog
cp .env.example .env
```

编辑 `.env`，**必须修改**：

```bash
ADMIN_PASSWORD=你的强密码                    # 必须
JWT_SECRET_KEY=$(openssl rand -hex 32)      # 必须，命令生成
FRONTEND_URL=https://your-domain.com        # 改为实际域名
SITE_URL=https://your-domain.com            # 改为实际域名
DEBUG=false                                 # 生产环境关闭
```

### 方案A：直接运行（无需Docker）

```bash
# 安装Node.js（如未安装）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && source ~/.bashrc && nvm install 20

# 启动后端（systemd守护进程）
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

# 构建前端
cd ../frontend && npm install && npm run build

# Nginx托管
apt install -y nginx
cat > /etc/nginx/sites-available/blog << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    root /root/my-blog/frontend/dist;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    location /assets/ { expires 30d; add_header Cache-Control "public, immutable"; }
    location /api/ { proxy_pass http://127.0.0.1:8000; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }
    location /static/ { proxy_pass http://127.0.0.1:8000; }
    location / { try_files $uri $uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### 方案B：Docker一键部署

```bash
# 安装Docker
curl -fsSL https://get.docker.com | sh && systemctl enable --now docker

# .env中额外修改
DATABASE_URL=sqlite:///./data/blog.db
UPLOAD_DIR=/app/data/upload

# 启动
docker-compose up -d --build
```

### HTTPS配置（通用）

```bash
# Caddy：自动申请续期Let's Encrypt，零配置
apt install -y caddy
cat > /etc/caddy/Caddyfile << EOF
your-domain.com {
    reverse_proxy localhost:80
}
EOF
systemctl restart caddy
```

### 数据备份

```bash
# 手动备份
curl -H "Authorization: Bearer <token>" https://your-domain.com/api/v1/admin/backup -o backup.zip

# 自动备份：每天3点执行
cat > /root/backup-blog.sh << 'SCRIPT'
#!/bin/bash
DIR="/root/blog-backups"; mkdir -p $DIR; DATE=$(date +%Y%m%d_%H%M%S)
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"你的密码"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/admin/backup -o $DIR/blog_$DATE.zip
find $DIR -name "blog_*.zip" -mtime +30 -delete
SCRIPT
chmod +x /root/backup-blog.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-blog.sh >> /var/log/blog-backup.log 2>&1") | crontab -
```

### 常用运维

```bash
# 直接运行方案
journalctl -u blog-backend -f     # 查看后端日志
systemctl restart blog-backend    # 重启后端
cd my-blog && git pull            # 更新代码
cd backend && source venv/bin/activate && pip install -r requirements.txt && systemctl restart blog-backend
cd ../frontend && npm install && npm run build   # 前端重新构建

# Docker方案
docker-compose logs -f            # 查看日志
docker-compose restart            # 重启
git pull && docker-compose up -d --build   # 更新部署
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ADMIN_PASSWORD` | change_me_in_production | 管理员密码（**生产环境必须修改**） |
| `JWT_SECRET_KEY` | - | JWT密钥（**生产环境必须修改**，`openssl rand -hex 32`生成） |
| `FRONTEND_URL` | http://localhost:5173 | 前端地址（CORS） |
| `SITE_URL` | http://localhost:8000 | 站点URL |
| `DEBUG` | true | 调试模式（生产设false） |
| `DATABASE_URL` | sqlite:///./blog.db | 数据库连接 |
| `UPLOAD_DIR` | ./app/static/upload | 图片存储目录 |
| `MAX_IMAGE_SIZE_MB` | 5 | 单图最大体积（MB） |
| `COMPRESS_THRESHOLD_MB` | 2 | 自动压缩阈值（MB） |
| `COMPRESS_QUALITY` | 85 | JPEG压缩质量 |
| `STORAGE_TYPE` | local | 存储类型（local/aliyun_oss/cloudflare_r2/qiniu） |
| `BRAND_COLOR` | 165DFF | 品牌主色（十六进制） |

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
