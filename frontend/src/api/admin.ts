/**
 * 后台管理API接口
 */
import request from "./request";
import type { ApiResponse, PaginationData, Article, ArticleListItem, Category, Tag, LoginData, ImageInfo } from "../types";

/* ===== 认证 ===== */
export function login(username: string, password: string) {
  return request.post<ApiResponse<LoginData>>("/api/v1/admin/login", { username, password });
}

/* ===== 文章管理 ===== */
export function getAdminArticles(params: {
  page?: number;
  page_size?: number;
  is_published?: boolean;
  category_id?: number;
  tag_id?: number;
  keyword?: string;
}) {
  return request.get<ApiResponse<PaginationData<ArticleListItem>>>("/api/v1/admin/articles", { params });
}

export function getAdminArticle(id: number) {
  return request.get<ApiResponse<Article>>(`/api/v1/admin/articles/${id}`);
}

export function createArticle(data: {
  title: string;
  content_md: string;
  is_published?: boolean;
  category_id?: number | null;
  tag_ids?: number[];
  slug?: string;
  summary?: string;
}) {
  return request.post<ApiResponse<Article>>("/api/v1/admin/articles", data);
}

export function updateArticle(id: number, data: {
  title?: string;
  content_md?: string;
  is_published?: boolean;
  category_id?: number | null;
  tag_ids?: number[];
  slug?: string;
  summary?: string;
}) {
  return request.put<ApiResponse<Article>>(`/api/v1/admin/articles/${id}`, data);
}

export function deleteArticle(id: number) {
  return request.delete<ApiResponse<null>>(`/api/v1/admin/articles/${id}`);
}

/* ===== 分类管理 ===== */
export function createCategory(data: { name: string; slug: string }) {
  return request.post<ApiResponse<Category>>("/api/v1/admin/categories", data);
}

export function updateCategory(id: number, data: { name?: string; slug?: string }) {
  return request.put<ApiResponse<Category>>(`/api/v1/admin/categories/${id}`, data);
}

export function deleteCategory(id: number) {
  return request.delete<ApiResponse<null>>(`/api/v1/admin/categories/${id}`);
}

/* ===== 标签管理 ===== */
export function createTag(data: { name: string; slug: string }) {
  return request.post<ApiResponse<Tag>>("/api/v1/admin/tags", data);
}

export function updateTag(id: number, data: { name?: string; slug?: string }) {
  return request.put<ApiResponse<Tag>>(`/api/v1/admin/tags/${id}`, data);
}

export function deleteTag(id: number) {
  return request.delete<ApiResponse<null>>(`/api/v1/admin/tags/${id}`);
}

/* ===== 图片上传 ===== */
export function uploadImages(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return request.post<ApiResponse<{ images: ImageInfo[]; errors: { filename: string; error: string }[] }>>(
    "/api/v1/admin/upload/image",
    formData
  );
}
