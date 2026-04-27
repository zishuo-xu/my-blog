"""
FastAPI应用入口
初始化应用、注册路由、配置CORS、启动事件
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import hash_password
from app.models.models import User
from app.api.v1.router import api_router


# ===== 应用生命周期管理 =====

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭时的生命周期管理"""
    # 启动时：创建数据库表、初始化管理员账号
    Base.metadata.create_all(bind=engine)
    _init_admin_user()
    # 确保上传目录存在
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield
    # 关闭时的清理逻辑（如有需要）


def _init_admin_user():
    """首次启动时自动创建管理员账号"""
    db = SessionLocal()
    try:
        # 检查是否已存在管理员
        admin = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if admin is None:
            # 创建默认管理员
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
            )
            db.add(admin)
            db.commit()
            print(f"[初始化] 管理员账号已创建: {settings.ADMIN_USERNAME}")
        else:
            print(f"[初始化] 管理员账号已存在: {settings.ADMIN_USERNAME}")
    finally:
        db.close()


# ===== 创建FastAPI应用 =====

app = FastAPI(
    title=settings.APP_NAME,
    description="极简个人博客API",
    version="1.0.0",
    lifespan=lifespan,
    # 生产环境关闭docs
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)


# ===== CORS配置 =====

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== 静态文件服务（图片访问） =====

app.mount("/static/upload", StaticFiles(directory=settings.UPLOAD_DIR), name="upload")


# ===== 注册API路由 =====

app.include_router(api_router)


# ===== 健康检查 =====

@app.get("/health", tags=["健康检查"])
def health_check():
    """服务健康检查接口"""
    return {"status": "ok"}
