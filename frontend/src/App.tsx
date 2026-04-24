/**
 * 应用根组件
 * 路由配置 + 布局（Navbar + Footer）
 */
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

/* 路由懒加载 */
const Home = lazy(() => import("./pages/Home"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const Categories = lazy(() => import("./pages/Categories"));
const Tags = lazy(() => import("./pages/Tags"));
const Archive = lazy(() => import("./pages/Archive"));
const Search = lazy(() => import("./pages/Search"));

const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminLayout = lazy(() => import("./pages/admin/Layout"));
const AdminArticles = lazy(() => import("./pages/admin/Articles"));
const AdminEditor = lazy(() => import("./pages/admin/Editor"));

/* 通用loading占位 */
const Loading = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-sm text-gray-400">加载中...</div>
  </div>
);

/* 前台布局：Navbar + 内容区 + Footer */
function FrontLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 前台路由 */}
        <Route element={<FrontLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/article/:idOrSlug" element={<ArticleDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/search" element={<Search />} />
        </Route>

        {/* 后台路由 */}
        <Route path="/admin/login" element={
          <Suspense fallback={<Loading />}>
            <AdminLogin />
          </Suspense>
        } />
        <Route path="/admin" element={
          <Suspense fallback={<Loading />}>
            <AdminLayout />
          </Suspense>
        }>
          <Route path="articles" element={
            <Suspense fallback={<Loading />}>
              <AdminArticles />
            </Suspense>
          } />
          <Route path="editor" element={
            <Suspense fallback={<Loading />}>
              <AdminEditor />
            </Suspense>
          } />
          <Route path="editor/:id" element={
            <Suspense fallback={<Loading />}>
              <AdminEditor />
            </Suspense>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
