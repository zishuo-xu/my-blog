"""
管理接口：标签增删改（需JWT鉴权）
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import Tag
from app.schemas.schemas import TagCreate, TagUpdate, TagOut, ResponseBase

router = APIRouter(prefix="/admin/tags", tags=["管理-标签"])


@router.post("", summary="创建标签")
def create_tag(
    data: TagCreate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """创建标签"""
    # 检查同名标签是否已存在
    existing = db.query(Tag).filter(
        (Tag.name == data.name) | (Tag.slug == data.slug)
    ).first()
    if existing:
        return ResponseBase(code=400, msg="标签名称或slug已存在", data=None)

    tag = Tag(name=data.name, slug=data.slug)
    db.add(tag)
    db.commit()
    db.refresh(tag)

    return ResponseBase(
        code=200,
        msg="创建成功",
        data=TagOut(id=tag.id, name=tag.name, slug=tag.slug, article_count=0).model_dump(),
    )


@router.put("/{tag_id}", summary="更新标签")
def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """更新标签"""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None:
        return ResponseBase(code=404, msg="标签不存在", data=None)

    # 检查slug是否冲突
    if data.slug and data.slug != tag.slug:
        existing = db.query(Tag).filter(Tag.slug == data.slug).first()
        if existing:
            return ResponseBase(code=400, msg="slug已存在", data=None)

    if data.name is not None:
        tag.name = data.name
    if data.slug is not None:
        tag.slug = data.slug

    db.commit()
    db.refresh(tag)

    return ResponseBase(
        code=200,
        msg="更新成功",
        data=TagOut(id=tag.id, name=tag.name, slug=tag.slug, article_count=0).model_dump(),
    )


@router.delete("/{tag_id}", summary="删除标签")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """删除标签"""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None:
        return ResponseBase(code=404, msg="标签不存在", data=None)

    db.delete(tag)
    db.commit()
    return ResponseBase(code=200, msg="删除成功", data=None)
