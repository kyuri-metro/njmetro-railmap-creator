/** 部署 kyuri-naive-from-metro-studio 静态站点根 URL（无尾部斜杠），例如 https://kyuri-metro-studio.example.com */
export const KYURI_METRO_STUDIO_IFRAME_ORIGIN = String(
  import.meta.env.VITE_KYURI_METRO_STUDIO_IFRAME_ORIGIN ?? '',
).replace(/\/$/, '');
