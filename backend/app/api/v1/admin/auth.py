"""
管理接口：认证相关（登录）
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import LoginRequest, LoginResponse, ResponseBase

router = APIRouter(prefix="/admin", tags=["管理-认证"])


@router.post("/login", summary="管理员登录")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    账号密码登录，返回JWT Token
    仅允许配置的管理员账号登录
    """
    # 查找用户
    user = db.query(User).filter(User.username == request.username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 校验密码
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 生成Token
    token = create_access_token(data={"sub": user.username})

    return ResponseBase(
        code=200,
        msg="登录成功",
        data=LoginResponse(token=token, username=user.username).model_dump(),
    )
