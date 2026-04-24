"""
公开接口：搜索相关（无需鉴权）
使用SQLite FTS5实现全文搜索
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Article
from app.schemas.schemas import ResponseBase, ArticleListOut

router = APIRouter(prefix="/public/search", tags=["公开-搜索"])


@router.get("", summary="全文搜索文章")
def search_articles(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页条数"),
    db: Session = Depends(get_db),
):
    """
    全文搜索已发布文章（标题/内容/标签）
    当前使用SQLAlchemy LIKE实现，后续可切换FTS5
    """
    # 使用LIKE进行简单全文搜索
    query = db.query(Article).filter(
        Article.is_published == True,
        (Article.title.contains(q)) | (Article.content_md.contains(q)),
    ).order_by(Article.published_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    articles = query.offset(offset).limit(page_size).all()

    total_pages = (total + page_size - 1) // page_size

    return ResponseBase(
        code=200,
        msg="success",
        data={
            "items": [ArticleListOut.model_validate(a) for a in articles],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "keyword": q,
        },
    )
