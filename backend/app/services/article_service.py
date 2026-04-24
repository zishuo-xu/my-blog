"""
文章业务逻辑层
封装文章的CRUD、MD解析为HTML、阅读时长计算等核心逻辑
"""
import re
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import Article, Category, Tag, article_tags
from app.schemas.schemas import ArticleCreate, ArticleUpdate


def calculate_read_time(content_md: str) -> int:
    """
    计算预估阅读时长（分钟）
    中文按400字/分钟，英文按200词/分钟，取较大值
    """
    # 统计中文字符数
    chinese_chars = len(re.findall(r'[一-鿿]', content_md))
    # 统计英文单词数
    english_words = len(re.findall(r'[a-zA-Z]+', content_md))
    # 分别计算阅读时间，取较大值
    chinese_time = chinese_chars / 400
    english_time = english_words / 200
    # 最少1分钟
    minutes = max(int(chinese_time + english_time) or 1, 1)
    return minutes


def generate_summary(content_md: str, max_length: int = 200) -> str:
    """
    从Markdown内容自动生成摘要
    去除MD语法标记，截取前max_length个字符
    """
    # 去除图片语法
    text = re.sub(r'!\[.*?\]\(.*?\)', '', content_md)
    # 去除链接语法，保留文字
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    # 去除标题标记
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    # 去除粗体/斜体标记
    text = re.sub(r'(\*{1,3}|_{1,3})(.*?)\1', r'\2', text)
    # 去除代码块
    text = re.sub(r'```[\s\S]*?```', '', text)
    # 去除行内代码
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # 去除多余空白
    text = re.sub(r'\n+', ' ', text).strip()
    # 截取
    if len(text) > max_length:
        text = text[:max_length] + "..."
    return text


def create_article(db: Session, article_data: ArticleCreate) -> Article:
    """创建文章，自动解析MD生成HTML、计算阅读时长"""
    # 延迟导入避免循环依赖
    from app.services.md_service import md_to_html

    content_html = md_to_html(article_data.content_md)
    read_time = calculate_read_time(article_data.content_md)
    summary = article_data.summary or generate_summary(article_data.content_md)

    # 创建文章对象
    article = Article(
        title=article_data.title,
        slug=article_data.slug,
        summary=summary,
        content_md=article_data.content_md,
        content_html=content_html,
        is_published=article_data.is_published,
        read_time=read_time,
        category_id=article_data.category_id,
        published_at=datetime.utcnow() if article_data.is_published else None,
    )

    # 设置标签关联
    if article_data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(article_data.tag_ids)).all()
        article.tags = tags

    db.add(article)
    db.commit()
    db.refresh(article)
    return article


def update_article(db: Session, article_id: int, article_data: ArticleUpdate) -> Article | None:
    """更新文章，仅更新传入的非None字段"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        return None

    # 如果内容变更，重新解析HTML和计算阅读时长
    if article_data.content_md is not None:
        from app.services.md_service import md_to_html
        article.content_md = article_data.content_md
        article.content_html = md_to_html(article_data.content_md)
        article.read_time = calculate_read_time(article_data.content_md)
        # 内容变更时始终重新生成摘要，除非手动传了非空的新摘要
        if not article_data.summary:
            article.summary = generate_summary(article_data.content_md)

    # 更新其他字段（仅更新非None的字段）
    update_fields = {
        "title": article_data.title,
        "slug": article_data.slug,
        "summary": article_data.summary,
        "is_published": article_data.is_published,
        "category_id": article_data.category_id,
    }
    for field, value in update_fields.items():
        if value is not None:
            setattr(article, field, value)

    # 发布状态变更处理
    if article_data.is_published is True and article.published_at is None:
        article.published_at = datetime.utcnow()
    elif article_data.is_published is False:
        article.published_at = None

    # 更新标签关联
    if article_data.tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(article_data.tag_ids)).all()
        article.tags = tags

    article.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(article)
    return article


def delete_article(db: Session, article_id: int) -> bool:
    """删除文章，返回是否删除成功"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        return False
    db.delete(article)
    db.commit()
    return True


def get_article_by_id(db: Session, article_id: int) -> Article | None:
    """根据ID获取文章"""
    return db.query(Article).filter(Article.id == article_id).first()


def get_article_by_slug(db: Session, slug: str) -> Article | None:
    """根据slug获取文章"""
    return db.query(Article).filter(Article.slug == slug).first()


def get_articles(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    is_published: bool | None = None,
    category_id: int | None = None,
    tag_id: int | None = None,
    keyword: str | None = None,
) -> tuple[list[Article], int]:
    """
    获取文章列表（分页）
    返回(文章列表, 总条数)
    """
    query = db.query(Article)

    # 筛选条件
    if is_published is not None:
        query = query.filter(Article.is_published == is_published)
    if category_id is not None:
        query = query.filter(Article.category_id == category_id)
    if tag_id is not None:
        query = query.filter(Article.tags.any(Tag.id == tag_id))
    if keyword:
        # 按标题或内容搜索
        query = query.filter(
            (Article.title.contains(keyword)) | (Article.content_md.contains(keyword))
        )

    # 按发布时间倒序
    query = query.order_by(desc(Article.published_at))

    # 计算总数
    total = query.count()

    # 分页
    offset = (page - 1) * page_size
    articles = query.offset(offset).limit(page_size).all()

    return articles, total


def increment_read_count(db: Session, article_id: int) -> None:
    """文章阅读量+1"""
    db.query(Article).filter(Article.id == article_id).update(
        {"read_count": Article.read_count + 1}
    )
    db.commit()
