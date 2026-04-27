"""
依赖注入：JWT鉴权中间件
管理接口需要在请求头中携带有效Token
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_access_token
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import User

# Bearer Token提取器
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    从请求头中提取并验证JWT Token，同时确认用户仍存在
    返回用户名，验证失败抛出401异常
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token无效或已过期，请重新登录",
        )
    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token无效",
        )
    # 验证用户是否仍存在
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在",
            )
    finally:
        db.close()
    return username
