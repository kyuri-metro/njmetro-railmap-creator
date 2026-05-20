/** 叠层 z-index：1010 + 栈内序号 × 10（序号从 0 起） */
export const OVERLAY_Z_BASE = 1010;
export const OVERLAY_Z_STEP = 10;

export type OverlayStackEntry = {
  id: string;
  onDismiss: () => void;
  dismissOnEscape: boolean;
};

export const computeOverlayZIndex = (stackIndex: number) => OVERLAY_Z_BASE + stackIndex * OVERLAY_Z_STEP;
