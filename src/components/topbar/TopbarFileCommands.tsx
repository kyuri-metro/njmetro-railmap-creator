import type { RefObject } from 'react';
import { StationYamlExportMenu, StationYamlImportMenu } from '../StationYamlIoMenus';
import { ExportIcon, ImportIcon, NewFileIcon } from './FileCommandIcons';

type TopbarFileCommandsProps = Readonly<{
  yamlFileInputRef: RefObject<HTMLInputElement | null>;
  rmgToolConfigured: boolean;
  metroStudioToolConfigured: boolean;
  onNew: () => void;
  onDownloadYaml: () => void;
  onOpenRmgImport: () => void;
  onOpenMetroStudioImport: () => void;
  onOpenRmgExport: () => void;
  rmgExportBlockedByBranches?: boolean;
}>;

export function TopbarFileCommands({
  yamlFileInputRef,
  rmgToolConfigured,
  metroStudioToolConfigured,
  onNew,
  onDownloadYaml,
  onOpenRmgImport,
  onOpenMetroStudioImport,
  onOpenRmgExport,
  rmgExportBlockedByBranches = false,
}: TopbarFileCommandsProps) {
  return (
    <fieldset className="app-topbar-file-commands app-topbar-action--desktop-only">
      <legend className="visually-hidden">文件</legend>
      <button type="button" className="icon-button app-topbar-icon-button" aria-label="新建" onClick={onNew}>
        <NewFileIcon />
      </button>
      <StationYamlImportMenu
        triggerVariant="icon"
        yamlFileInputRef={yamlFileInputRef}
        rmgToolConfigured={rmgToolConfigured}
        metroStudioToolConfigured={metroStudioToolConfigured}
        onOpenRmgImport={onOpenRmgImport}
        onOpenMetroStudioImport={onOpenMetroStudioImport}
      />
      <StationYamlExportMenu
        triggerVariant="icon"
        rmgToolConfigured={rmgToolConfigured}
        rmgExportBlockedByBranches={rmgExportBlockedByBranches}
        onDownloadYaml={onDownloadYaml}
        onOpenRmgExport={onOpenRmgExport}
      />
    </fieldset>
  );
}

export { ExportIcon, ImportIcon, NewFileIcon };
