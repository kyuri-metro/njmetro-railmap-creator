import { ConfirmDialogOverlay } from '@umamichi-ui/common-components/dialog';
import { FullscreenOverlay } from '@umamichi-ui/common-components/overlay';
import { InfoCircleIcon } from '@umamichi-ui/common-components/icons';
import type { AutosaveEntry } from '../autosaveStorage';
import { OVERLAY_IDS } from '../overlay/overlayIds';

const sampleImages = [
  {
    title: '终点站示例',
    description: '线路标识与 Terminus 贴纸',
    src: `${import.meta.env.BASE_URL}assets/terminus-badge.webp`,
  },
  {
    title: '方向贴纸示例',
    description: '往某站 / 下一站 组合样式',
    src: `${import.meta.env.BASE_URL}assets/direction-badge.webp`,
  },
  {
    title: '路线图示例',
    description: '含当前站、换乘与后续站点的线路图',
    src: `${import.meta.env.BASE_URL}assets/route-badge.webp`,
  },
] as const;

export type AppConfirmOverlaysProps = {
  isNewProjectConfirmOpen: boolean;
  onDismissNewProject: () => void;
  onConfirmNewProject: () => void;

  isYamlImportConfirmOpen: boolean;
  onDismissYamlImport: () => void;
  onConfirmYamlImport: () => void;

  yamlImportError: string | null;
  onDismissYamlError: () => void;

  isOverwriteStationsConfirmOpen: boolean;
  onDismissOverwriteStations: () => void;
  onConfirmOverwriteStations: () => void;

  isExampleModalOpen: boolean;
  onDismissExampleModal: () => void;

  isAutosaveRestoreConfirmOpen: boolean;
  pendingAutosaveEntry: AutosaveEntry | null;
  onDismissAutosaveRestore: () => void;
  onConfirmAutosaveRestore: () => void;
};

export const AppConfirmOverlays = ({
  isNewProjectConfirmOpen,
  onDismissNewProject,
  onConfirmNewProject,
  isYamlImportConfirmOpen,
  onDismissYamlImport,
  onConfirmYamlImport,
  yamlImportError,
  onDismissYamlError,
  isOverwriteStationsConfirmOpen,
  onDismissOverwriteStations,
  onConfirmOverwriteStations,
  isExampleModalOpen,
  onDismissExampleModal,
  isAutosaveRestoreConfirmOpen,
  pendingAutosaveEntry,
  onDismissAutosaveRestore,
  onConfirmAutosaveRestore,
}: AppConfirmOverlaysProps) => (
  <>
    <ConfirmDialogOverlay
      open={isNewProjectConfirmOpen}
      overlayId={OVERLAY_IDS.newProjectConfirm}
      onDismiss={onDismissNewProject}
      title="确认新建"
      titleId="new-project-confirm-title"
    >
      <p id="new-project-confirm-desc" className="confirm-dialog-body">
        新建将创建空白线路图（无站点，保留默认线路编号与生成设置），覆盖当前编辑内容，并清空撤销历史，无法撤销至操作前。
      </p>
      <div className="confirm-dialog-actions">
        <button type="button" className="secondary-button" onClick={onDismissNewProject}>
          取消
        </button>
        <button type="button" className="primary-button" onClick={onConfirmNewProject}>
          新建
        </button>
      </div>
    </ConfirmDialogOverlay>

    <ConfirmDialogOverlay
      open={isYamlImportConfirmOpen}
      overlayId={OVERLAY_IDS.yamlImportConfirm}
      onDismiss={onDismissYamlImport}
      title="确认导入 YAML"
      titleId="yaml-import-confirm-title"
    >
      <p id="yaml-import-confirm-desc" className="confirm-dialog-body">
        导入将覆盖当前站点列表、线路编号、标识色、线路编号字体色与生成设置（总长、方向等），并清空撤销历史，无法撤销至导入前。
      </p>
      <div className="confirm-dialog-actions">
        <button type="button" className="secondary-button" onClick={onDismissYamlImport}>
          取消
        </button>
        <button type="button" className="primary-button" onClick={onConfirmYamlImport}>
          继续
        </button>
      </div>
    </ConfirmDialogOverlay>

    <ConfirmDialogOverlay
      open={yamlImportError !== null}
      overlayId={OVERLAY_IDS.yamlImportError}
      onDismiss={onDismissYamlError}
      title="YAML 导入失败"
      titleId="yaml-import-error-title"
    >
      {yamlImportError ? (
        <>
          <p id="yaml-import-error-desc" className="confirm-dialog-body">
            {yamlImportError}
          </p>
          <div className="confirm-dialog-actions">
            <button type="button" className="primary-button" onClick={onDismissYamlError}>
              知道了
            </button>
          </div>
        </>
      ) : null}
    </ConfirmDialogOverlay>

    <ConfirmDialogOverlay
      open={isOverwriteStationsConfirmOpen}
      overlayId={OVERLAY_IDS.overwriteStations}
      onDismiss={onDismissOverwriteStations}
      title="确认覆盖站点列表"
      titleId="overwrite-stations-confirm-title"
    >
      <p id="overwrite-stations-confirm-desc" className="confirm-dialog-body">
        此操作将会覆盖站点列表，并清空撤销历史，无法撤销至覆盖前。
      </p>
      <div className="confirm-dialog-actions">
        <button type="button" className="secondary-button" onClick={onDismissOverwriteStations}>
          取消
        </button>
        <button type="button" className="primary-button" onClick={onConfirmOverwriteStations}>
          继续
        </button>
      </div>
    </ConfirmDialogOverlay>

    <FullscreenOverlay
      open={isExampleModalOpen}
      overlayId={OVERLAY_IDS.exampleModal}
      onDismiss={onDismissExampleModal}
      title="参考样例"
      titleId="example-modal-title"
      size="page"
      closeAriaLabel="关闭示例浮窗"
      panelClassName="example-modal-overlay"
      bodyClassName="example-modal-overlay-body"
    >
      <p className="dialog-note example-modal-note">
        <InfoCircleIcon className="dialog-note-icon" />
        <span>以下图片来自 public/assets，仅用于版式参考，并非当前表单的实时输出。</span>
      </p>
      <div className="example-gallery">
        {sampleImages.map((sample) => (
          <figure key={sample.title} className="example-card">
            <img src={sample.src} alt={sample.title} loading="lazy" />
            <figcaption>
              <strong>{sample.title}</strong>
              <span>{sample.description}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </FullscreenOverlay>

    <ConfirmDialogOverlay
      open={isAutosaveRestoreConfirmOpen}
      overlayId={OVERLAY_IDS.autosaveRestore}
      onDismiss={onDismissAutosaveRestore}
      title="恢复自动保存"
      titleId="autosave-restore-confirm-title"
    >
      <p id="autosave-restore-confirm-desc" className="confirm-dialog-body">
        {pendingAutosaveEntry
          ? `将用 ${pendingAutosaveEntry.summary}（${new Date(pendingAutosaveEntry.savedAt).toLocaleString('zh-CN')}）覆盖当前编辑内容，并清空撤销历史。`
          : ''}
      </p>
      <div className="confirm-dialog-actions">
        <button type="button" className="secondary-button" onClick={onDismissAutosaveRestore}>
          取消
        </button>
        <button type="button" className="primary-button" onClick={onConfirmAutosaveRestore}>
          继续
        </button>
      </div>
    </ConfirmDialogOverlay>
  </>
);
