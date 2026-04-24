"""
Markdown解析服务
使用mistune 3.x将Markdown解析为HTML，支持表格、任务列表、脚注等
"""
import mistune


# 全局MD解析器实例（复用避免重复创建）
_md_parser = None


def get_md_parser() -> mistune.Markdown:
    """
    获取MD解析器实例（单例模式）
    mistune 3.x插件需要使用"模块.函数"的完整路径格式
    """
    global _md_parser
    if _md_parser is None:
        _md_parser = mistune.create_markdown(
            plugins=[
                "mistune.plugins.table.table",
                "mistune.plugins.task_lists.task_lists",
                "mistune.plugins.footnotes.footnotes",
            ]
        )
    return _md_parser


def md_to_html(content_md: str) -> str:
    """
    将Markdown文本转为HTML
    :param content_md: Markdown原文
    :return: 渲染后的HTML字符串
    """
    parser = get_md_parser()
    return parser(content_md)


def extract_toc(content_md: str) -> list[dict]:
    """
    从Markdown内容中提取目录结构
    :param content_md: Markdown原文
    :return: 目录列表，每项包含 level, text, id
    """
    import re
    toc = []
    # 匹配Markdown标题行：# 标题
    pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
    for match in pattern.finditer(content_md):
        level = len(match.group(1))
        text = match.group(2).strip()
        # 生成锚点ID：去除特殊字符，空格替换为-
        anchor_id = re.sub(r'[^\w一-鿿]+', '-', text).strip('-').lower()
        toc.append({
            "level": level,
            "text": text,
            "id": anchor_id,
        })
    return toc
