import { useLayoutEffect, useState } from 'react';

const DEFAULT_THRESHOLD_MS = 16;

/**
 * 每次 snapshot 更新：若在 thresholdMs 内尚未进入下一帧（requestAnimationFrame），则显示加载层；
 * 下一帧到达后清除。用于实时预览较重 SVG 时反馈“仍在绘制”。
 */
export function usePreviewLoadingOverlay<T>(snapshot: T, thresholdMs = DEFAULT_THRESHOLD_MS): boolean {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;
    const showTimer = window.setTimeout(() => {
      if (!cancelled) {
        setVisible(true);
      }
    }, thresholdMs);

    const rafId = window.requestAnimationFrame(() => {
      window.clearTimeout(showTimer);
      if (!cancelled) {
        setVisible(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);
      window.cancelAnimationFrame(rafId);
      setVisible(false);
    };
  }, [snapshot, thresholdMs]);

  return visible;
}
