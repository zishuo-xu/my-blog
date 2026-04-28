"""
Pydantic数据校验模型（Schemas）
所有接口的请求/响应数据结构集中定义，用于参数校验和序列化
"""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


# ===== 通用响应格式 =====

class ResponseBase(BaseModel):
    """统一响应格式"""
    code: int = 200
    msg: str = "success"
    data: dict | list | None = None


# ===== 用户/认证相关 =====

class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., min_length=1, max_length=50, description="用户名")
    password: str = Field(..., min_length=1, max_length=100, description="密码")


class LoginResponse(BaseModel):
    """登录响应"""
    token: str = Field(..., description="JWT Token")
    username: str = Field(..., description="用户名")


# ===== 分类相关 =====

class CategoryCreate(BaseModel):
    """创建分类"""
    name: str = Field(..., min_length=1, max_length=50, description="分类名称")
    slug: str = Field(..., min_length=1, max_length=50, description="分类slug")


class CategoryUpdate(BaseModel):
    """更新分类"""
    name: str | None = Field(None, min_length=1, max_length=50, description="分类名称")
    slug: str | None = Field(None, min_length=1, max_length=50, description="分类slug")


class CategoryOut(BaseModel):
    """分类输出"""
    id: int
    name: str
    slug: str
    article_count: int = 0

    model_config = {"from_attributes": True}


# ===== 标签相关 =====

class TagCreate(BaseModel):
    """创建标签"""
    name: str = Field(..., min_length=1, max_length=50, description="标签名称")
    slug: str = Field(..., min_length=1, max_length=50, description="标签slug")


class TagUpdate(BaseModel):
    """更新标签"""
    name: str | None = Field(None, min_length=1, max_length=50, description="标签名称")
    slug: str | None = Field(None, min_length=1, max_length=50, description="标签slug")


class TagOut(BaseModel):
    """标签输出"""
    id: int
    name: str
    slug: str
    article_count: int = 0

    model_config = {"from_attributes": True}


# ===== 文章相关 =====

class ArticleCreate(BaseModel):
    """创建文章"""
    title: str = Field(..., min_length=1, max_length=200, description="文章标题")
    slug: str | None = Field(None, max_length=200, description="自定义permalink")
    summary: str | None = Field(None, max_length=500, description="文章摘要")
    content_md: str = Field(..., min_length=1, description="Markdown内容")
    is_published: bool = Field(False, description="是否发布")
    category_id: int | None = Field(None, description="分类ID")
    tag_ids: list[int] = Field(default_factory=list, description="标签ID列表")


class ArticleUpdate(BaseModel):
    """更新文章"""
    title: str | None = Field(None, min_length=1, max_length=200, description="文章标题")
    slug: str | None = Field(None, max_length=200, description="自定义permalink")
    summary: str | None = Field(None, max_length=500, description="文章摘要")
    content_md: str | None = Field(None, min_length=1, description="Markdown内容")
    is_published: bool | None = Field(None, description="是否发布")
    category_id: int | None = Field(None, description="分类ID")
    tag_ids: list[int] | None = Field(None, description="标签ID列表，为null时不修改")


class ArticleOut(BaseModel):
    """文章输出（列表和详情共用，详情时content_html不为空）"""
    id: int
    title: str
    slug: str | None
    summary: str | None
    content_md: str | None = None
    content_html: str | None = None
    is_published: bool
    read_count: int
    read_time: int
    category: CategoryOut | None = None
    tags: list[TagOut] = []
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None

    model_config = {"from_attributes": True}


class ArticleListOut(BaseModel):
    """文章列表项输出（精简，不含正文）"""
    id: int
    title: str
    slug: str | None
    summary: str | None
    is_published: bool
    read_count: int
    read_time: int
    category: CategoryOut | None = None
    tags: list[TagOut] = []
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaginationOut(BaseModel):
    """分页输出"""
    items: list = Field(default_factory=list, description="数据列表")
    total: int = Field(0, description="总条数")
    page: int = Field(1, description="当前页码")
    page_size: int = Field(10, description="每页条数")
    total_pages: int = Field(0, description="总页数")


# ===== 归档相关 =====

class ArchiveItem(BaseModel):
    """归档条目"""
    year: int
    month: int
    article_count: int
    articles: list[ArticleListOut]


# ===== 图片上传相关 =====

class ImageOut(BaseModel):
    """图片输出"""
    id: int
    filename: str
    original_name: str
    url: str
    file_size: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ===== 站点配置相关 =====

class SiteConfigItem(BaseModel):
    """站点配置项"""
    key: str
    value: str | None
    description: str | None

    model_config = {"from_attributes": True}


class SiteConfigUpdate(BaseModel):
    """批量更新站点配置"""
    configs: dict[str, str | None]
