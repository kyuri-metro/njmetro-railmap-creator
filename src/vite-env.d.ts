/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KYURI_RMG_IFRAME_ORIGIN?: string;
  readonly VITE_KYURI_METRO_STUDIO_IFRAME_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
