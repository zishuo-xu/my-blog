"""
定时备份服务
- 手动触发 / 定时触发
- 备份数据库（图片已在OSS时不包含图片）
- 上传至阿里云OSS
- 清理过期备份
"""
import io
import os
from datetime import datetime, timedelta
from pathlib import Path

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import BackupRecord
from app.services.export_service import backup_database_and_images

# OSS 相关（延迟导入避免循环依赖）
_oss_bucket = None


def _get_oss_bucket():
    """获取OSS bucket实例，用于备份上传"""
    global _oss_bucket
    if _oss_bucket is not None:
        return _oss_bucket

    import oss2
    auth = oss2.Auth(settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET)
    _oss_bucket = oss2.Bucket(auth, settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME)
    return _oss_bucket


def _is_oss_storage() -> bool:
    """判断当前图片存储是否为OSS"""
    return settings.STORAGE_TYPE in ("aliyun_oss", "cloudflare_r2", "qiniu")


def _generate_backup_filename() -> str:
    """生成备份文件名"""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return f"blog_backup_{timestamp}.zip"


def _generate_oss_key(filename: str) -> str:
    """生成OSS对象Key"""
    prefix = settings.BACKUP_OSS_PREFIX.strip("/")
    return f"{prefix}/{filename}"


def _upload_to_oss(data: bytes, oss_key: str) -> str:
    """上传备份文件到OSS，返回访问URL"""
    bucket = _get_oss_bucket()
    bucket.put_object(oss_key, data)
    # 返回URL
    return f"https://{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/{oss_key}"


def _delete_oss_object(oss_key: str) -> bool:
    """从OSS删除备份文件"""
    try:
        bucket = _get_oss_bucket()
        bucket.delete_object(oss_key)
        return True
    except Exception:
        return False


def perform_backup(trigger_type: str = "manual") -> dict:
    """
    执行一次备份
    :param trigger_type: 'manual' 或 'scheduled'
    :return: {"success": bool, "record_id": int, "filename": str, "url": str, "error": str}
    """
    db = SessionLocal()
    filename = _generate_backup_filename()
    oss_key = _generate_oss_key(filename)
    record = None

    try:
        # 1. 生成备份数据
        backup_data = backup_database_and_images()
        file_size = len(backup_data)

        # 2. 上传至OSS
        oss_url = _upload_to_oss(backup_data, oss_key)

        # 3. 写入数据库记录
        record = BackupRecord(
            filename=filename,
            oss_key=oss_key,
            oss_url=oss_url,
            file_size=file_size,
            trigger_type=trigger_type,
            status="success",
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        # 4. 清理过期备份
        _cleanup_old_backups(db)

        return {
            "success": True,
            "record_id": record.id,
            "filename": filename,
            "url": oss_url,
            "error": None,
        }
    except Exception as e:
        error_msg = str(e)
        if record is None:
            record = BackupRecord(
                filename=filename,
                oss_key=oss_key,
                oss_url="",
                file_size=0,
                trigger_type=trigger_type,
                status="failed",
                error_msg=error_msg,
            )
            db.add(record)
            db.commit()
        else:
            record.status = "failed"
            record.error_msg = error_msg
            db.commit()
        return {
            "success": False,
            "record_id": record.id if record else None,
            "filename": filename,
            "url": None,
            "error": error_msg,
        }
    finally:
        db.close()


def _cleanup_old_backups(db):
    """清理超过保留期的备份文件"""
    retention = settings.BACKUP_RETENTION_DAYS
    if retention <= 0:
        return

    cutoff = datetime.utcnow() - timedelta(days=retention)
    old_records = db.query(BackupRecord).filter(
        BackupRecord.status == "success",
        BackupRecord.created_at < cutoff,
    ).all()

    for rec in old_records:
        _delete_oss_object(rec.oss_key)
        db.delete(rec)

    db.commit()


def scheduled_backup():
    """定时任务入口，供APScheduler调用"""
    if not settings.BACKUP_ENABLED:
        return
    perform_backup(trigger_type="scheduled")


def get_backup_history(db, limit: int = 50):
    """获取备份历史记录"""
    return db.query(BackupRecord).order_by(BackupRecord.created_at.desc()).limit(limit).all()


def get_backup_stats(db) -> dict:
    """获取备份统计信息"""
    total = db.query(BackupRecord).count()
    success = db.query(BackupRecord).filter(BackupRecord.status == "success").count()
    failed = db.query(BackupRecord).filter(BackupRecord.status == "failed").count()
    latest = db.query(BackupRecord).order_by(BackupRecord.created_at.desc()).first()
    return {
        "total": total,
        "success": success,
        "failed": failed,
        "latest_backup": latest.created_at.isoformat() if latest else None,
    }
