import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StationItem, StationType, TransferLine } from '../features/generatorSlice';
import { useOverlayPresence, withOverlayOpen } from '../hooks/useOverlayPresence';
import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from '../njmetroLinePalette';

export type StationFormDraft = {
  chName: string;
  enName: string;
  type: StationType;
  transfer: TransferLine[];
};

const stationTypeOptions: { label: string; value: StationType }[] = [
  { label: '无', value: 'none' },
  { label: '火车站', value: 'railway' },
  { label: '机场', value: 'airport' },
];

const createEmptyTransferLine = (): TransferLine => ({
  id: '',
  color: '#8c989f',
  textColor: '#ffffff',
});

type StationFormModalProps = {
  allowDelete: boolean;
  initialValue: StationFormDraft;
  modeLabel: string;
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
  onDelete?: () => void;
  onSubmit: (draft: StationFormDraft) => void;
};

export function StationFormModal({
  allowDelete,
  initialValue,
  modeLabel,
  open,
  onClose,
  onExited,
  onDelete,
  onSubmit,
}: StationFormModalProps) {
  const [draft, setDraft] = useState(initialValue);
  const { mounted, isOpen, overlayRef } = useOverlayPresence<HTMLDivElement>(open);

  useEffect(() => {
    if (!mounted) {
      onExited?.();
    }
  }, [mounted, onExited]);

  const updateTransferLine = (index: number, field: keyof TransferLine, value: string) => {
    setDraft((current) => ({
      ...current,
      transfer: current.transfer.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        const next = { ...line, [field]: value };

        if (field === 'id') {
          const upper = value.trim().toUpperCase();
          const paletteColor = getNjmetroLineBackgroundColor(upper);
          const paletteText = getNjmetroLineForegroundColor(upper);

          if (paletteColor) {
            next.color = paletteColor;
          }

          if (paletteText) {
            next.textColor = paletteText;
          }
        }

        return next;
      }),
    }));
  };

  const addTransferLine = () => {
    setDraft((current) => ({
      ...current,
      transfer: [...current.transfer, createEmptyTransferLine()],
    }));
  };

  const removeTransferLine = (index: number) => {
    setDraft((current) => ({
      ...current,
      transfer: current.transfer.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div ref={overlayRef} className={withOverlayOpen('modal-backdrop', isOpen)} role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id="station-modal-title">{modeLabel}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭弹窗">
            x
          </button>
        </div>

        <div className="modal-toolbar">
          <button type="button" className="danger-button" onClick={onDelete} disabled={!allowDelete}>
            删除
          </button>
        </div>

        <form
          className="modal-form form-scope"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(draft);
          }}
        >
          <label className="field-label">
            <span>chName（中文名）</span>
            <input
              className="text-input"
              value={draft.chName}
              onChange={(event) => setDraft((current) => ({ ...current, chName: event.target.value }))}
              placeholder="例如：新街口"
              required
            />
          </label>
          <label className="field-label">
            <span>enName（英文名）</span>
            <input
              className="text-input"
              value={draft.enName}
              onChange={(event) => setDraft((current) => ({ ...current, enName: event.target.value }))}
              placeholder="例如：Xinjiekou"
              required
            />
          </label>
          <label className="field-label">
            <span>type（站点类型）</span>
            <select
              className="select-input"
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as StationType }))}
            >
              {stationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            <span>transfer（换乘线路）</span>
            <div className="modal-transfer-editor">
              <div className="table-wrap modal-transfer-table-wrap">
                <table className="station-table modal-transfer-table">
                  <colgroup>
                    <col className="modal-transfer-col-id" />
                    <col className="modal-transfer-col-color" />
                    <col className="modal-transfer-col-text" />
                    <col className="modal-transfer-col-action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>线路编号</th>
                      <th>标识色</th>
                      <th>字体色</th>
                      <th aria-label="删除换乘线路" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.transfer.length > 0 ? (
                      draft.transfer.map((line, index) => (
                        <tr key={`transfer-line-${index}`}>
                          <td>
                            <input
                              className="text-input"
                              value={line.id}
                              onChange={(event) => updateTransferLine(index, 'id', event.target.value)}
                              placeholder="例如：2 或 S1"
                            />
                          </td>
                          <td>
                            <input
                              type="color"
                              value={line.color}
                              onChange={(event) => updateTransferLine(index, 'color', event.target.value)}
                              aria-label={`换乘线路 ${index + 1} 的标识色`}
                            />
                          </td>
                          <td>
                            <input
                              type="color"
                              value={line.textColor}
                              onChange={(event) => updateTransferLine(index, 'textColor', event.target.value)}
                              aria-label={`换乘线路 ${index + 1} 的字体色`}
                            />
                          </td>
                          <td className="station-action-cell">
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => removeTransferLine(index)}
                              aria-label={`删除第 ${index + 1} 条换乘线路`}
                            >
                              x
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="modal-transfer-empty">
                          暂无换乘线路
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="modal-transfer-actions">
                <button type="button" className="secondary-button" onClick={addTransferLine}>
                  添加换乘线路
                </button>
              </div>
            </div>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primary-button">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export const stationToDraft = (station?: StationItem): StationFormDraft => ({
  chName: station?.chName ?? '',
  enName: station?.enName ?? '',
  type: station?.type ?? 'none',
  transfer: station?.transfer.map((line) => ({ ...line })) ?? [],
});
