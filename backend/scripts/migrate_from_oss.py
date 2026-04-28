#!/usr/bin/env python3
"""
图片存储回退脚本：阿里云OSS → 本地
用法：
    cd backend && source venv/bin/activate && python scripts/migrate_from_oss.py

功能：
1. 从阿里云OSS下载所有图片到本地 upload/ 目录
2. 更新数据库中 images 表的 url 字段为本地URL
3. 更新所有文章正文中引用的OSS图片URL为本地URL

注意：执行前请确保 .env 中 STORAGE_TYPE=local
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import Article, Image
from app.services.storage_service import get_storage_backend


def migrate_from_oss(oss_storage, local_dir: Path):
    """从OSS下载图片回本地"""
    db = SessionLocal()
    try:
        # 获取所有OSS上的图片（通过数据库记录）
        images = db.query(Image).all()
        if not images:
            print("数据库中没有图片记录")
            return

        print(f"发现 {len(images)} 张图片记录，开始回退到本地...")

        url_mappings = {}  # 旧URL -> 新URL
        downloaded = 0
        failed = 0

        for idx, img in enumerate(images, 1):
            old_url = img.url
            filepath = img.filename  # 相对路径，如 2026/04/xxx.png

            print(f"[{idx}/{len(images)}] 下载: {filepath}")

            try:
                # 从OSS下载图片数据
                # 需要OSS bucket对象来获取文件
                if hasattr(oss_storage, 'bucket'):
                    obj = oss_storage.bucket.get_object(filepath)
                    file_data = obj.read()
                else:
                    print(f"  ✗ 无法获取OSS bucket对象")
                    failed += 1
                    continue

                # 保存到本地
                local_path = local_dir / filepath
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_bytes(file_data)

                # 构建本地URL
                new_url = f"{settings.SITE_URL}/static/upload/{filepath}"
                url_mappings[old_url] = new_url
                downloaded += 1

            except Exception as e:
                print(f"  ✗ 下载失败: {e}")
                failed += 1

        print(f"\n下载完成: 成功 {downloaded}, 失败 {failed}")

        if not url_mappings:
            print("没有成功下载的图片，跳过数据库更新")
            return

        # 更新 images 表
        print("\n更新数据库图片URL...")
        image_updated = 0
        for img in images:
            if img.url in url_mappings:
                img.url = url_mappings[img.url]
                image_updated += 1
        db.commit()
        print(f"  images 表更新: {image_updated} 条")

        # 更新文章正文
        print("\n更新文章正文中的图片引用...")
        articles = db.query(Article).all()
        article_updated = 0
        for article in articles:
            if not article.content_md:
                continue
            original = article.content_md
            updated = original
            for old_url, new_url in url_mappings.items():
                updated = updated.replace(old_url, new_url)
            if updated != original:
                article.content_md = updated
                if article.content_html:
                    article.content_html = article.content_html.replace(old_url, new_url)
                article_updated += 1
        db.commit()
        print(f"  articles 表更新: {article_updated} 篇")

        # 更新站点配置logo
        from app.models.models import SiteConfig
        logo_config = db.query(SiteConfig).filter(SiteConfig.key == "site_logo").first()
        if logo_config and logo_config.value:
            for old_url, new_url in url_mappings.items():
                if old_url in logo_config.value:
                    logo_config.value = logo_config.value.replace(old_url, new_url)
                    db.commit()
                    print(f"  站点Logo已更新")
                    break

        print("\n✓ 回退完成")

    finally:
        db.close()


def main():
    if settings.STORAGE_TYPE != "local":
        print(f"警告: STORAGE_TYPE 当前为 '{settings.STORAGE_TYPE}'")
        print("回退前请确认: 你的 .env 最终将改为 STORAGE_TYPE=local")
        confirm = input("是否继续回退？图片将下载到本地 (y/N): ")
        if confirm.lower() != "y":
            print("已取消")
            return

    if not all([settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET,
                settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME]):
        print("错误: 阿里云OSS配置不完整")
        sys.exit(1)

    # 临时用OSS配置初始化存储后端
    import os
    original_type = settings.STORAGE_TYPE
    os.environ["STORAGE_TYPE"] = "aliyun_oss"
    # 强制重新加载settings（简单处理：直接修改实例属性）
    settings.STORAGE_TYPE = "aliyun_oss"

    try:
        oss_storage = get_storage_backend()
    except Exception as e:
        print(f"初始化OSS失败: {e}")
        sys.exit(1)
    finally:
        settings.STORAGE_TYPE = original_type

    local_dir = Path(settings.UPLOAD_DIR)
    local_dir.mkdir(parents=True, exist_ok=True)

    print(f"本地目标目录: {local_dir.resolve()}")
    print(f"OSS Bucket: {settings.OSS_BUCKET_NAME}")
    print()

    confirm = input("确认开始从OSS下载到本地？(y/N): ")
    if confirm.lower() != "y":
        print("已取消")
        return

    migrate_from_oss(oss_storage, local_dir)


if __name__ == "__main__":
    main()
