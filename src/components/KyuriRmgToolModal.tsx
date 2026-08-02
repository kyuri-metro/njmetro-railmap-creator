import { useEffect, useRef } from 'react';
import { triggerBlobDownload } from '../badgeExport';
import { useIframeToolMessages } from '../hooks/useIframeToolMessages';
import { KYURI_RMG_CHILD_SOURCE, KYURI_RMG_PARENT_SOURCE } from '../kyuriRmgProtocol';
import { OVERLAY_IDS } from '../overlay/overlayIds';
import { FullscreenOverlay } from '@umamichi-ui/common-components/overlay';
import { InfoCircleIcon } from '@umamichi-ui/common-components/icons';

type KyuriRmgToolModalProps = {
  open: boolean;
  mode: 'import' | 'export';
  baseUrl: string;
  kyuriYamlForExport: string;
  onClose: () => void;
  onExited?: () => void;
  onImportedYaml: (yaml: string) => void;
};

export function KyuriRmgToolModal({
  open,
  mode,
  baseUrl,
  kyuriYamlForExport,
  onClose,
  onExited,
  onImportedYaml,
}: KyuriRmgToolModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const exportPayloadSentRef = useRef(false);
  const kyuriYamlRef = useRef(kyuriYamlForExport);
  kyuriYamlRef.current = kyuriYamlForExport;

  const iframeSrc = baseUrl
    ? `${baseUrl}/?hideOutput=1&flow=${mode === 'export' ? 'kyuri-to-rmg' : 'rmg-to-kyuri'}`
    : '';

  useEffect(() => {
    if (!open) {
      exportPayloadSentRef.current = false;
    }
  }, [open]);

  useIframeToolMessages({
    open,
    baseUrl,
    childSource: KYURI_RMG_CHILD_SOURCE,
    onMessage: (d, { origin }) => {
      if (d.type === 'ready') {
        if (mode === 'export' && iframeRef.current?.contentWindow && !exportPayloadSentRef.current) {
          exportPayloadSentRef.current = true;
          iframeRef.current.contentWindow.postMessage(
            {
              source: KYURI_RMG_PARENT_SOURCE,
              type: 'setKyuriYaml',
              yaml: kyuriYamlRef.current,
              thenConvert: true,
            } as const,
            origin || '*',
          );
        }
        return;
      }

      if (d.type === 'result') {
        if (d.ok && typeof d.yaml === 'string' && mode === 'import') {
          onImportedYaml(d.yaml);
          onClose();
          return;
        }
        if (d.ok && typeof d.json === 'string' && mode === 'export') {
          const blob = new Blob([d.json], { type: 'application/json;charset=utf-8' });
          triggerBlobDownload(blob, 'railmap-rmg.json');
          onClose();
          return;
        }
        if (!d.ok && typeof d.message === 'string') {
          window.alert(d.message);
        }
      }
    },
  });

  if (!baseUrl) {
    return null;
  }

  return (
    <FullscreenOverlay
      open={open}
      overlayId={OVERLAY_IDS.kyuriRmg}
      onDismiss={onClose}
      onExited={onExited}
      title={mode === 'import' ? '导入 RMG JSON 存档' : '导出 RMG JSON 存档'}
      titleId="kyuri-rmg-modal-title"
      size="page"
      fill
      panelClassName="kyuri-rmg-tool-dialog"
      bodyClassName="kyuri-rmg-tool-dialog-body"
    >
      <p className="dialog-note kyuri-tool-dialog-note">
        <InfoCircleIcon className="dialog-note-icon" />
        <span>
          {mode === 'import'
            ? '在下方粘贴 RMG 参数 JSON，点击「转换」。回到本站后确认即可更新线路。'
            : '正在生成 RMG 参数 JSON，完成后将自动下载。'}
        </span>
      </p>
      <iframe ref={iframeRef} title="Kyuri naive ↔ RMG" src={iframeSrc} className="kyuri-rmg-tool-iframe" />
      <div className="dialog-section-rule" role="separator" />
      <div className="confirm-dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          关闭
        </button>
      </div>
    </FullscreenOverlay>
  );
}
