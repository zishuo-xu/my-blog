"""
管理接口：数据导入导出/备份（需JWT鉴权）
"""
from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.api.deps import get_current_user
from app.core.database import get_db
from app.services.export_service import (
    export_articles_with_images,
    import_articles_from_zip,
    backup_database_and_images,
)
from app.schemas.schemas import ResponseBase

router = APIRouter(prefix="/admin", tags=["管理-数据"])


@router.get("/export", summary="导出所有文章+图片为ZIP包")
def export_data(
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    导出所有文章（含元数据）+关联图片为ZIP包
    """
    zip_data = export_articles_with_images(db)
    return StreamingResponse(
        io.BytesIO(zip_data),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=blog_export.zip"},
    )


@router.post("/import", summary="批量导入ZIP包的MD文章")
async def import_data(
    file: UploadFile = File(..., description="ZIP文件"),
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    从ZIP包批量导入MD文章
    ZIP结构：articles/目录下的MD文件 + images/目录下的图片 + metadata.json
    """
    if not file.filename.endswith(".zip"):
        return ResponseBase(code=400, msg="仅支持ZIP格式文件", data=None)

    zip_data = await file.read()
    result = import_articles_from_zip(db, zip_data)

    return ResponseBase(
        code=200,
        msg=f"导入完成：成功{result['imported']}篇，跳过{result['skipped']}篇",
        data=result,
    )


@router.get("/backup", summary="一键备份数据库+所有图片")
def backup_data(
    username: str = Depends(get_current_user),
):
    """
    一键备份数据库文件+所有上传图片为ZIP包
    """
    zip_data = backup_database_and_images()
    return StreamingResponse(
        io.BytesIO(zip_data),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=blog_backup.zip"},
    )
