import { useCallback, useEffect, useRef, useState } from 'react';

import type { SvgBox } from './svgPositioning';

const LINE_ID_GENERATOR_URL = 'https://njmetro-line-id-block-generator.umamichi.moe/';
const LINE_ID_NPM_URL = 'https://www.npmjs.com/package/@kyuri-metro/njmetro-line-id-block-svg-generator';

const HIDE_DELAY_MS = 220;

type LineIdBlockAttributionOverlayProps = {
  viewWidth: number;
  viewHeight: number;
  box: SvgBox;
};

/** 预览用 HTML 层：不参与 SVG 序列化（下载 / 放大预览仅含 svg）。 */
export function LineIdBlockAttributionOverlay({ viewWidth, viewHeight, box }: LineIdBlockAttributionOverlayProps) {
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
    <div className={`line-id-attribution-layer${tooltipVisible ? ' line-id-attribution-layer--tooltip-open' : ''}`}>
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
          <span className="line-id-attribution-ripple" aria-hidden />
          <span className="line-id-attribution-ripple line-id-attribution-ripple--delayed" aria-hidden />
          <span className="line-id-attribution-dot" aria-hidden />
        </div>
      </div>
      <div
        className={`line-id-attribution-tooltip${tooltipVisible ? ' is-visible' : ''}`}
        style={{
          left: `${leftPct}%`,
          top: `calc(${topPct + heightPct}% - 6px)`,
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHideTooltip}
        role="region"
        aria-label="线路号方块生成器与 NPM 包"
      >
        <p className="line-id-attribution-tooltip-line">
          南京地铁线路号方块生成器：
          <a href={LINE_ID_GENERATOR_URL} target="_blank" rel="noopener noreferrer">
            {LINE_ID_GENERATOR_URL}
          </a>
        </p>
        <p className="line-id-attribution-tooltip-line">
          也提供 NPM 包：
          <a href={LINE_ID_NPM_URL} target="_blank" rel="noopener noreferrer">
            @kyuri-metro/njmetro-line-id-block-svg-generator
          </a>
        </p>
      </div>
    </div>
  );
}
