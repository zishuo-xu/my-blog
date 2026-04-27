"""
图片存储服务
支持本地存储，预留云存储扩展接口（阿里云OSS/Cloudflare R2/七牛云）
所有图片操作通过此模块统一处理，切换存储仅需改配置
"""
import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile
from PIL import Image as PILImage
from io import BytesIO

from app.core.config import settings


class StorageBackend:
    """存储后端基类，定义统一接口"""

    def save(self, file_data: bytes, filepath: str) -> str:
        """保存文件，返回访问URL"""
        raise NotImplementedError

    def delete(self, filepath: str) -> bool:
        """删除文件"""
        raise NotImplementedError


class LocalStorage(StorageBackend):
    """本地文件存储"""

    def __init__(self):
        # 确保上传目录存在
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        # 静态文件的基础URL路径
        self.base_url = f"{settings.SITE_URL}/static/upload"

    def save(self, file_data: bytes, filepath: str) -> str:
        """保存文件到本地，返回访问URL"""
        full_path = self.upload_dir / filepath
        # 确保目录存在
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(file_data)
        # 返回URL
        return f"{self.base_url}/{filepath}"

    def delete(self, filepath: str) -> bool:
        """删除本地文件"""
        full_path = self.upload_dir / filepath
        if full_path.exists():
            full_path.unlink()
            return True
        return False


def get_storage_backend() -> StorageBackend:
    """根据配置获取存储后端实例"""
    storage_type = settings.STORAGE_TYPE
    if storage_type == "local":
        return LocalStorage()
    # TODO: 后续实现云存储后端
    # elif storage_type == "aliyun_oss":
    #     return AliyunOSSStorage()
    # elif storage_type == "cloudflare_r2":
    #     return CloudflareR2Storage()
    # elif storage_type == "qiniu":
    #     return QiniuStorage()
    else:
        raise ValueError(f"不支持的存储类型: {storage_type}")


def compress_image(file_data: bytes, filename: str, detected_fmt: str | None = None) -> bytes:
    """
    压缩图片
    如果图片大小超过压缩阈值，自动压缩到阈值以内
    :param file_data: 原始图片字节数据
    :param filename: 原始文件名（用于判断格式）
    :param detected_fmt: PIL 检测到的真实格式（优先使用）
    :return: 压缩后的图片字节数据
    """
    file_size = len(file_data)

    # 未超过阈值，不需要压缩
    if file_size <= settings.compress_threshold_bytes:
        return file_data

    # 解析格式
    ext = detected_fmt or Path(filename).suffix.lower().lstrip(".")
    # PIL的格式名映射
    format_map = {"jpg": "JPEG", "jpeg": "JPEG", "png": "PNG", "webp": "WEBP"}
    pil_format = format_map.get(ext, "JPEG")

    # GIF不压缩（会破坏动图）
    if ext == "gif":
        return file_data

    # 打开图片并压缩
    img = PILImage.open(BytesIO(file_data))

    output = BytesIO()
    # 根据格式选择压缩参数
    if pil_format == "PNG":
        # PNG 保持原格式，保留透明度
        img.save(output, format="PNG", optimize=True)
    elif pil_format == "WEBP":
        img.save(output, format="WEBP", quality=settings.COMPRESS_QUALITY)
    else:
        # JPEG 需要 RGB 模式
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(output, format="JPEG", quality=settings.COMPRESS_QUALITY, optimize=True)

    compressed = output.getvalue()

    # 如果压缩后反而更大，返回原始数据
    if len(compressed) >= file_size:
        return file_data

    return compressed


def generate_filepath(filename: str) -> str:
    """
    按规则生成存储路径：upload/年/月/随机8位字符串.后缀
    :param filename: 原始文件名
    :return: 相对存储路径
    """
    ext = Path(filename).suffix.lower()
    now = datetime.utcnow()
    random_name = uuid.uuid4().hex[:8]
    return f"{now.year}/{now.month:02d}/{random_name}{ext}"


def _validate_image_bytes(file_data: bytes) -> str:
    """
    验证文件内容是否为真实图片，返回检测到的格式
    :raises ValueError: 不是有效图片或格式不支持
    """
    try:
        img = PILImage.open(BytesIO(file_data))
        fmt = img.format.lower() if img.format else ""
        if fmt not in ("jpeg", "png", "gif", "webp"):
            raise ValueError(f"不支持的图片格式: {fmt}，仅支持: jpg, png, gif, webp")
        return fmt
    except Exception:
        raise ValueError("上传的文件不是有效的图片")


async def save_upload_image(file: UploadFile) -> dict:
    """
    处理图片上传的完整流程：校验→压缩→存储→返回信息
    :param file: 上传的文件对象
    :return: {"filename": 存储文件名, "original_name": 原始文件名, "url": 访问URL, "file_size": 文件大小}
    :raises ValueError: 文件格式不支持或超过大小限制
    """
    # 校验文件扩展名
    ext = Path(file.filename).suffix.lower().lstrip(".")
    if ext not in settings.ALLOWED_IMAGE_TYPES:
        raise ValueError(f"不支持的图片格式: {ext}，仅支持: {', '.join(settings.ALLOWED_IMAGE_TYPES)}")

    # 读取文件数据
    file_data = await file.read()

    # 校验文件大小
    if len(file_data) > settings.max_image_size_bytes:
        raise ValueError(f"文件大小超过限制: 最大{settings.MAX_IMAGE_SIZE_MB}MB")

    # 验证文件内容是否为真实图片
    detected_fmt = _validate_image_bytes(file_data)

    # 压缩图片
    compressed_data = compress_image(file_data, file.filename, detected_fmt)

    # 生成存储路径
    filepath = generate_filepath(file.filename)

    # 存储文件
    storage = get_storage_backend()
    url = storage.save(compressed_data, filepath)

    return {
        "filename": filepath,
        "original_name": file.filename,
        "url": url,
        "file_size": len(compressed_data),
    }
