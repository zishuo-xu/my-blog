"""
管理接口：图片上传（需JWT鉴权）
支持多图上传
"""
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import Image
from app.services.storage_service import save_upload_image
from app.schemas.schemas import ImageOut, ResponseBase

router = APIRouter(prefix="/admin/upload", tags=["管理-图片上传"])


@router.post("/image", summary="图片上传（支持多图）")
async def upload_images(
    files: list[UploadFile] = File(..., description="图片文件列表"),
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    图片上传接口，支持多图同时上传
    上传流程：校验格式/大小 → 自动压缩 → 存储 → 返回URL
    """
    results = []
    errors = []

    for file in files:
        try:
            # 处理上传（校验+压缩+存储）
            info = await save_upload_image(file)
            # 记录到数据库
            image_record = Image(
                filename=info["filename"],
                original_name=info["original_name"],
                url=info["url"],
                file_size=info["file_size"],
            )
            db.add(image_record)
            db.commit()
            db.refresh(image_record)
            results.append(ImageOut.model_validate(image_record).model_dump())
        except ValueError as e:
            # 校验失败的文件记录错误信息
            errors.append({"filename": file.filename, "error": str(e)})
        except Exception as e:
            errors.append({"filename": file.filename, "error": f"上传失败: {str(e)}"})

    return ResponseBase(
        code=200,
        msg=f"上传完成：成功{len(results)}个，失败{len(errors)}个",
        data={"images": results, "errors": errors},
    )
