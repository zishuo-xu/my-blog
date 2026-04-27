"""
数据库模型定义
所有表结构集中定义，使用SQLAlchemy 2.0声明式映射
"""
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, Table, Index
)
from sqlalchemy.orm import relationship

from app.core.database import Base


# ===== 文章-标签多对多关联表 =====
article_tags = Table(
    "article_tags",
    Base.metadata,
    Column("article_id", Integer, ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    """管理员用户表（仅单账号使用）"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, comment="登录用户名")
    password_hash = Column(String(128), nullable=False, comment="bcrypt加密后的密码")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"


class Category(Base):
    """分类表"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, comment="分类名称")
    slug = Column(String(50), unique=True, nullable=False, comment="分类slug，用于URL")
    # 一对多：一个分类下有多篇文章
    articles = relationship("Article", back_populates="category", lazy="selectin", passive_deletes=True)

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"


class Tag(Base):
    """标签表"""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, comment="标签名称")
    slug = Column(String(50), unique=True, nullable=False, comment="标签slug，用于URL")
    # 多对多：通过article_tags关联表
    articles = relationship("Article", secondary=article_tags, back_populates="tags", lazy="selectin", passive_deletes=True)

    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}')>"


class Article(Base):
    """文章表"""
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, comment="文章标题")
    slug = Column(String(200), unique=True, nullable=True, comment="自定义permalink，用于SEO友好URL")
    summary = Column(String(500), nullable=True, comment="文章摘要，可自动生成也可手动填写")
    content_md = Column(Text, nullable=False, comment="Markdown原文")
    content_html = Column(Text, nullable=False, default="", comment="渲染后的HTML，存储避免每次重新渲染")
    is_published = Column(Boolean, default=False, comment="是否已发布，False为草稿")
    read_count = Column(Integer, default=0, comment="阅读量")
    read_time = Column(Integer, default=0, comment="预估阅读时长（分钟）")
    # 外键：分类（一篇文章属于一个分类）
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, comment="分类ID")
    category = relationship("Category", back_populates="articles")
    # 多对多：标签
    tags = relationship("Tag", secondary=article_tags, back_populates="articles", lazy="selectin")
    # 时间字段
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    published_at = Column(DateTime, nullable=True, comment="发布时间")

    # 索引：按发布时间查询、按分类筛选
    __table_args__ = (
        Index("ix_articles_published_at", "published_at"),
        Index("ix_articles_category_id", "category_id"),
        Index("ix_articles_is_published", "is_published"),
    )

    def __repr__(self):
        return f"<Article(id={self.id}, title='{self.title}')>"


class Image(Base):
    """图片记录表，用于追踪上传的图片资源"""
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(200), nullable=False, comment="存储文件名（含路径）")
    original_name = Column(String(200), nullable=False, comment="原始文件名")
    url = Column(String(500), nullable=False, comment="图片访问URL")
    file_size = Column(Integer, nullable=False, comment="文件大小（字节）")
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="SET NULL"), nullable=True, comment="关联文章ID")
    created_at = Column(DateTime, default=datetime.utcnow, comment="上传时间")

    def __repr__(self):
        return f"<Image(id={self.id}, filename='{self.filename}')>"
