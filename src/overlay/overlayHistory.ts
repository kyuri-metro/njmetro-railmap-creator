/** `history.state` 上标记叠层条目的键，用于区分站内叠层与正常导航。 */
export const OVERLAY_HISTORY_STATE_KEY = 'overlayStack' as const;

export type OverlayHistoryState = {
  [OVERLAY_HISTORY_STATE_KEY]: string;
};

export function isOverlayHistoryState(state: unknown): state is OverlayHistoryState {
  return (
    typeof state === 'object' &&
    state !== null &&
    OVERLAY_HISTORY_STATE_KEY in state &&
    typeof (state as OverlayHistoryState)[OVERLAY_HISTORY_STATE_KEY] === 'string'
  );
}

export function pushOverlayHistoryState(overlayId: string) {
  const next: OverlayHistoryState = { [OVERLAY_HISTORY_STATE_KEY]: overlayId };
  history.pushState(next, '', window.location.href);
}
