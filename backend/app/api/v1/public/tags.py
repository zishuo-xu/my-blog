"""
公开接口：标签相关（无需鉴权）
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Tag, Article, article_tags
from app.schemas.schemas import ResponseBase, TagOut

router = APIRouter(prefix="/public/tags", tags=["公开-标签"])


@router.get("", summary="获取所有标签及文章数量")
def list_tags(db: Session = Depends(get_db)):
    """获取所有标签列表，每个标签包含已发布文章数量"""
    tags = db.query(Tag).all()
    result = []
    for tag in tags:
        # 通过关联表统计已发布文章数量
        article_count = db.query(Article).join(
            article_tags, Article.id == article_tags.c.article_id
        ).filter(
            article_tags.c.tag_id == tag.id,
            Article.is_published == True,
        ).count()
        result.append(TagOut(
            id=tag.id,
            name=tag.name,
            slug=tag.slug,
            article_count=article_count,
        ))

    return ResponseBase(code=200, msg="success", data=result)
