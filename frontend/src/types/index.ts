/**
 * 全局类型定义
 * 和后端响应格式对齐
 */

/* 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

/* 分页数据格式 */
export interface PaginationData<T = unknown> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/* 文章类型 */
export interface Article {
  id: number;
  title: string;
  slug: string | null;
  summary: string | null;
  content_md?: string | null;
  content_html?: string | null;
  is_published: boolean;
  read_count: number;
  read_time: number;
  category: Category | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/* 文章列表项（精简，不含正文） */
export type ArticleListItem = Omit<Article, "content_md" | "content_html">;

/* 分类类型 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  article_count: number;
}

/* 标签类型 */
export interface Tag {
  id: number;
  name: string;
  slug: string;
  article_count: number;
}

/* 归档条目 */
export interface ArchiveItem {
  year: number;
  month: number;
  article_count: number;
  articles: ArticleListItem[];
}

/* 登录响应 */
export interface LoginData {
  token: string;
  username: string;
}

/* 图片信息 */
export interface ImageInfo {
  id: number;
  filename: string;
  original_name: string;
  url: string;
  file_size: number;
  created_at: string;
}

/* TOC目录项 */
export interface TocItem {
  level: number;
  text: string;
  id: string;
}

/* 站点配置 */
export interface SiteConfig {
  site_title: string;
  site_subtitle: string;
  site_logo: string | null;
  home_intro: string;
  github_url: string;
  footer_text: string;
  [key: string]: string | null;
}
