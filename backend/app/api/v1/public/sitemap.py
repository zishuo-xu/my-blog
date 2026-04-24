"""
公开接口：sitemap和robots.txt
"""
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Article

router = APIRouter(tags=["公开-SEO"])


@router.get("/public/sitemap.xml", summary="生成sitemap.xml", response_class=Response)
def get_sitemap(db: Session = Depends(get_db)):
    """生成sitemap.xml，包含所有已发布文章"""
    articles = db.query(Article).filter(
        Article.is_published == True
    ).order_by(Article.published_at.desc()).all()

    # 拼接sitemap XML
    urls = []
    # 首页
    urls.append(f"""
  <url>
    <loc>{settings.SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>""")

    # 文章页
    for article in articles:
        slug = article.slug or article.id
        lastmod = article.published_at.strftime("%Y-%m-%d") if article.published_at else ""
        urls.append(f"""
  <url>
    <loc>{settings.SITE_URL}/article/{slug}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{''.join(urls)}
</urlset>"""

    return Response(content=xml_content, media_type="application/xml")


@router.get("/public/robots.txt", summary="返回robots.txt", response_class=PlainTextResponse)
def get_robots():
    """返回robots.txt"""
    content = f"""User-agent: *
Allow: /
Disallow: /api/v1/admin/

Sitemap: {settings.SITE_URL}/public/sitemap.xml
"""
    return PlainTextResponse(content=content)
