"""
应用配置模块：从.env文件加载所有可配置项
所有配置集中管理，禁止在其他模块硬编码配置值
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载项目根目录的.env文件
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    """应用配置类，所有配置项通过环境变量读取"""

    # ===== 应用配置 =====
    APP_NAME: str = os.getenv("APP_NAME", "MyBlog")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # ===== 管理员账号 =====
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "change_me_in_production")

    # ===== JWT鉴权 =====
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change_this_to_a_random_string_at_least_32_chars")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", "30"))

    # ===== 数据库 =====
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./blog.db")

    # ===== 图片上传 =====
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./app/static/upload")
    MAX_IMAGE_SIZE_MB: int = int(os.getenv("MAX_IMAGE_SIZE_MB", "5"))
    COMPRESS_THRESHOLD_MB: int = int(os.getenv("COMPRESS_THRESHOLD_MB", "2"))
    COMPRESS_QUALITY: int = int(os.getenv("COMPRESS_QUALITY", "85"))
    ALLOWED_IMAGE_TYPES: list[str] = os.getenv(
        "ALLOWED_IMAGE_TYPES", "jpg,jpeg,png,gif,webp"
    ).split(",")

    # ===== 存储类型 =====
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")

    # ===== 阿里云OSS =====
    OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "")
    OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "")
    OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "")
    OSS_BUCKET_NAME: str = os.getenv("OSS_BUCKET_NAME", "")

    # ===== Cloudflare R2 =====
    R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_ACCESS_KEY_SECRET: str = os.getenv("R2_ACCESS_KEY_SECRET", "")
    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "")

    # ===== 七牛云 =====
    QINIU_ACCESS_KEY: str = os.getenv("QINIU_ACCESS_KEY", "")
    QINIU_SECRET_KEY: str = os.getenv("QINIU_SECRET_KEY", "")
    QINIU_BUCKET_NAME: str = os.getenv("QINIU_BUCKET_NAME", "")
    QINIU_DOMAIN: str = os.getenv("QINIU_DOMAIN", "")

    # ===== UI配置 =====
    BRAND_COLOR: str = os.getenv("BRAND_COLOR", "165DFF")
    BORDER_RADIUS: int = int(os.getenv("BORDER_RADIUS", "6"))

    # ===== 站点配置 =====
    SITE_URL: str = os.getenv("SITE_URL", "http://localhost:8000")
    SITE_NAME: str = os.getenv("SITE_NAME", "My Blog")
    SITE_DESCRIPTION: str = os.getenv("SITE_DESCRIPTION", "A minimal personal blog")

    # ===== 定时备份配置 =====
    BACKUP_ENABLED: bool = os.getenv("BACKUP_ENABLED", "true").lower() == "true"
    BACKUP_INTERVAL_DAYS: int = int(os.getenv("BACKUP_INTERVAL_DAYS", "3"))
    BACKUP_RETENTION_DAYS: int = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
    BACKUP_OSS_PREFIX: str = os.getenv("BACKUP_OSS_PREFIX", "backups")

    @property
    def max_image_size_bytes(self) -> int:
        """最大图片字节数"""
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    @property
    def compress_threshold_bytes(self) -> int:
        """压缩阈值字节数"""
        return self.COMPRESS_THRESHOLD_MB * 1024 * 1024


# 全局配置实例
settings = Settings()
