"""
数据导出/导入/备份服务
- 导出：所有文章+图片打包为ZIP
- 导入：从ZIP包批量导入MD文章
- 备份：数据库文件+所有图片打包为ZIP
"""
import os
import io
import json
import zipfile
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Article, Category, Tag, article_tags


def export_articles_with_images(db: Session) -> bytes:
    """
    导出所有文章+关联图片为ZIP包
    ZIP结构：
    - articles/：每篇文章一个MD文件，front matter包含元数据
    - images/：所有上传的图片文件
    - metadata.json：分类和标签信息
    """
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 获取所有分类和标签信息
        categories = db.query(Category).all()
        tags = db.query(Tag).all()

        # 写入metadata.json
        metadata = {
            "categories": [{"id": c.id, "name": c.name, "slug": c.slug} for c in categories],
            "tags": [{"id": t.id, "name": t.name, "slug": t.slug} for t in tags],
            "exported_at": datetime.utcnow().isoformat(),
        }
        zf.writestr("metadata.json", json.dumps(metadata, ensure_ascii=False, indent=2))

        # 获取所有文章
        articles = db.query(Article).all()
        upload_dir = Path(settings.UPLOAD_DIR)

        for article in articles:
            # 构建front matter
            front_matter_lines = ["---"]
            front_matter_lines.append(f"title: \"{article.title}\"")
            if article.slug:
                front_matter_lines.append(f"slug: \"{article.slug}\"")
            if article.summary:
                front_matter_lines.append(f"summary: \"{article.summary}\"")
            front_matter_lines.append(f"published: {str(article.is_published).lower()}")
            if article.category:
                front_matter_lines.append(f"category: \"{article.category.name}\"")
            if article.tags:
                tag_names = ", ".join([f"\"{t.name}\"" for t in article.tags])
                front_matter_lines.append(f"tags: [{tag_names}]")
            if article.published_at:
                front_matter_lines.append(f"date: \"{article.published_at.isoformat()}\"")
            front_matter_lines.append("---\n")

            # 拼接完整MD内容
            full_content = "\n".join(front_matter_lines) + article.content_md

            # 文件名用标题的slug或ID
            filename = article.slug or f"article-{article.id}"
            # 清理文件名中的特殊字符
            filename = "".join(c if c.isalnum() or c in "-_" else "-" for c in filename)
            zf.writestr(f"articles/{filename}.md", full_content)

            # 收集文章中引用的图片并打包
            if article.content_md:
                import re
                # 匹配MD图片语法：![alt](url)
                img_pattern = re.compile(r'!\[.*?\]\((.*?)\)')
                for match in img_pattern.finditer(article.content_md):
                    img_url = match.group(1)
                    # 从URL提取本地路径
                    if "/static/upload/" in img_url:
                        img_path = img_url.split("/static/upload/")[-1]
                        full_img_path = upload_dir / img_path
                        if full_img_path.exists():
                            zf.write(full_img_path, f"images/{img_path}")

    buffer.seek(0)
    return buffer.getvalue()


