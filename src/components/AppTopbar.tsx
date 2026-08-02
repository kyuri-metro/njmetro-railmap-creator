import { useEffect, useRef, type ChangeEvent } from 'react';
import { InfoCircleIcon } from '@umamichi-ui/common-components/icons';
import { MobileActionSheet } from '@umamichi-ui/common-components/menu';
import { KYURI_METRO_STUDIO_IFRAME_ORIGIN } from '../config/kyuriMetroStudioIframe';
import { KYURI_RMG_IFRAME_ORIGIN } from '../config/kyuriRmgIframe';
import { topbarCompactMediaQuery } from '../layout/topbarLayout';
import { OVERLAY_IDS } from '../overlay/overlayIds';
import { TopbarFileCommands, ExportIcon, ImportIcon, NewFileIcon } from './topbar/TopbarFileCommands';
import type { ThemeMode } from '../hooks/useThemeMode';

const SunIcon = () => (
  <svg className="app-theme-icon" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      d="M12 2v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m14 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
    />
  </svg>
);

const UndoIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
    />
  </svg>
);

const RedoIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m15 9 6 6m0 0-6 6M21 15H9a6 6 0 0 1 0-12h3"
    />
  </svg>
);

const MoreIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <circle cx="12" cy="5" r="1.75" fill="currentColor" />
    <circle cx="12" cy="12" r="1.75" fill="currentColor" />
    <circle cx="12" cy="19" r="1.75" fill="currentColor" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg className="app-theme-icon" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
    />
  </svg>
);

export type AppTopbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  themeMode: ThemeMode;
  isTopbarMoreMenuOpen: boolean;
  onTopbarMoreMenuOpenChange: (open: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onDownloadYaml: () => void;
  onYamlFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenRmgImport: () => void;
  onOpenMetroStudioImport: () => void;
  onOpenRmgExport: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onToggleTheme: () => void;
};

