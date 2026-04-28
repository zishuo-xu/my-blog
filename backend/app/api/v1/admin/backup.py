"""
管理接口：备份管理（需JWT鉴权）
支持手动触发备份、查看备份历史、查看备份统计
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.schemas.schemas import ResponseBase
from app.services.backup_service import perform_backup, get_backup_history, get_backup_stats

router = APIRouter(prefix="/admin/backup", tags=["管理-备份"])


@router.post("/trigger", summary="手动触发备份")
def trigger_backup(
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    立即执行一次全量备份并上传至OSS
    """
    result = perform_backup(trigger_type="manual")
    if result["success"]:
        return ResponseBase(
            code=200,
            msg="备份成功",
            data={
                "record_id": result["record_id"],
                "filename": result["filename"],
                "url": result["url"],
                "file_size": result.get("file_size"),
            },
        )
    else:
        return ResponseBase(
            code=500,
            msg=f"备份失败: {result['error']}",
            data={"record_id": result["record_id"]},
        )


@router.get("/history", summary="获取备份历史")
def backup_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    获取最近的备份记录列表
    """
    records = get_backup_history(db, limit=limit)
    data = [
        {
            "id": r.id,
            "filename": r.filename,
            "oss_url": r.oss_url,
            "file_size": r.file_size,
            "trigger_type": r.trigger_type,
            "status": r.status,
            "error_msg": r.error_msg,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]
    return ResponseBase(code=200, msg="success", data=data)


@router.get("/stats", summary="获取备份统计")
def backup_stats(
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    获取备份统计信息：总次数、成功数、失败数、最近备份时间
    """
    stats = get_backup_stats(db)
    return ResponseBase(code=200, msg="success", data=stats)
