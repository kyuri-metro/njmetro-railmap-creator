import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { SvgBox } from './svgPositioning';

const HIDE_DELAY_MS = 220;

type PreviewHintRingOverlayProps = Readonly<{
  viewWidth: number;
  viewHeight: number;
  box: SvgBox;
  ariaLabel: string;
  children: ReactNode;
}>;

/** 预览用 HTML 提示圆环：不参与 SVG 序列化（下载 / 放大预览仅含 svg）。 */
export function PreviewHintRingOverlay({
  viewWidth,
  viewHeight,
  box,
  ariaLabel,
  children,
}: PreviewHintRingOverlayProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showTooltip = useCallback(() => {
    clearHideTimer();
    setTooltipVisible(true);
  }, [clearHideTimer]);

  const scheduleHideTooltip = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const leftPct = (box.x / viewWidth) * 100;
  const topPct = (box.y / viewHeight) * 100;
  const widthPct = (box.width / viewWidth) * 100;
  const heightPct = (box.height / viewHeight) * 100;

  return (
    <div className="line-id-attribution-layer">
      <div
        className="line-id-attribution-anchor"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
        }}
      >
        <div
          className="line-id-attribution-hit"
          onMouseEnter={showTooltip}
          onMouseLeave={scheduleHideTooltip}
        >
          <span className="line-id-attribution-dot" aria-hidden />
        </div>
      </div>
      <section
        className={`line-id-attribution-tooltip${tooltipVisible ? ' is-visible' : ''}`}
        style={{
          left: `${leftPct}%`,
          top: `calc(${topPct + heightPct}% - 6px)`,
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHideTooltip}
        aria-label={ariaLabel}
      >
        {children}
      </section>
    </div>
  );
}
