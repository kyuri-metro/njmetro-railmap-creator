import { useEffect, useId, useState } from 'react';
import { readAutosaveEntries, type AutosaveEntry } from '../autosaveStorage';
import { OVERLAY_IDS } from '../overlay/overlayIds';
import { ConfirmDialogOverlay } from '@umamichi-ui/common-components/dialog';

type AutosaveListDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelectEntry: (entry: AutosaveEntry) => void;
};

const formatSavedAt = (savedAt: number) => {
  try {
    return new Date(savedAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(savedAt);
  }
};

export function AutosaveListDialog({ open, onClose, onSelectEntry }: AutosaveListDialogProps) {
  const titleId = useId();
  const [entries, setEntries] = useState<AutosaveEntry[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setEntries(readAutosaveEntries());
  }, [open]);

  return (
    <ConfirmDialogOverlay
      open={open}
      overlayId={OVERLAY_IDS.autosaveList}
      onDismiss={onClose}
      title="自动保存"
      titleId={titleId}
      panelClassName="autosave-list-dialog"
      bodyClassName="autosave-list-dialog-body"
    >
      <div className="autosave-list-scroll">
        {entries.length === 0 ? (
          <p className="autosave-list-empty">暂无自动保存记录。</p>
        ) : (
          <ul className="autosave-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="autosave-list-item" onClick={() => onSelectEntry(entry)}>
                  <span className="autosave-list-item-time">{formatSavedAt(entry.savedAt)}</span>
                  <span className="autosave-list-item-summary">{entry.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dialog-section-rule" role="separator" />

      <div className="confirm-dialog-actions">
        <button type="button" className="primary-button" onClick={onClose}>
          关闭
        </button>
      </div>
    </ConfirmDialogOverlay>
  );
}