export const AppTopbar = ({
  canUndo,
  canRedo,
  themeMode,
  isTopbarMoreMenuOpen,
  onTopbarMoreMenuOpenChange,
  onUndo,
  onRedo,
  onNew,
  onDownloadYaml,
  onYamlFileChange,
  onOpenRmgImport,
  onOpenMetroStudioImport,
  onOpenRmgExport,
  onOpenSettings,
  onOpenAbout,
  onToggleTheme,
}: AppTopbarProps) => {
  const yamlFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(topbarCompactMediaQuery);

    const onLayoutChange = () => {
      if (!mq.matches) {
        onTopbarMoreMenuOpenChange(false);
      }
    };

    onLayoutChange();
    mq.addEventListener('change', onLayoutChange);
    return () => mq.removeEventListener('change', onLayoutChange);
  }, [onTopbarMoreMenuOpenChange]);

  return (
    <>
      <header className="app-topbar" data-lens-border="bottom" data-lens-depth="0.9">
        <div className="app-topbar-inner">
          <div className="app-topbar-title-wrap">
            <h1 className="app-topbar-title">
              <span className="app-topbar-title-text">南京地铁屏蔽门吊板生成器</span>
              <span className="visually-hidden">（Beta 测试版）</span>
            </h1>
            <span className="app-topbar-beta-mark" aria-hidden="true">
              Beta
            </span>
          </div>
          <TopbarFileCommands
            yamlFileInputRef={yamlFileInputRef}
            rmgToolConfigured={Boolean(KYURI_RMG_IFRAME_ORIGIN)}
            metroStudioToolConfigured={Boolean(KYURI_METRO_STUDIO_IFRAME_ORIGIN)}
            onNew={onNew}
            onDownloadYaml={onDownloadYaml}
            onOpenRmgImport={onOpenRmgImport}
            onOpenMetroStudioImport={onOpenMetroStudioImport}
            onOpenRmgExport={onOpenRmgExport}
          />
          <hr
            className="app-topbar-divider app-topbar-action--desktop-only"
            aria-orientation="vertical"
            aria-hidden="true"
          />
          <input
            ref={yamlFileInputRef}
            type="file"
            accept=".yml,.yaml,text/yaml,application/yaml"
            className="visually-hidden"
            onChange={onYamlFileChange}
          />
          <div className="app-topbar-actions">
            <button
              type="button"
              className="icon-button app-topbar-icon-button"
              aria-label="撤销"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <UndoIcon />
            </button>
            <button
              type="button"
              className="icon-button app-topbar-icon-button"
              aria-label="重做"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <RedoIcon />
            </button>
            <button
              type="button"
              className="icon-button app-topbar-icon-button app-topbar-action--desktop-only"
              aria-label="设置"
              onClick={onOpenSettings}
            >
              <SettingsIcon />
            </button>
            <button
              type="button"
              className="icon-button app-topbar-info-button app-topbar-action--desktop-only"
              aria-label="关于本生成器"
              onClick={onOpenAbout}
            >
              <InfoCircleIcon />
            </button>
            <button
              className="theme-toggle app-topbar-theme-toggle"
              type="button"
              onClick={onToggleTheme}
              aria-label={themeMode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {themeMode === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              className="icon-button app-topbar-icon-button app-topbar-action--mobile-only app-topbar-more-button"
              aria-label="更多"
              aria-haspopup="dialog"
              aria-expanded={isTopbarMoreMenuOpen}
              onClick={() => onTopbarMoreMenuOpenChange(true)}
            >
              <MoreIcon />
            </button>
          </div>
        </div>
      </header>

      <MobileActionSheet
        open={isTopbarMoreMenuOpen}
        overlayId={OVERLAY_IDS.topbarMoreMenu}
        ariaLabel="顶栏更多"
        onDismiss={() => onTopbarMoreMenuOpenChange(false)}
        entries={[
          {
            kind: 'item',
            id: 'new',
            label: '新建',
            icon: <NewFileIcon />,
            onSelect: onNew,
          },
          {
            kind: 'submenu',
            id: 'import',
            label: '导入',
            icon: <ImportIcon />,
            items: [
              {
                kind: 'item',
                id: 'import-yaml',
                label: '从 YAML 文件导入…',
                onSelect: () => yamlFileInputRef.current?.click(),
              },
              {
                kind: 'item',
                id: 'import-rmg',
                label: '导入 RMG JSON 存档',
                disabled: !KYURI_RMG_IFRAME_ORIGIN,
                title: !KYURI_RMG_IFRAME_ORIGIN ? 'RMG 转换窗口未配置，无法使用此选项' : undefined,
                onSelect: onOpenRmgImport,
              },
              {
                kind: 'item',
                id: 'import-metro-studio',
                label: '导入 Metro Studio 工程',
                disabled: !KYURI_METRO_STUDIO_IFRAME_ORIGIN,
                title: !KYURI_METRO_STUDIO_IFRAME_ORIGIN
                  ? 'Metro Studio 转换窗口未配置，无法使用此选项'
                  : undefined,
                onSelect: onOpenMetroStudioImport,
              },
            ],
          },
          {
            kind: 'submenu',
            id: 'export',
            label: '导出',
            icon: <ExportIcon />,
            items: [
              {
                kind: 'item',
                id: 'export-yaml',
                label: '下载 YAML',
                onSelect: onDownloadYaml,
              },
              {
                kind: 'item',
                id: 'export-rmg',
                label: '导出 RMG JSON 存档',
                disabled: !KYURI_RMG_IFRAME_ORIGIN,
                title: !KYURI_RMG_IFRAME_ORIGIN ? 'RMG 转换窗口未配置，无法使用此选项' : undefined,
                onSelect: onOpenRmgExport,
              },
            ],
          },
          { kind: 'separator', id: 'topbar-file-separator' },
          {
            kind: 'item',
            id: 'settings',
            label: '设置',
            icon: <SettingsIcon />,
            onSelect: onOpenSettings,
          },
          {
            kind: 'item',
            id: 'about',
            label: '关于',
            icon: <InfoCircleIcon />,
            onSelect: onOpenAbout,
          },
        ]}
      />
    </>
  );
};
