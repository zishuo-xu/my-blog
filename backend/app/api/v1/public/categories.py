"""
公开接口：分类相关（无需鉴权）
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import Category, Article
from app.schemas.schemas import ResponseBase, CategoryOut

router = APIRouter(prefix="/public/categories", tags=["公开-分类"])


@router.get("", summary="获取所有分类及文章数量")
def list_categories(db: Session = Depends(get_db)):
    """获取所有分类列表，每个分类包含已发布文章数量"""
    # 查询分类及其已发布文章数量
    categories = db.query(Category).all()
    result = []
    for cat in categories:
        article_count = db.query(Article).filter(
            Article.category_id == cat.id,
            Article.is_published == True,
        ).count()
        result.append(CategoryOut(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            article_count=article_count,
        ))

    return ResponseBase(code=200, msg="success", data=result)
