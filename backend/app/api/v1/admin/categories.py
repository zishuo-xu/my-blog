"""
管理接口：分类增删改（需JWT鉴权）
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import Category
from app.schemas.schemas import CategoryCreate, CategoryUpdate, CategoryOut, ResponseBase

router = APIRouter(prefix="/admin/categories", tags=["管理-分类"])


@router.post("", summary="创建分类")
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """创建分类"""
    # 检查同名分类是否已存在
    existing = db.query(Category).filter(
        (Category.name == data.name) | (Category.slug == data.slug)
    ).first()
    if existing:
        return ResponseBase(code=400, msg="分类名称或slug已存在", data=None)

    category = Category(name=data.name, slug=data.slug)
    db.add(category)
    db.commit()
    db.refresh(category)

    return ResponseBase(
        code=200,
        msg="创建成功",
        data=CategoryOut(id=category.id, name=category.name, slug=category.slug, article_count=0).model_dump(),
    )


@router.put("/{category_id}", summary="更新分类")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """更新分类"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        return ResponseBase(code=404, msg="分类不存在", data=None)

    # 检查slug是否冲突
    if data.slug and data.slug != category.slug:
        existing = db.query(Category).filter(Category.slug == data.slug).first()
        if existing:
            return ResponseBase(code=400, msg="slug已存在", data=None)

    if data.name is not None:
        category.name = data.name
    if data.slug is not None:
        category.slug = data.slug

    db.commit()
    db.refresh(category)

    return ResponseBase(
        code=200,
        msg="更新成功",
        data=CategoryOut(id=category.id, name=category.name, slug=category.slug, article_count=0).model_dump(),
    )


@router.delete("/{category_id}", summary="删除分类")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """删除分类"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        return ResponseBase(code=404, msg="分类不存在", data=None)

    db.delete(category)
    db.commit()
    return ResponseBase(code=200, msg="删除成功", data=None)
