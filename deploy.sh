#!/bin/bash
# My Blog 一键部署脚本
# 适用于Ubuntu/Debian服务器，以root运行
# 用法：bash deploy.sh

set -e

# ===== 配置项 =====
PROJECT_DIR="/root/my-blog"
REPO_URL="https://github.com/zishuo-xu/my-blog.git"
ADMIN_PASSWORD="change_me_in_production"
JWT_SECRET_KEY=""
FRONTEND_PORT=3000
BACKEND_PORT=8000

# ===== 颜色 =====
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ===== 初始化nvm（后续所有命令共享此nvm环境） =====
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# ===== 1. 环境准备 =====
info "===== 1. 环境准备 ====="
apt update -y

# Python3（>=3.10）
if python3 -c "import sys; assert sys.version_info >= (3, 10)" 2>/dev/null; then
    info "Python3: $(python3 --version)"
else
    info "安装 Python3..."
    apt install -y python3 python3-venv python3-pip
fi

# Node.js（>=20）
if node -v 2>/dev/null | grep -q "^v[2-9]"; then
    info "Node.js: $(node --version)"
else
    info "安装 Node.js 20..."
    apt install -y curl
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    . "$NVM_DIR/nvm.sh"
    nvm install 20 && nvm use 20 && nvm alias default 20
    info "Node.js: $(node --version)"
fi

# ===== 2. 拉取代码 =====
info "===== 2. 拉取代码 ====="
if [ -d "$PROJECT_DIR" ]; then
    if [ -d "$PROJECT_DIR/.git" ]; then
        warn "项目已存在，执行 git pull..."
        cd "$PROJECT_DIR" && git pull
    else
        err "目录 $PROJECT_DIR 已存在但不是git仓库，请先删除"
    fi
else
    info "克隆仓库到 $PROJECT_DIR..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# ===== 3. 配置环境变量 =====
info "===== 3. 配置环境变量 ====="
[ ! -f .env ] && cp .env.example .env

[ -z "$JWT_SECRET_KEY" ] && JWT_SECRET_KEY=$(openssl rand -hex 32)

# 获取服务器IP，优先外网，fallback内网
SERVER_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null) \
    || SERVER_IP=$(curl -s --max-time 5 https://ifconfig.me 2>/dev/null) \
    || SERVER_IP=$(hostname -I | awk '{print $1}')
[ -z "$SERVER_IP" ] && SERVER_IP="你的服务器IP"

sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|" .env
sed -i "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=${JWT_SECRET_KEY}|" .env
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=http://${SERVER_IP}:${FRONTEND_PORT}|" .env
sed -i "s|^SITE_URL=.*|SITE_URL=http://${SERVER_IP}:${BACKEND_PORT}|" .env
sed -i "s|^DEBUG=.*|DEBUG=false|" .env

# 前端环境变量（API地址必须打包进代码）
echo "VITE_API_BASE_URL=http://${SERVER_IP}:${BACKEND_PORT}" > frontend/.env

info "管理员: admin / ${ADMIN_PASSWORD}"
info "前台地址: http://${SERVER_IP}:${FRONTEND_PORT}"
info "后台地址: http://${SERVER_IP}:${FRONTEND_PORT}/admin/login"

# ===== 4. 后端依赖 =====
info "===== 4. 后端依赖 ====="
cd "$PROJECT_DIR/backend"
python3 -m venv venv
. venv/bin/activate
pip install -r requirements.txt -q
mkdir -p app/static/upload
deactivate

# ===== 5. 前端构建 =====
info "===== 5. 前端构建 ====="
cd "$PROJECT_DIR/frontend"
# 显式用nvm的node，避免shell版本不一致
NVM_NODE=/root/.nvm/versions/node/v20.20.2/bin/node
NVM_NPM=/root/.nvm/versions/node/v20.20.2/bin/npm
$NVM_NPM install 2>/dev/null | tail -3
$NVM_NODE node_modules/.bin/vite build || $NVM_NPM run build || err "前端构建失败"
$NVM_NPM install -g serve

# 获取nvm的bin目录（node和serve所在位置），供systemd使用
NVM_NODE_BIN=$(dirname $(nvm which node))
NVM_SERVE=$(which serve)

# ===== 6. systemd服务 =====
info "===== 6. 配置开机自启 ====="
# 后端
cat > /etc/systemd/system/blog-backend.service << EOF
[Unit]
Description=Blog Backend
After=network.target
[Service]
Type=simple
WorkingDirectory=${PROJECT_DIR}/backend
ExecStart=${PROJECT_DIR}/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT}
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

# 前端
cat > /etc/systemd/system/blog-frontend.service << EOF
[Unit]
Description=Blog Frontend
After=network.target
[Service]
Type=simple
WorkingDirectory=${PROJECT_DIR}/frontend
Environment=PATH=${NVM_NODE_BIN}:/usr/local/bin:/usr/bin:/bin
ExecStart=${NVM_SERVE} dist -s -l ${FRONTEND_PORT}
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable blog-backend blog-frontend
systemctl restart blog-backend blog-frontend

# ===== 7. 验证 =====
info "===== 7. 验证服务 ====="
sleep 3

BACKEND_OK=$(curl -s http://localhost:${BACKEND_PORT}/health 2>/dev/null | grep -q "ok" && echo "yes" || echo "no")
FRONTEND_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${FRONTEND_PORT} 2>/dev/null | grep -q "200" && echo "yes" || echo "no")

if [ "$BACKEND_OK" = "yes" ]; then
    info "后端  ✓ http://${SERVER_IP}:${BACKEND_PORT}"
else
    warn "后端启动异常，请检查: journalctl -u blog-backend -f"
fi

if [ "$FRONTEND_OK" = "yes" ]; then
    info "前端  ✓ http://${SERVER_IP}:${FRONTEND_PORT}"
else
    warn "前端启动异常，请检查: journalctl -u blog-frontend -f"
fi

echo ""
info "============================================"
info "  部署完成"
info "  前台: http://${SERVER_IP}:${FRONTEND_PORT}"
info "  后台: http://${SERVER_IP}:${FRONTEND_PORT}/admin/login"
info "  账号: admin / ${ADMIN_PASSWORD}"
info "============================================"
