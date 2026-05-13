/** 部署 kyuri-naive-from-and-to-rmg 静态站点根 URL（无尾部斜杠），例如 https://kyuri-rmg.example.com */
export const KYURI_RMG_IFRAME_ORIGIN = String(import.meta.env.VITE_KYURI_RMG_IFRAME_ORIGIN ?? '').replace(/\/$/, '');
