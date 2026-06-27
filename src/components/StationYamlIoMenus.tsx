import type { RefObject } from 'react';
import { FloatingMenu } from '@umamichi-ui/common-components/menu';
import { ExportIcon, ImportIcon } from './topbar/FileCommandIcons';

type YamlIoMenuTriggerVariant = 'labeled' | 'icon';

const iconTriggerClassName = 'icon-button app-topbar-icon-button dropdown-menu-trigger dropdown-menu-trigger--icon';
const labeledTriggerClassName = 'secondary-button dropdown-menu-trigger';

type StationYamlImportMenuProps = {
  yamlFileInputRef: RefObject<HTMLInputElement | null>;
  rmgToolConfigured: boolean;
  metroStudioToolConfigured: boolean;
  onOpenRmgImport: () => void;
  onOpenMetroStudioImport: () => void;
  triggerVariant?: YamlIoMenuTriggerVariant;
};

export function StationYamlImportMenu({
  yamlFileInputRef,
  rmgToolConfigured,
  metroStudioToolConfigured,
  onOpenRmgImport,
  onOpenMetroStudioImport,
  triggerVariant = 'labeled',
}: StationYamlImportMenuProps) {
  return (
    <FloatingMenu
      menuAriaLabel="导入线路数据"
      scrollRootSelector=".app-main"
      triggerVariant={triggerVariant}
      triggerClassName={triggerVariant === 'icon' ? iconTriggerClassName : labeledTriggerClassName}
      triggerAriaLabel={triggerVariant === 'icon' ? '导入' : undefined}
      triggerLabel="导入"
      triggerIcon={<ImportIcon />}
      items={[
        {
          kind: 'item',
          id: 'yaml-file',
          label: '从 YAML 文件导入…',
          onSelect: () => yamlFileInputRef.current?.click(),
        },
        { kind: 'separator', id: 'sep-rmg' },
        {
          kind: 'item',
          id: 'rmg-import',
          label: '导入 RMG JSON 存档',
          disabled: !rmgToolConfigured,
          title: !rmgToolConfigured ? 'RMG 转换窗口未配置，无法使用此选项' : undefined,
          onSelect: onOpenRmgImport,
        },
        {
          kind: 'item',
          id: 'metro-studio-import',
          label: '导入 Metro Studio 工程',
          disabled: !metroStudioToolConfigured,
          title: !metroStudioToolConfigured ? 'Metro Studio 转换窗口未配置，无法使用此选项' : undefined,
          onSelect: onOpenMetroStudioImport,
        },
      ]}
    />
  );
}

type StationYamlExportMenuProps = {
  rmgToolConfigured: boolean;
  onDownloadYaml: () => void;
  onOpenRmgExport: () => void;
  triggerVariant?: YamlIoMenuTriggerVariant;
};

export function StationYamlExportMenu({
  rmgToolConfigured,
  onDownloadYaml,
  onOpenRmgExport,
  triggerVariant = 'labeled',
}: StationYamlExportMenuProps) {
  return (
    <FloatingMenu
      menuAriaLabel="导出线路数据"
      scrollRootSelector=".app-main"
      triggerVariant={triggerVariant}
      triggerClassName={triggerVariant === 'icon' ? iconTriggerClassName : labeledTriggerClassName}
      triggerAriaLabel={triggerVariant === 'icon' ? '导出' : undefined}
      triggerLabel="导出"
      triggerIcon={<ExportIcon />}
      items={[
        {
          kind: 'item',
          id: 'yaml-download',
          label: '下载 YAML',
          onSelect: onDownloadYaml,
        },
        { kind: 'separator', id: 'sep-rmg' },
        {
          kind: 'item',
          id: 'rmg-export',
          label: '导出 RMG JSON 存档',
          disabled: !rmgToolConfigured,
          title: !rmgToolConfigured ? 'RMG 转换窗口未配置，无法使用此选项' : undefined,
          onSelect: onOpenRmgExport,
        },
      ]}
    />
  );
}
