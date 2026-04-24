#!/bin/bash
# My Blog 一键部署脚本
# 适用于全新Ubuntu/Debian服务器，以root运行
# 用法：bash deploy.sh

set -e

# ===== 配置项（可按需修改） =====
PROJECT_DIR="/root/my-blog"
REPO_URL="https://github.com/zishuo-xu/my-blog.git"
ADMIN_PASSWORD="change_me_in_production"
# JWT密钥留空则自动生成
JWT_SECRET_KEY=""
FRONTEND_PORT=3000
BACKEND_PORT=8000

# ===== 颜色输出 =====
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }

# ===== 1. 环境准备 =====
info "===== 步骤1: 检查并安装基础环境 ====="

# 更新系统包
apt update -y

# Python3
if command -v python3 &>/dev/null && python3 -c "import sys; exit(0 if sys.version_info >= (3,10) else 1)"; then
    info "Python3 已安装: $(python3 --version)"
else
    info "安装 Python3..."
    apt install -y python3 python3-venv python3-pip
fi

# Node.js（通过nvm安装）
if command -v node &>/dev/null && [ "$(node -v | cut -d. -f1 | sed 's/v//')" -ge 18 ]; then
    info "Node.js 已安装: $(node --version)"
else
    info "安装 Node.js..."
    apt install -y curl
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install 20
    info "Node.js 安装完成: $(node --version)"
fi

# nvm环境变量写入bashrc（确保后续生效）
if ! grep -q 'NVM_DIR' ~/.bashrc 2>/dev/null; then
    cat >> ~/.bashrc << 'NVMRC'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
NVMRC
fi

# ===== 2. 拉取代码 =====
info "===== 步骤2: 拉取代码 ====="

if [ -d "$PROJECT_DIR" ]; then
    warn "项目目录已存在: $PROJECT_DIR，执行 git pull 更新"
    cd "$PROJECT_DIR" && git pull
else
    info "克隆仓库..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# ===== 3. 配置环境变量 =====
info "===== 步骤3: 配置环境变量 ====="

if [ ! -f .env ]; then
    cp .env.example .env
fi

# 自动生成JWT密钥
if [ -z "$JWT_SECRET_KEY" ]; then
    JWT_SECRET_KEY=$(openssl rand -hex 32)
fi

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
FRONTEND_URL="http://${SERVER_IP}:${FRONTEND_PORT}"
SITE_URL="http://${SERVER_IP}:${BACKEND_PORT}"

# 写入.env
sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|" .env
sed -i "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=${JWT_SECRET_KEY}|" .env
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_URL}|" .env
sed -i "s|^SITE_URL=.*|SITE_URL=${SITE_URL}|" .env
sed -i "s|^DEBUG=.*|DEBUG=false|" .env

info ".env 已配置:"
info "  管理员密码: ${ADMIN_PASSWORD}"
info "  JWT密钥: ${JWT_SECRET_KEY:0:8}..."
info "  前台地址: ${FRONTEND_URL}"
info "  后台地址: ${FRONTEND_URL}/admin/login"

# ===== 4. 安装后端依赖 =====
info "===== 步骤4: 安装后端依赖 ====="

cd "$PROJECT_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q
mkdir -p app/static/upload
deactivate

# ===== 5. 构建前端 =====
info "===== 步骤5: 构建前端 ====="

# 确保nvm在当前shell可用
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$PROJECT_DIR/frontend"
npm install --prefer-offline 2>/dev/null || npm install
npm run build

# 安装serve（前端静态文件服务）
npm install -g serve

# ===== 6. 配置systemd服务 =====
info "===== 步骤6: 配置开机自启服务 ====="

# 后端服务
cat > /etc/systemd/system/blog-backend.service << EOF
[Unit]
Description=Blog Backend API
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}/backend
Environment=PATH=${PROJECT_DIR}/backend/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=${PROJECT_DIR}/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT}
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

# 前端服务
cat > /etc/systemd/system/blog-frontend.service << EOF
[Unit]
Description=Blog Frontend
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}/frontend
ExecStart=$(which serve) dist -s -l ${FRONTEND_PORT}
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable blog-backend blog-frontend
systemctl restart blog-backend blog-frontend

# ===== 7. 验证 =====
info "===== 步骤7: 验证部署 ====="

sleep 3

if curl -s http://localhost:${BACKEND_PORT}/health | grep -q "ok"; then
    info "后端启动成功 ✓"
else
    warn "后端启动失败，请检查: journalctl -u blog-backend -f"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:${FRONTEND_PORT} | grep -q "200"; then
    info "前端启动成功 ✓"
else
    warn "前端启动失败，请检查: journalctl -u blog-frontend -f"
fi

echo ""
info "=========================================="
info "  部署完成！"
info "  前台: ${FRONTEND_URL}"
info "  后台: ${FRONTEND_URL}/admin/login"
info "  账号: admin / ${ADMIN_PASSWORD}"
info "=========================================="
