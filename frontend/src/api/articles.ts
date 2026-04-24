/**
 * 前台公开API接口
 */
import request from "./request";
import type { ApiResponse, PaginationData, Article, ArticleListItem, Category, Tag, ArchiveItem } from "../types";

/* 获取已发布文章列表 */
export function getPublishedArticles(params: {
  page?: number;
  page_size?: number;
  category_id?: number;
  tag_id?: number;
  keyword?: string;
}) {
  return request.get<ApiResponse<PaginationData<ArticleListItem>>>("/api/v1/public/articles", { params });
}

/* 根据ID或slug获取文章详情 */
export function getArticleDetail(idOrSlug: string | number) {
  return request.get<ApiResponse<Article>>(`/api/v1/public/articles/${idOrSlug}`);
}

/* 获取所有分类 */
export function getCategories() {
  return request.get<ApiResponse<Category[]>>("/api/v1/public/categories");
}

/* 获取所有标签 */
export function getTags() {
  return request.get<ApiResponse<Tag[]>>("/api/v1/public/tags");
}

/* 获取归档数据 */
export function getArchive() {
  return request.get<ApiResponse<ArchiveItem[]>>("/api/v1/public/archive");
}

/* 全文搜索 */
export function searchArticles(params: { q: string; page?: number; page_size?: number }) {
  return request.get<ApiResponse<PaginationData<ArticleListItem> & { keyword: string }>>("/api/v1/public/search", { params });
}
