"""
公开接口：文章相关（无需鉴权）
服务前台展示端
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import article_service
from app.schemas.schemas import (
    ArticleOut, ArticleListOut, PaginationOut, ResponseBase, CategoryOut, TagOut,
)

router = APIRouter(prefix="/public/articles", tags=["公开-文章"])


@router.get("", summary="获取已发布文章列表")
def list_published_articles(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页条数"),
    category_id: int | None = Query(None, description="按分类筛选"),
    tag_id: int | None = Query(None, description="按标签筛选"),
    keyword: str | None = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
):
    """获取已发布文章列表，支持分页、分类/标签筛选、关键词搜索"""
    articles, total = article_service.get_articles(
        db,
        page=page,
        page_size=page_size,
        is_published=True,
        category_id=category_id,
        tag_id=tag_id,
        keyword=keyword,
    )
    # 计算总页数
    total_pages = (total + page_size - 1) // page_size

    return ResponseBase(
        code=200,
        msg="success",
        data=PaginationOut(
            items=[ArticleListOut.model_validate(a) for a in articles],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ).model_dump(),
    )


@router.get("/{article_id_or_slug}", summary="获取文章详情")
def get_article_detail(
    article_id_or_slug: str,
    db: Session = Depends(get_db),
):
    """
    根据ID或slug获取文章详情
    访问时自动累加阅读量
    """
    # 优先尝试按ID查询，否则按slug查询
    article = None
    if article_id_or_slug.isdigit():
        article = article_service.get_article_by_id(db, int(article_id_or_slug))
    if article is None:
        article = article_service.get_article_by_slug(db, article_id_or_slug)

    if article is None or not article.is_published:
        return ResponseBase(code=404, msg="文章不存在", data=None)

    # 阅读量+1
    article_service.increment_read_count(db, article.id)
    # 重新获取以拿到更新后的阅读量
    article = article_service.get_article_by_id(db, article.id)

    return ResponseBase(
        code=200,
        msg="success",
        data=ArticleOut.model_validate(article).model_dump(),
    )
