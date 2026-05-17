import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayPresence, withOverlayOpen } from '../hooks/useOverlayPresence';
import { KYURI_RMG_CHILD_SOURCE, KYURI_RMG_PARENT_SOURCE } from '../kyuriRmgProtocol';

type KyuriRmgToolModalProps = {
  open: boolean;
  mode: 'import' | 'export';
  baseUrl: string;
  /** export 模式：当前线路 Kyuri YAML */
  kyuriYamlForExport: string;
  onClose: () => void;
  onExited?: () => void;
  /** import 成功拿到 YAML */
  onImportedYaml: (yaml: string) => void;
};

function triggerBlobDownload(blob: Blob, downloadName: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = objectUrl;
  downloadLink.download = downloadName;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function KyuriRmgToolModal({
  open,
  mode,
  baseUrl,
  kyuriYamlForExport,
  onClose,
  onExited,
  onImportedYaml,
}: KyuriRmgToolModalProps) {
  const { mounted, isOpen, overlayRef } = useOverlayPresence<HTMLDivElement>(open);
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
        json?: string;
        message?: string;
      };
      if (!d || d.source !== KYURI_RMG_CHILD_SOURCE) {
        return;
      }

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
            expectedOrigin || '*',
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
    };

    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [open, baseUrl, mode, onImportedYaml, onClose]);

  useEffect(() => {
    if (!mounted) {
      onExited?.();
    }
  }, [mounted, onExited]);

  if (!mounted || !baseUrl) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className={withOverlayOpen('confirm-dialog-backdrop', isOpen)}
      role="presentation"
      onClick={() => {
        onClose();
      }}
    >
      <div
        className="confirm-dialog kyuri-rmg-tool-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyuri-rmg-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="kyuri-rmg-modal-title" className="confirm-dialog-title">
          {mode === 'import' ? '导入 RMG JSON 存档' : '导出 RMG JSON 存档'}
        </h2>
        <p className="confirm-dialog-body" style={{ marginBottom: 10 }}>
          {mode === 'import'
            ? '在下方粘贴 RMG 参数 JSON，点击「转换」。回到本站后确认即可更新线路。'
            : '正在生成 RMG 参数 JSON，完成后将自动下载。'}
        </p>
        <iframe ref={iframeRef} title="Kyuri naive ↔ RMG" src={iframeSrc} className="kyuri-rmg-tool-iframe" />
        <div className="confirm-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
