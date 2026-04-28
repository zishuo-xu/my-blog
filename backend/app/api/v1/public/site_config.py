"""
公开接口：站点配置
无需鉴权，供前台获取站点基本信息
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import SiteConfig
from app.schemas.schemas import ResponseBase

router = APIRouter(prefix="/site-config", tags=["公开-站点配置"])


@router.get("", summary="获取站点配置")
def get_site_config(db: Session = Depends(get_db)):
    """
    获取所有站点配置项
    返回键值对字典，供前台渲染使用
    """
    configs = db.query(SiteConfig).all()
    data = {c.key: c.value for c in configs}
    return ResponseBase(code=200, msg="success", data=data)