def import_articles_from_zip(db: Session, zip_data: bytes) -> dict:
    """
    从ZIP包批量导入MD文章
    返回导入结果统计
    """
    from app.services.md_service import md_to_html
    from app.services.article_service import calculate_read_time, generate_summary

    result = {"imported": 0, "skipped": 0, "errors": []}

    with zipfile.ZipFile(io.BytesIO(zip_data), "r") as zf:
        # 读取metadata
        metadata = {}
        if "metadata.json" in zf.namelist():
            metadata = json.loads(zf.read("metadata.json"))

        # 导入分类
        category_map = {}
        for cat_data in metadata.get("categories", []):
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if existing:
                category_map[cat_data["name"]] = existing
            else:
                cat = Category(name=cat_data["name"], slug=cat_data["slug"])
                db.add(cat)
                db.commit()
                db.refresh(cat)
                category_map[cat_data["name"]] = cat

        # 导入标签
        tag_map = {}
        for tag_data in metadata.get("tags", []):
            existing = db.query(Tag).filter(Tag.name == tag_data["name"]).first()
            if existing:
                tag_map[tag_data["name"]] = existing
            else:
                tag = Tag(name=tag_data["name"], slug=tag_data["slug"])
                db.add(tag)
                db.commit()
                db.refresh(tag)
                tag_map[tag_data["name"]] = tag

        # 解压图片文件
        upload_dir = Path(settings.UPLOAD_DIR)
        for name in zf.namelist():
            if name.startswith("images/") and not name.endswith("/"):
                img_data = zf.read(name)
                img_relative_path = name.replace("images/", "")
                img_full_path = upload_dir / img_relative_path
                img_full_path.parent.mkdir(parents=True, exist_ok=True)
                img_full_path.write_bytes(img_data)

        # 导入文章
        md_files = [n for n in zf.namelist() if n.startswith("articles/") and n.endswith(".md")]
        for md_file in md_files:
            try:
                content = zf.read(md_file).decode("utf-8")
                # 解析front matter
                article_data = parse_front_matter(content)

                # 检查是否已存在（按slug）
                slug = article_data.get("slug")
                if slug:
                    existing = db.query(Article).filter(Article.slug == slug).first()
                    if existing:
                        result["skipped"] += 1
                        continue

                # 创建文章
                article = Article(
                    title=article_data.get("title", "Untitled"),
                    slug=slug,
                    summary=article_data.get("summary"),
                    content_md=article_data.get("content_md", ""),
                    content_html=md_to_html(article_data.get("content_md", "")),
                    is_published=article_data.get("published", False),
                    read_time=calculate_read_time(article_data.get("content_md", "")),
                )

                # 如果没有手动摘要，自动生成
                if not article.summary:
                    article.summary = generate_summary(article.content_md)

                # 设置分类
                cat_name = article_data.get("category")
                if cat_name and cat_name in category_map:
                    article.category_id = category_map[cat_name].id

                # 发布时间
                if article.is_published:
                    date_str = article_data.get("date")
                    if date_str:
                        try:
                            article.published_at = datetime.fromisoformat(date_str)
                        except:
                            article.published_at = datetime.utcnow()
                    else:
                        article.published_at = datetime.utcnow()

                db.add(article)
                db.commit()
                db.refresh(article)

                # 设置标签
                tag_names = article_data.get("tags", [])
                if tag_names:
                    article_tags_list = []
                    for tag_name in tag_names:
                        if tag_name in tag_map:
                            article_tags_list.append(tag_map[tag_name])
                    article.tags = article_tags_list
                    db.commit()

                result["imported"] += 1
            except Exception as e:
                result["errors"].append({"file": md_file, "error": str(e)})

    return result


def parse_front_matter(content: str) -> dict:
    """
    解析MD文件中的YAML front matter
    格式：---\nkey: value\n---\n正文内容
    """
    result = {"content_md": ""}

    # 检查是否有front matter
    if not content.startswith("---"):
        result["content_md"] = content
        return result

    # 找到front matter的结束位置
    end_index = content.find("---", 3)
    if end_index == -1:
        result["content_md"] = content
        return result

    # 解析front matter
    fm_text = content[3:end_index].strip()
    result["content_md"] = content[end_index + 3:].strip()

    # 简单解析YAML（不引入pyyaml依赖，手动解析基本格式）
    for line in fm_text.split("\n"):
        line = line.strip()
        if ":" not in line:
            continue

        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()

        # 去除引号
        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1]

        # 特殊处理布尔值
        if value.lower() == "true":
            value = True
        elif value.lower() == "false":
            value = False

        # 特殊处理标签列表 [tag1, tag2]
        if key == "tags" and value.startswith("[") and value.endswith("]"):
            tag_str = value[1:-1]
            result["tags"] = [t.strip().strip('"') for t in tag_str.split(",") if t.strip()]
            continue

        result[key] = value

    return result


import sqlite3

def backup_database_and_images() -> bytes:
    """
    一键备份数据库+所有图片为ZIP包
    ZIP结构：
    - blog.db：SQLite数据库文件（使用VACUUM INTO保证一致性）
    - images/：所有上传的图片
    """
    buffer = io.BytesIO()
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 使用 VACUUM INTO 创建一致性快照，避免复制正在写入的数据库文件
        if os.path.exists(db_path):
            temp_backup = db_path + ".vacuum_backup"
            try:
                conn = sqlite3.connect(db_path)
                conn.execute(f"VACUUM INTO '{temp_backup}'")
                conn.close()
                zf.write(temp_backup, "blog.db")
            finally:
                if os.path.exists(temp_backup):
                    os.remove(temp_backup)

        # 备份图片目录
        upload_dir = Path(settings.UPLOAD_DIR)
        if upload_dir.exists():
            for file_path in upload_dir.rglob("*"):
                if file_path.is_file():
                    relative_path = file_path.relative_to(upload_dir)
                    zf.write(file_path, f"images/{relative_path}")

    buffer.seek(0)
    return buffer.getvalue()
