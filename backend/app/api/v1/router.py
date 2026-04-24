"""
API路由汇总
将所有公开和管理接口统一注册
"""
from fastapi import APIRouter

from app.api.v1.public import articles as pub_articles
from app.api.v1.public import categories as pub_categories
from app.api.v1.public import tags as pub_tags
from app.api.v1.public import archive as pub_archive
from app.api.v1.public import search as pub_search
from app.api.v1.public import sitemap as pub_sitemap

from app.api.v1.admin import auth as admin_auth
from app.api.v1.admin import articles as admin_articles
from app.api.v1.admin import categories as admin_categories
from app.api.v1.admin import tags as admin_tags
from app.api.v1.admin import upload as admin_upload
from app.api.v1.admin import data as admin_data

# 版本1的API路由前缀
api_router = APIRouter(prefix="/api/v1")

# ===== 注册公开接口 =====
api_router.include_router(pub_articles.router)
api_router.include_router(pub_categories.router)
api_router.include_router(pub_tags.router)
api_router.include_router(pub_archive.router)
api_router.include_router(pub_search.router)
api_router.include_router(pub_sitemap.router)

# ===== 注册管理接口 =====
api_router.include_router(admin_auth.router)
api_router.include_router(admin_articles.router)
api_router.include_router(admin_categories.router)
api_router.include_router(admin_tags.router)
api_router.include_router(admin_upload.router)
api_router.include_router(admin_data.router)
