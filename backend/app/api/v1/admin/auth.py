"""
管理接口：认证相关（登录）
"""
import time
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import LoginRequest, LoginResponse, ResponseBase

router = APIRouter(prefix="/admin", tags=["管理-认证"])

# 简单的内存速率限制：{ip: (失败次数, 首次失败时间)}
_login_attempts: dict[str, tuple[int, float]] = {}
_MAX_ATTEMPTS = 5
_LOCKOUT_SECONDS = 300


def _check_rate_limit(client_ip: str) -> None:
    """检查登录速率限制，超限抛出 429"""
    now = time.time()
    if client_ip in _login_attempts:
        count, first_time = _login_attempts[client_ip]
        if count >= _MAX_ATTEMPTS:
            if now - first_time < _LOCKOUT_SECONDS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"登录尝试过多，请 {_LOCKOUT_SECONDS // 60} 分钟后再试",
                )
            else:
                # 锁定时间已过，重置计数
                del _login_attempts[client_ip]


def _record_failure(client_ip: str) -> None:
    """记录一次登录失败"""
    now = time.time()
    if client_ip in _login_attempts:
        count, first_time = _login_attempts[client_ip]
        _login_attempts[client_ip] = (count + 1, first_time)
    else:
        _login_attempts[client_ip] = (1, now)


def _record_success(client_ip: str) -> None:
    """登录成功后清除失败记录"""
    _login_attempts.pop(client_ip, None)


@router.post("/login", summary="管理员登录")
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """
    账号密码登录，返回JWT Token
    仅允许配置的管理员账号登录
    """
    client_ip = req.client.host if req.client else "unknown"
    _check_rate_limit(client_ip)

    # 查找用户
    user = db.query(User).filter(User.username == request.username).first()
    if user is None:
        _record_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 校验密码
    if not verify_password(request.password, user.password_hash):
        _record_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 登录成功，清除失败记录
    _record_success(client_ip)

    # 生成Token
    token = create_access_token(data={"sub": user.username})

    return ResponseBase(
        code=200,
        msg="登录成功",
        data=LoginResponse(token=token, username=user.username).model_dump(),
    )
