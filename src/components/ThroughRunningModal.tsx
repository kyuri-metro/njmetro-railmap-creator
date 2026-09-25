import { useEffect, useRef, useState } from 'react';
import type { StationItem } from '../features/generatorSlice';
import { OVERLAY_IDS } from '../overlay/overlayIds';
import {
  validateThroughRunning,
  type ThroughRunningConfig,
  type ThroughRunningSegment,
} from '../throughRunning';
import { FullscreenOverlay } from '@umamichi-ui/common-components/overlay';

type ThroughRunningModalProps = Readonly<{
  open: boolean;
  stations: StationItem[];
  value: ThroughRunningConfig | null;
  onClose: () => void;
  onExited?: () => void;
  onSave: (value: ThroughRunningConfig | null) => void;
}>;

const createDefaultDraft = (stations: StationItem[]): ThroughRunningConfig => {
  const mid = stations[Math.floor(stations.length / 2)];
  return {
    segments: [{ lineId: '6' }, { lineId: 'S1' }],
    joinStationIds: [mid?.id ?? stations[1]?.id ?? ''],
  };
};

export function ThroughRunningModal({
  open,
  stations,
  value,
  onClose,
  onExited,
  onSave,
}: ThroughRunningModalProps) {
  const [enabled, setEnabled] = useState(value !== null);
  const [draft, setDraft] = useState<ThroughRunningConfig>(() => value ?? createDefaultDraft(stations));
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setEnabled(value !== null);
    setDraft(value ?? createDefaultDraft(stations));
    setError(null);
  }, [open, value, stations]);

  const joinCandidates = stations.filter(
    (_, index) => index > 0 && index < stations.length - 1,
  );

  const updateSegmentLineId = (index: number, lineId: string) => {
    setDraft((current) => ({
      ...current,
      segments: current.segments.map((segment, segmentIndex) =>
        segmentIndex === index ? { lineId } : segment,
      ),
    }));
  };

  const updateJoinId = (index: number, joinStationId: string) => {
    setDraft((current) => ({
      ...current,
      joinStationIds: current.joinStationIds.map((id, joinIndex) =>
        joinIndex === index ? joinStationId : id,
      ),
    }));
  };

  const addSegment = () => {
    setDraft((current) => {
      const joinId = joinCandidates[joinCandidates.length - 1]?.id ?? current.joinStationIds.at(-1) ?? '';
      return {
        segments: [...current.segments, { lineId: '' } satisfies ThroughRunningSegment],
        joinStationIds: [...current.joinStationIds, joinId],
      };
    });
  };

  const removeSegment = (index: number) => {
    setDraft((current) => {
      if (current.segments.length <= 2 || index !== current.segments.length - 1) {
        return current;
      }
      return {
        segments: current.segments.slice(0, -1),
        joinStationIds: current.joinStationIds.slice(0, -1),
      };
    });
  };

  const handleSave = () => {
    if (!enabled) {
      onSave(null);
      onClose();
      return;
    }

    const message = validateThroughRunning(draft, stations);
    if (message !== null) {
      setError(message);
      return;
    }

    onSave({
      segments: draft.segments.map((segment) => ({ lineId: segment.lineId.trim() })),
      joinStationIds: [...draft.joinStationIds],
    });
    onClose();
  };

  return (
    <FullscreenOverlay
      open={open}
      overlayId={OVERLAY_IDS.throughRunning}
      onDismiss={onClose}
      onExited={onExited}
      title="贯通运营"
      titleId="through-running-modal-title"
      size="page"
      closeAriaLabel="关闭弹窗"
      initialFocusRef={firstFieldRef}
      panelClassName="station-form-overlay"
      bodyClassName="form-scope station-form-overlay-body"
    >
      <div className="modal-toolbar">
        <button type="button" className="primary-button" onClick={handleSave}>
          保存
        </button>
        <button type="button" className="outline-button" onClick={onClose}>
          取消
        </button>
      </div>

      <hr className="dialog-section-rule" />

      <label className="field-label field-label-checkbox">
        <input
          ref={firstFieldRef}
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>启用贯通运营</span>
      </label>

      {enabled ? (
        <>
          <p className="hint-text">按站序从首站到末站排列各段；相邻段之间选择接续站。</p>

          {draft.segments.map((segment, index) => (
            <div key={`segment-${index}`} className="through-running-segment-row">
              <label className="field-label">
                <span>第 {index + 1} 段线路编号</span>
                <input
                  className="text-input"
                  type="text"
                  value={segment.lineId}
                  onChange={(event) => updateSegmentLineId(index, event.target.value)}
                />
              </label>
              {draft.segments.length > 2 && index === draft.segments.length - 1 ? (
                <button type="button" className="outline-button" onClick={() => removeSegment(index)}>
                  删除此段
                </button>
              ) : null}
              {index < draft.joinStationIds.length ? (
                <label className="field-label">
                  <span>接续站（段 {index + 1} 与段 {index + 2}）</span>
                  <select
                    className="select-input"
                    value={draft.joinStationIds[index]}
                    onChange={(event) => updateJoinId(index, event.target.value)}
                  >
                    {joinCandidates.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.chName} ({station.id})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ))}

          <button type="button" className="outline-button" onClick={addSegment}>
            添加一段
          </button>
        </>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}
    </FullscreenOverlay>
  );
}
