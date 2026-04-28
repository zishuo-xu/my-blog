# 备份与恢复技术方案

## 1. 概述

本方案覆盖博客系统的全量数据备份、增量备份、灾难恢复和迁移场景。核心数据包括：

- **SQLite 数据库**：文章、分类、标签、站点配置、用户信息
- **静态图片**：文章内嵌图片、站点 Logo
- **环境配置**：`.env` 中的密钥和地址配置

---

## 2. 备份策略

### 2.1 备份类型对比

| 类型 | 内容 | 适用场景 | 频率建议 |
|------|------|----------|----------|
| **全量备份** | 数据库 + 所有图片 | 日常兜底、迁移服务器 | 每日 |
| **文章导出** | Markdown + 元数据 + 图片 | 跨平台迁移、内容归档 | 按需 |
| **配置备份** | `.env` 文件 | 密钥轮换、环境重建 | 变更时 |

### 2.2 全量备份实现

使用 `VACUUM INTO` 生成一致性数据库快照，避免直接复制正在写入的 SQLite 文件导致损坏。

```
备份包结构 (blog_backup_YYYYMMDD.zip)
├── blog.db              # SQLite 数据库快照
└── images/              # 所有上传图片（保留原始目录结构）
    ├── 2026/
    │   └── 04/
    │       └── xxx.webp
    └── ...
```

**API 端点**：`GET /api/v1/admin/backup`（需 JWT）

**核心逻辑**：
1. 通过 `sqlite3.connect(db).execute("VACUUM INTO 'temp.db'")` 生成冷备份
2. 将临时数据库写入 ZIP
3. 遍历 `UPLOAD_DIR`，把所有图片按相对路径写入 ZIP
4. 清理临时文件，返回 ZIP 字节流

### 2.3 文章导出实现

将文章转为 Markdown + YAML front matter 格式，便于跨平台迁移。

```
导出包结构 (blog_export.zip)
├── metadata.json        # 分类、标签清单
├── articles/
│   ├── hello-world.md   # front matter + Markdown 正文
│   └── ...
└── images/
    └── ...              # 文章中引用的本地图片
```

**API 端点**：`GET /api/v1/admin/export`（需 JWT）

### 2.4 自动化备份（crontab）

在服务器配置定时任务，每日凌晨自动备份到本地目录，保留最近 7 天：

```bash
# /etc/cron.d/blog-backup
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin

# 每天 03:00 执行全量备份
0 3 * * * root /root/my-blog/scripts/auto_backup.sh >> /var/log/blog-backup.log 2>&1
```

`auto_backup.sh` 示例：

```bash
#!/bin/bash
set -e

PROJECT_DIR="/root/my-blog"
BACKUP_DIR="/root/backups"
TOKEN="YOUR_ADMIN_JWT_TOKEN"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)

# 下载备份
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/backup \
  -o "$BACKUP_DIR/blog_backup_$DATE.zip"

# 清理过期备份
find "$BACKUP_DIR" -name "blog_backup_*.zip" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: blog_backup_$DATE.zip"
```

---

## 3. 恢复策略

### 3.1 全量恢复（数据库 + 图片）

适用于服务器迁移或数据库损坏后的完整重建。

**前置条件**：
- 已安装 Python 3.10+、Node.js 20+
- 已克隆代码并安装依赖
- `.env` 已配置（尤其是 `JWT_SECRET_KEY` 和 `ADMIN_PASSWORD`）

**操作步骤**：

```bash
# 1. 停止服务
systemctl stop blog-backend

# 2. 备份当前数据（防止误操作）
mv /root/my-blog/backend/blog.db \
   /root/my-blog/backend/blog.db.bak.$(date +%Y%m%d%H%M%S)
mv /root/my-blog/backend/app/static/upload \
   /root/my-blog/backend/app/static/upload.bak.$(date +%Y%m%d%H%M%S)

# 3. 解压备份包
cd /root/my-blog/backend
unzip /root/backups/blog_backup_20260428_030000.zip

# 4. 恢复数据库
mv blog.db ./

# 5. 恢复图片
mkdir -p app/static/upload
mv images/* app/static/upload/ 2>/dev/null || true

# 6. 检查目录权限
chown -R root:root app/static/upload
chmod -R 755 app/static/upload

# 7. 重启服务
systemctl restart blog-backend
systemctl restart blog-frontend

# 8. 验证
curl -s http://localhost:8000/api/v1/public/site-config | python3 -m json.tool
curl -s http://localhost:8000/api/v1/public/articles?page=1 | python3 -m json.tool
```

