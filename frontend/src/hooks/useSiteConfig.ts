import { useState, useEffect } from "react";
import { getSiteConfig } from "../api/articles";
import type { SiteConfig } from "../types";

const DEFAULT_CONFIG: SiteConfig = {
  site_title: "My Blog",
  site_subtitle: "记录技术、思考与生活",
  site_logo: null,
  home_intro: "这里分享编程、AI、工具使用和个人成长的记录，希望能给你带来一些启发。",
  github_url: "https://github.com",
  footer_text: "All rights reserved.",
};

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getSiteConfig();
        const data = res.data.data;
        if (data) {
          setConfig({ ...DEFAULT_CONFIG, ...data });
        }
      } catch (err) {
        console.error("加载站点配置失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { config, loading };
}
