import type { RefObject } from 'react';
import { StationYamlExportMenu, StationYamlImportMenu } from '../StationYamlIoMenus';
import { ExportIcon, ImportIcon, NewFileIcon } from './FileCommandIcons';

type TopbarFileCommandsProps = {
  yamlFileInputRef: RefObject<HTMLInputElement | null>;
  rmgToolConfigured: boolean;
  metroStudioToolConfigured: boolean;
  onNew: () => void;
  onDownloadYaml: () => void;
  onOpenRmgImport: () => void;
  onOpenMetroStudioImport: () => void;
  onOpenRmgExport: () => void;
};

export function TopbarFileCommands({
  yamlFileInputRef,
  rmgToolConfigured,
  metroStudioToolConfigured,
  onNew,
  onDownloadYaml,
  onOpenRmgImport,
  onOpenMetroStudioImport,
  onOpenRmgExport,
}: TopbarFileCommandsProps) {
  return (
    <div className="app-topbar-file-commands app-topbar-action--desktop-only" role="group" aria-label="文件">
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
        onDownloadYaml={onDownloadYaml}
        onOpenRmgExport={onOpenRmgExport}
      />
    </div>
  );
}

export { ExportIcon, ImportIcon, NewFileIcon };
