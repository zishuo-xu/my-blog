"""
管理接口：站点配置（需JWT鉴权）
支持批量更新配置项
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import SiteConfig
from app.schemas.schemas import SiteConfigUpdate, ResponseBase

router = APIRouter(prefix="/admin/site-config", tags=["管理-站点配置"])


@router.get("", summary="获取站点配置")
def get_site_config(
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    获取所有站点配置项（管理端）
    """
    configs = db.query(SiteConfig).all()
    return ResponseBase(
        code=200,
        msg="success",
        data={c.key: {"value": c.value, "description": c.description} for c in configs},
    )


@router.put("", summary="批量更新站点配置")
def update_site_config(
    payload: SiteConfigUpdate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user),
):
    """
    批量更新站点配置项
    仅更新传入的键，未传入的键保持不变
    """
    for key, value in payload.configs.items():
        config = db.query(SiteConfig).filter(SiteConfig.key == key).first()
        if config:
            config.value = value
        else:
            db.add(SiteConfig(key=key, value=value))
    db.commit()
    return ResponseBase(code=200, msg="配置已更新")
