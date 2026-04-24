"""
管理接口：文章增删改查（需JWT鉴权）
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.services import article_service
from app.schemas.schemas import (
    ArticleCreate, ArticleUpdate, ArticleOut, ArticleListOut,
    PaginationOut, ResponseBase,
)

router = APIRouter(prefix="/admin/articles", tags=["管理-文章"])


@router.get("", summary="获取所有文章（含草稿）")
def list_all_articles(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页条数"),
    is_published: bool | None = Query(None, description="筛选发布状态"),
    category_id: int | None = Query(None, description="按分类筛选"),
    tag_id: int | None = Query(None, description="按标签筛选"),
    keyword: str | None = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """管理员获取所有文章（含草稿），支持筛选和搜索"""
    articles, total = article_service.get_articles(
        db,
        page=page,
        page_size=page_size,
        is_published=is_published,
        category_id=category_id,
        tag_id=tag_id,
        keyword=keyword,
    )
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


@router.post("", summary="创建文章")
def create_article(
    article_data: ArticleCreate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """创建文章（草稿或已发布），自动解析MD生成HTML、计算阅读时长"""
    article = article_service.create_article(db, article_data)
    return ResponseBase(
        code=200,
        msg="创建成功",
        data=ArticleOut.model_validate(article).model_dump(),
    )


@router.get("/{article_id}", summary="获取文章详情（管理端）")
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """管理员获取文章详情（含草稿）"""
    article = article_service.get_article_by_id(db, article_id)
    if article is None:
        return ResponseBase(code=404, msg="文章不存在", data=None)
    return ResponseBase(
        code=200,
        msg="success",
        data=ArticleOut.model_validate(article).model_dump(),
    )


@router.put("/{article_id}", summary="更新文章")
def update_article(
    article_id: int,
    article_data: ArticleUpdate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """更新文章内容、发布状态等"""
    article = article_service.update_article(db, article_id, article_data)
    if article is None:
        return ResponseBase(code=404, msg="文章不存在", data=None)
    return ResponseBase(
        code=200,
        msg="更新成功",
        data=ArticleOut.model_validate(article).model_dump(),
    )


@router.delete("/{article_id}", summary="删除文章")
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """删除文章"""
    success = article_service.delete_article(db, article_id)
    if not success:
        return ResponseBase(code=404, msg="文章不存在", data=None)
    return ResponseBase(code=200, msg="删除成功", data=None)
