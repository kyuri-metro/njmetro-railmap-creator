import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  DEFAULT_AUTOSAVE_SETTINGS,
  readAutosaveSettings,
  writeAutosaveSettings,
  type AutosaveSettings,
} from '../autosaveStorage';
import { updateAutosaveSchedulerSettings } from '../features/autosaveScheduler';
import { OVERLAY_IDS } from '../overlay/overlayIds';
import { ConfirmDialogOverlay } from '@umamichi-ui/common-components/dialog';

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onOpenAutosaveList: () => void;
};

const parsePositiveInt = (raw: string, fallback: number) => {
  const n = Math.trunc(Number(raw.trim()));

  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function SettingsDialog({ open, onClose, onOpenAutosaveList }: SettingsDialogProps) {
  const intervalFieldId = useId();
  const maxEntriesFieldId = useId();
  const [intervalDraft, setIntervalDraft] = useState(String(DEFAULT_AUTOSAVE_SETTINGS.intervalSeconds));
  const [maxEntriesDraft, setMaxEntriesDraft] = useState(String(DEFAULT_AUTOSAVE_SETTINGS.maxEntries));

  useEffect(() => {
    if (!open) {
      return;
    }

    const settings = readAutosaveSettings();
    setIntervalDraft(String(settings.intervalSeconds));
    setMaxEntriesDraft(String(settings.maxEntries));
  }, [open]);

  const persistSettings = () => {
    const next: AutosaveSettings = {
      intervalSeconds: parsePositiveInt(intervalDraft, DEFAULT_AUTOSAVE_SETTINGS.intervalSeconds),
      maxEntries: parsePositiveInt(maxEntriesDraft, DEFAULT_AUTOSAVE_SETTINGS.maxEntries),
    };
    const normalized = writeAutosaveSettings(next);
    updateAutosaveSchedulerSettings(normalized);
    setIntervalDraft(String(normalized.intervalSeconds));
    setMaxEntriesDraft(String(normalized.maxEntries));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    persistSettings();
    onClose();
  };

  const handleOpenAutosaveList = () => {
    persistSettings();
    onOpenAutosaveList();
  };

  return (
    <ConfirmDialogOverlay
      open={open}
      overlayId={OVERLAY_IDS.settings}
      onDismiss={onClose}
      title="设置"
      titleId="settings-dialog-title"
      bodyClassName="form-scope"
      panelClassName="settings-dialog-overlay"
    >
      <form className="settings-dialog settings-dialog-body" onSubmit={handleSubmit}>
        <label className="settings-field" htmlFor={intervalFieldId}>
          <span className="settings-field-label">自动保存间隔（秒）</span>
          <input
            id={intervalFieldId}
            type="number"
            min={30}
            max={3600}
            step={1}
            value={intervalDraft}
            onChange={(event) => setIntervalDraft(event.target.value)}
          />
        </label>
        <label className="settings-field" htmlFor={maxEntriesFieldId}>
          <span className="settings-field-label">最大自动保存项</span>
          <input
            id={maxEntriesFieldId}
            type="number"
            min={1}
            max={50}
            step={1}
            value={maxEntriesDraft}
            onChange={(event) => setMaxEntriesDraft(event.target.value)}
          />
        </label>
        <button type="button" className="secondary-button settings-autosave-list-button" onClick={handleOpenAutosaveList}>
          查看自动保存的内容
        </button>
        <div className="confirm-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary-button">
            保存
          </button>
        </div>
      </form>
    </ConfirmDialogOverlay>
  );
}
