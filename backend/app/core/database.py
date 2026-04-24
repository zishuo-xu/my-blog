"""
数据库连接与会话管理
使用SQLAlchemy 2.0异步风格（SQLite暂时用同步，预留异步切换能力）
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# 创建数据库引擎
# SQLite需要check_same_thread=False以支持多线程访问
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,  # DEBUG模式下打印SQL语句
)

# 会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """ORM模型基类，所有模型继承此类"""
    pass


def get_db():
    """依赖注入：获取数据库会话，请求结束后自动关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