### 3.2 文章级恢复（导入）

适用于内容迁移或批量补充文章，不会覆盖已有数据（按 slug 去重）。

**API 端点**：`POST /api/v1/admin/import`（需 JWT，Content-Type: multipart/form-data）

**操作步骤**：
1. 准备 ZIP 包（结构与导出包一致）
2. 登录后台 → 数据管理 → 选择 ZIP 文件上传
3. 系统自动解析 `metadata.json` 重建分类和标签
4. 按 slug 去重导入文章，跳过已存在的文章
5. 返回导入统计：成功数 / 跳过数 / 错误详情

### 3.3 单文章恢复（手动）

适用于误删单篇文章的场景：

```bash
# 从备份包中提取单篇文章
cd /tmp
unzip /root/backups/blog_backup_20260428_030000.zip

# 使用 sqlite3 CLI 直接插入（需构造完整 INSERT）
sqlite3 /root/my-blog/backend/blog.db <<EOF
INSERT INTO articles (title, slug, summary, content_md, content_html, is_published, read_time, read_count, category_id, published_at, created_at, updated_at)
VALUES (...);
EOF
```

---

## 4. 存储扩展方案

### 4.1 本地存储（默认）

- 数据库：`backend/blog.db`
- 图片：`backend/app/static/upload/`
- 备份：`/root/backups/`

**优点**：零依赖、恢复快  
**缺点**：单点风险，磁盘故障即丢失

### 4.2 远程对象存储（推荐生产环境）

支持阿里云 OSS、Cloudflare R2、七牛云。配置 `.env`：

```env
STORAGE_TYPE=aliyun_oss
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET=my-blog-images
```

**备份策略调整**：
- 图片已存远端，全量备份包只需包含数据库文件
- 备份体积从数百 MB 降至数 MB
- 可将备份包本身也上传至对象存储的 `backups/` 前缀

### 4.3 云存储备份脚本示例

```bash
#!/bin/bash
# 备份后上传至阿里云 OSS
BACKUP_FILE="blog_backup_$(date +%Y%m%d_%H%M%S).zip"

# 1. 生成备份（仅数据库，图片在 OSS）
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/backup \
  -o "/tmp/$BACKUP_FILE"

# 2. 上传至 OSS
aliyun oss cp "/tmp/$BACKUP_FILE" "oss://my-blog-backups/$BACKUP_FILE"

# 3. 清理本地临时文件
rm "/tmp/$BACKUP_FILE"
```

---

## 5. 灾难恢复检查清单

| 检查项 | 操作 |
|--------|------|
| 服务停止 | `systemctl stop blog-backend blog-frontend` |
| 当前数据备份 | 重命名 `blog.db` 和 `upload/` 目录 |
| 备份包完整性 | `unzip -t blog_backup.zip` 验证无报错 |
| 数据库恢复 | 解压后文件权限正确（`644`） |
| 图片恢复 | 目录结构与原始一致，无丢失 |
| 配置检查 | `.env` 中的 `JWT_SECRET_KEY` 与备份前一致（避免 Token 失效） |
| 服务启动 | `systemctl restart blog-backend blog-frontend` |
| 功能验证 | 前台首页、文章详情、图片显示、后台登录 |
| 数据校验 | 文章数量、分类数量、标签数量与预期一致 |

---

## 6. 待优化项

1. **后台 UI 一键备份/恢复按钮**：当前仅提供 API，需管理员手动 curl 或 SSH 操作
2. **增量备份**：当前全量备份每次都会打包所有图片，图片量大时效率低
3. **备份加密**：敏感数据库建议备份时 AES 加密
4. **异地容灾**：支持将备份自动同步至第二存储（如另一台服务器或云盘）
5. **恢复 API**：提供 `POST /api/v1/admin/restore` 端点，上传 ZIP 后自动完成恢复流程
