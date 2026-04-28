"""
Markdown解析服务
使用mistune 3.x将Markdown解析为HTML，支持：
- 表格、任务列表、脚注
- Mermaid图表（代码块info为mermaid时输出<div class="mermaid">）
- Callout提示块（blockquote首行以[!INFO]等标记开头）
"""
import re
import mistune


class CustomRenderer(mistune.HTMLRenderer):
    """自定义HTML渲染器，支持Mermaid和Callout"""

    def block_code(self, code, info=None):
        """代码块渲染：mermaid语言特殊处理"""
        if info and info.strip().lower() == "mermaid":
            return f'<div class="mermaid">{mistune.escape(code)}</div>\n'
        return super().block_code(code, info)


def _postprocess_callouts(html: str) -> str:
    """
    后处理：将包含Callout标记的blockquote替换为提示块HTML
    匹配格式：
    > [!INFO] 标题
    > 内容
    """
    # 匹配blockquote中的第一个p标签，检查是否包含callout标记
    callout_pattern = re.compile(
        r'(<blockquote>)\s*'
        r'<p>\[!([A-Z]+)\]\s*(.*?)</p>',
        re.IGNORECASE | re.DOTALL,
    )

    def replace_callout(m):
        callout_type = m.group(2).lower()
        title = m.group(3).strip() or m.group(2).upper()
        return (
            f'<div class="callout callout-{callout_type}">'
            f'<div class="callout-title">{title}</div>'
        )

    html = callout_pattern.sub(replace_callout, html)

    # 将callout的结束标签从</blockquote>改为</div>
    # 策略：找到callout-div后最近的</blockquote>并替换
    # 由于正则的局限性，这里采用简单的计数方式
    parts = html.split('</blockquote>')
    result = []
    for part in parts:
        if 'class="callout' in part and not part.endswith('</div>'):
            result.append(part + '</div>')
        else:
            result.append(part + '</blockquote>')
    # 最后一个元素不需要追加 </blockquote>
    if result:
        result[-1] = result[-1][:-len('</blockquote>')]

    return ''.join(result)


# 全局MD解析器实例（复用避免重复创建）
_md_parser = None


def get_md_parser() -> mistune.Markdown:
    """
    获取MD解析器实例（单例模式）
    mistune 3.x插件需要使用"模块.函数"的完整路径格式
    """
    global _md_parser
    if _md_parser is None:
        renderer = CustomRenderer()
        _md_parser = mistune.create_markdown(
            renderer=renderer,
            plugins=[
                "mistune.plugins.table.table",
                "mistune.plugins.task_lists.task_lists",
                "mistune.plugins.footnotes.footnotes",
            ],
        )
    return _md_parser


def md_to_html(content_md: str) -> str:
    """
    将Markdown文本转为HTML
    :param content_md: Markdown原文
    :return: 渲染后的HTML字符串
    """
    parser = get_md_parser()
    html = parser(content_md)
    html = _postprocess_callouts(html)
    return html


def extract_toc(content_md: str) -> list[dict]:
    """
    从Markdown内容中提取目录结构
    :param content_md: Markdown原文
    :return: 目录列表，每项包含 level, text, id
    """
    toc = []
    pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
    for match in pattern.finditer(content_md):
        level = len(match.group(1))
        text = match.group(2).strip()
        anchor_id = re.sub(r'[^\w一-鿿]+', '-', text).strip('-').lower()
        toc.append({
            "level": level,
            "text": text,
            "id": anchor_id,
        })
    return toc
