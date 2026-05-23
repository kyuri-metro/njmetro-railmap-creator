import { useEffect, useState } from 'react';
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
  const [entries, setEntries] = useState<AutosaveEntry[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setEntries(readAutosaveEntries());
  }, [open]);

  return (
    <ConfirmDialogOverlay open={open} overlayId={OVERLAY_IDS.autosaveList} onDismiss={onClose}>
      <div
        className="confirm-dialog autosave-list-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="autosave-list-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="autosave-list-dialog-title" className="confirm-dialog-title">
          自动保存
        </h2>
        <div className="confirm-dialog-body autosave-list-dialog-body">
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
        <div className="confirm-dialog-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </ConfirmDialogOverlay>
  );
}
