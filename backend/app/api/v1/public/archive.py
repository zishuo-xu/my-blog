"""
公开接口：归档相关（无需鉴权）
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.core.database import get_db
from app.models.models import Article
from app.schemas.schemas import ResponseBase, ArchiveItem, ArticleListOut

router = APIRouter(prefix="/public/archive", tags=["公开-归档"])


@router.get("", summary="获取按年/月聚合的归档数据")
def get_archive(db: Session = Depends(get_db)):
    """按年/月聚合展示所有已发布文章"""
    # 查询所有已发布文章，按发布时间倒序
    articles = db.query(Article).filter(
        Article.is_published == True
    ).order_by(Article.published_at.desc()).all()

    # 按年/月分组
    archive_dict = {}
    for article in articles:
        if article.published_at is None:
            continue
        year = article.published_at.year
        month = article.published_at.month
        key = (year, month)
        if key not in archive_dict:
            archive_dict[key] = []
        archive_dict[key].append(ArticleListOut.model_validate(article))

    # 转为列表格式
    result = []
    for (year, month), articles_list in sorted(archive_dict.items(), reverse=True):
        result.append(ArchiveItem(
            year=year,
            month=month,
            article_count=len(articles_list),
            articles=articles_list,
        ))

    return ResponseBase(code=200, msg="success", data=result)
