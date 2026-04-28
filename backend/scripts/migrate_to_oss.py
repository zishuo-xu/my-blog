#!/usr/bin/env python3
"""
图片存储迁移脚本：本地 → 阿里云OSS
用法：
    cd backend && source venv/bin/activate && python scripts/migrate_to_oss.py

功能：
1. 将本地 upload/ 目录下的所有图片上传到阿里云OSS
2. 更新数据库中 images 表的 url 字段
3. 更新所有文章正文中引用的本地图片URL为OSS URL
4. 可选：上传完成后删除本地文件（--delete-local）
"""
import argparse
import os
import sys
from pathlib import Path

# 将backend目录加入路径
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import Article, Image
from app.services.storage_service import get_storage_backend, LocalStorage


def get_local_files(upload_dir: Path):
    """递归获取所有本地图片文件"""
    files = []
    if not upload_dir.exists():
        return files
    for file_path in upload_dir.rglob("*"):
        if file_path.is_file():
            relative = file_path.relative_to(upload_dir).as_posix()
            files.append({
                "full_path": file_path,
                "relative": relative,
                "size": file_path.stat().st_size,
            })
    return files


def migrate_images(upload_dir: Path, oss_storage, delete_local: bool = False):
    """迁移图片并更新数据库"""
    db = SessionLocal()
    try:
        files = get_local_files(upload_dir)
        if not files:
            print("本地图片目录为空，无需迁移")
            return

        print(f"发现 {len(files)} 个本地图片文件，开始迁移...")

        # 统计
        uploaded = 0
        skipped = 0
        failed = 0
        url_mappings = {}  # 旧URL -> 新URL

        # 1. 上传所有图片到OSS
        for idx, file_info in enumerate(files, 1):
            rel_path = file_info["relative"]
            full_path = file_info["full_path"]

            # 构建旧的本地URL
            old_url = f"{settings.SITE_URL}/static/upload/{rel_path}"

            print(f"[{idx}/{len(files)}] 上传: {rel_path} ({file_info['size']/1024:.1f} KB)")

            try:
                file_data = full_path.read_bytes()
                new_url = oss_storage.save(file_data, rel_path)
                url_mappings[old_url] = new_url
                uploaded += 1

                # 可选：删除本地文件
                if delete_local:
                    full_path.unlink()
                    print(f"  ✓ 已删除本地文件")

            except Exception as e:
                print(f"  ✗ 上传失败: {e}")
                failed += 1

        # 清理空目录
        if delete_local:
            for dir_path in sorted(upload_dir.rglob("*"), reverse=True):
                if dir_path.is_dir() and not any(dir_path.iterdir()):
                    dir_path.rmdir()

        print(f"\n上传完成: 成功 {uploaded}, 失败 {failed}")

        if not url_mappings:
            print("没有成功上传的图片，跳过数据库更新")
            return

        # 2. 更新 images 表
        print("\n更新数据库图片URL...")
        images = db.query(Image).all()
        image_updated = 0
        for img in images:
            if img.url in url_mappings:
                img.url = url_mappings[img.url]
                image_updated += 1
        db.commit()
        print(f"  images 表更新: {image_updated} 条")

        # 3. 更新文章正文中的图片URL
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
                # 同时更新HTML（如果content_html不是实时生成的）
                if article.content_html:
                    article.content_html = article.content_html.replace(
                        old_url, new_url
                    )
                article_updated += 1
        db.commit()
        print(f"  articles 表更新: {article_updated} 篇")

        # 4. 更新站点配置中的logo（如果有）
        from app.models.models import SiteConfig
        logo_config = db.query(SiteConfig).filter(SiteConfig.key == "site_logo").first()
        if logo_config and logo_config.value:
            for old_url, new_url in url_mappings.items():
                if old_url in logo_config.value:
                    logo_config.value = logo_config.value.replace(old_url, new_url)
                    db.commit()
                    print(f"  站点Logo已更新")
                    break

        print("\n✓ 迁移完成")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="将本地图片迁移到阿里云OSS")
    parser.add_argument(
        "--delete-local",
        action="store_true",
        help="上传成功后删除本地图片文件（慎用）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅模拟运行，不上传不修改",
    )
    args = parser.parse_args()

    # 检查配置
    if settings.STORAGE_TYPE != "aliyun_oss":
        print(f"错误: STORAGE_TYPE 当前为 '{settings.STORAGE_TYPE}'，请先设置为 'aliyun_oss'")
        print("步骤: 修改 .env 中 STORAGE_TYPE=aliyun_oss，并填写OSS相关配置")
        sys.exit(1)

    if not all([settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET,
                settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME]):
        print("错误: 阿里云OSS配置不完整，请检查 .env 文件")
        sys.exit(1)

    if args.dry_run:
        print("=== 模拟运行模式（不会实际上传或修改）===")

    # 初始化存储后端
    try:
        oss_storage = get_storage_backend()
    except Exception as e:
        print(f"初始化OSS失败: {e}")
        sys.exit(1)

    upload_dir = Path(settings.UPLOAD_DIR)
    print(f"本地图片目录: {upload_dir.resolve()}")
    print(f"OSS Bucket: {settings.OSS_BUCKET_NAME}")
    print(f"OSS Endpoint: {settings.OSS_ENDPOINT}")
    print(f"SITE_URL: {settings.SITE_URL}")
    print()

    if args.dry_run:
        files = get_local_files(upload_dir)
        print(f"模拟: 将上传 {len(files)} 个文件")
        for f in files:
            print(f"  - {f['relative']} ({f['size']/1024:.1f} KB)")
        return

    # 确认
    if not args.delete_local:
        confirm = input("是否开始迁移？(y/N): ")
        if confirm.lower() != "y":
            print("已取消")
            return
    else:
        confirm = input("警告: 将删除本地文件，是否继续？(yes/NO): ")
        if confirm != "yes":
            print("已取消")
            return

    migrate_images(upload_dir, oss_storage, delete_local=args.delete_local)


if __name__ == "__main__":
    main()
