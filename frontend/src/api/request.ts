/**
 * Axios请求封装
 * 统一处理Token注入、响应拦截、错误提示
 */
import axios from "axios";
import type { ApiResponse } from "../types";

/* 后端API基础地址，从环境变量读取 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/* 请求拦截器：自动注入JWT Token */
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* 响应拦截器：统一处理错误 */
request.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;
    // 后端返回code非200时视为业务错误
    if (data.code && data.code !== 200) {
      return Promise.reject(new Error(data.msg || "请求失败"));
    }
    return response;
  },
  (error) => {
    // 401未授权：清除Token并跳转登录页
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // 如果不在登录页，跳转到登录页
      if (!window.location.pathname.includes("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export default request;
