import { useEffect, useId, useState } from 'react';
import {
  downloadBadgeRaster,
  downloadBadgeSvg,
  GENERATOR_PUBLIC_URL,
  DEFAULT_EXPORT_HEIGHT,
  parseExportHeight,
  PUBLISH_ATTRIBUTION_SNIPPET,
  webpRasterExportSupported,
  type BadgeRasterFormat,
} from '../badgeExport';
import { ConfirmDialogOverlay } from './ConfirmDialogOverlay';

export type BadgeDownloadFormat = 'svg' | BadgeRasterFormat;

type BadgeDownloadDialogProps = {
  open: boolean;
  fileName: string;
  getSvgElement: () => SVGSVGElement | null;
  onClose: () => void;
};

const formatOptions: { value: BadgeDownloadFormat; label: string; disabled?: boolean }[] = [
  { value: 'svg', label: 'SVG' },
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP', disabled: !webpRasterExportSupported },
];

export function BadgeDownloadDialog({ open, fileName, getSvgElement, onClose }: BadgeDownloadDialogProps) {
  const titleId = useId();
  const [exportHeightDraft, setExportHeightDraft] = useState(String(DEFAULT_EXPORT_HEIGHT));
  const [format, setFormat] = useState<BadgeDownloadFormat>('png');
  const [publishAttributionAccepted, setPublishAttributionAccepted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setExportHeightDraft(String(DEFAULT_EXPORT_HEIGHT));
    setFormat('png');
    setPublishAttributionAccepted(false);
    setIsExporting(false);
  }, [open, fileName]);

  const handleDownload = async () => {
    if (!publishAttributionAccepted || isExporting) {
      return;
    }

    const svgElement = getSvgElement();

    if (!svgElement) {
      return;
    }

    const exportHeight = parseExportHeight(exportHeightDraft);

    setIsExporting(true);

    try {
      if (format === 'svg') {
        downloadBadgeSvg(svgElement, fileName, exportHeight);
        onClose();
        return;
      }

      const ok = await downloadBadgeRaster(svgElement, fileName, format, exportHeight);

      if (!ok) {
        window.alert('导出失败，请重试。');
        return;
      }

      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ConfirmDialogOverlay open={open} onDismiss={onClose}>
      <div
        className="confirm-dialog badge-download-dialog form-scope"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="confirm-dialog-title">
          下载贴纸
        </h2>
        <div className="confirm-dialog-body badge-download-dialog-body">
          <label className="field-label">
            <span>高度（默认800）</span>
            <input
              className="text-input"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder={String(DEFAULT_EXPORT_HEIGHT)}
              value={exportHeightDraft}
              onChange={(event) => setExportHeightDraft(event.target.value)}
            />
          </label>
          <label className="field-label">
            <span>格式</span>
            <select
              className="select-input"
              value={format}
              onChange={(event) => setFormat(event.target.value as BadgeDownloadFormat)}
            >
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label field-label-checkbox badge-download-attribution">
            <input
              type="checkbox"
              checked={publishAttributionAccepted}
              onChange={(event) => setPublishAttributionAccepted(event.target.checked)}
            />
            <span>
              下载后，我发布本图片时将会附上
              <code>{PUBLISH_ATTRIBUTION_SNIPPET}</code>
              ，并附上
              <a href={GENERATOR_PUBLIC_URL} target="_blank" rel="noreferrer">
                本生成器链接
              </a>
            </span>
          </label>
        </div>
        <div className="confirm-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isExporting}>
            取消
          </button>
          <button
            type="button"
            className={publishAttributionAccepted ? 'primary-button' : 'secondary-button'}
            disabled={!publishAttributionAccepted || isExporting}
            onClick={() => void handleDownload()}
          >
            下载
          </button>
        </div>
      </div>
    </ConfirmDialogOverlay>
  );
}
