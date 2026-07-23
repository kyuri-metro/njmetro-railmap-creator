import { useEffect } from 'react';
import { KYURI_METRO_STUDIO_CHILD_SOURCE } from '../kyuriMetroStudioProtocol';
import { OVERLAY_IDS } from '../overlay/overlayIds';
import { FullscreenOverlay } from '@umamichi-ui/common-components/overlay';

type KyuriMetroStudioToolModalProps = {
  open: boolean;
  baseUrl: string;
  onClose: () => void;
  onExited?: () => void;
  onImportedYaml: (yaml: string) => void;
};

export function KyuriMetroStudioToolModal({
  open,
  baseUrl,
  onClose,
  onExited,
  onImportedYaml,
}: KyuriMetroStudioToolModalProps) {
  const iframeSrc = baseUrl ? `${baseUrl}/?hideOutput=1&flow=metro-studio-to-kyuri` : '';

  useEffect(() => {
    if (!open || !baseUrl) {
      return;
    }

    let expectedOrigin = '';
    try {
      expectedOrigin = new URL(baseUrl).origin;
    } catch {
      return;
    }

    const onMsg = (e: MessageEvent) => {
      if (expectedOrigin && e.origin !== expectedOrigin) {
        return;
      }
      const d = e.data as {
        source?: string;
        type?: string;
        ok?: boolean;
        yaml?: string;
        message?: string;
      };
      if (!d || d.source !== KYURI_METRO_STUDIO_CHILD_SOURCE) {
        return;
      }

      if (d.type === 'result') {
        if (d.ok && typeof d.yaml === 'string') {
          onImportedYaml(d.yaml);
          onClose();
          return;
        }
        if (!d.ok && typeof d.message === 'string') {
          window.alert(d.message);
        }
      }
    };

    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [open, baseUrl, onImportedYaml, onClose]);

  if (!baseUrl) {
    return null;
  }

  return (
    <FullscreenOverlay
      open={open}
      overlayId={OVERLAY_IDS.kyuriMetroStudio}
      onDismiss={onClose}
      onExited={onExited}
      title="导入 Metro Studio 工程"
      titleId="kyuri-metro-studio-modal-title"
      size="page"
      fill
      panelClassName="kyuri-rmg-tool-dialog"
      bodyClassName="kyuri-rmg-tool-dialog-body"
    >
      <p className="confirm-dialog-body" style={{ marginBottom: 10 }}>
        在下方上传或粘贴 Metro Studio 工程 JSON（.metro-studio.json），选择线路后点击「转换」。回到本站后确认即可更新线路。
      </p>
      <iframe title="Metro Studio → Kyuri naive" src={iframeSrc} className="kyuri-rmg-tool-iframe" />
      <div className="confirm-dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          关闭
        </button>
      </div>
    </FullscreenOverlay>
  );
}
