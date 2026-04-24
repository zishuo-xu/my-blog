"""
安全模块：JWT生成/验证 + 密码加密/校验
"""
from datetime import datetime, timedelta

from jose import jwt, JWTError
from bcrypt import hashpw, gensalt, checkpw

from app.core.config import settings


# ===== 密码相关 =====

def hash_password(plain_password: str) -> str:
    """使用bcrypt加密密码，返回加密后的字符串"""
    # bcrypt需要bytes输入，加密后转回str存储
    salt = gensalt()
    hashed = hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """校验明文密码与加密密码是否匹配"""
    return checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ===== JWT相关 =====

def create_access_token(data: dict) -> str:
    """
    生成JWT Token
    :param data: 要编码的数据，通常包含 {"sub": "username"}
    :return: JWT Token字符串
    """
    to_encode = data.copy()
    # 设置过期时间
    expire = datetime.utcnow() + timedelta(days=settings.JWT_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    """
    解码JWT Token
    :param token: JWT Token字符串
    :return: 解码后的payload字典，失败返回None
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None
