import { useEffect, useState } from 'react';
import type { DetectableFontFamily, FontDetectionResult } from '../fontSignature';

type FontDetectionState = 'idle' | 'checking' | 'done';

type FontDetectionHubTilesProps = {
  results: FontDetectionResult[];
  detectionState: FontDetectionState;
};

const FLIP_STAGGER_MS = 200;

const FONT_TILE_TITLES: Record<DetectableFontFamily, string> = {
  'Microsoft YaHei': '微软雅黑',
  'FZHei-B01': '方正黑体',
  Helvetica: 'Helvetica',
};

const getStatusLabel = (detectionState: FontDetectionState, detected: boolean) => {
  if (detectionState !== 'done') {
    return '正在检测';
  }

  return detected ? '已检测到' : '未检测到';
};

type FontDetectionHubTileProps = {
  result: FontDetectionResult;
  detectionState: FontDetectionState;
  index: number;
};

const FontDetectionHubTile = ({ result, detectionState, index }: FontDetectionHubTileProps) => {
  const title = FONT_TILE_TITLES[result.fontFamily];
  const [isFlipped, setIsFlipped] = useState(false);
  const isPending = detectionState !== 'done';

  useEffect(() => {
    if (detectionState !== 'done') {
      setIsFlipped(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsFlipped(true);
    }, index * FLIP_STAGGER_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [detectionState, index]);

  const statusLabel = getStatusLabel(detectionState, result.detected);
  const ariaLabel = `${title}（${result.fontFamily}）：${statusLabel}`;

  return (
    <article
      className="font-hub-tile"
      data-visual-state={isFlipped ? 'flipped' : 'expanded'}
      data-detected={result.detected ? 'true' : 'false'}
      data-checking={isPending ? 'true' : 'false'}
      role="listitem"
      aria-label={ariaLabel}
    >
      <div className="font-hub-tile__viewport">
        <div className="font-hub-tile__face font-hub-tile__face--front">
          <p className="font-hub-tile__status" aria-hidden="true">
            {isPending ? '正在检测' : '\u00a0'}
          </p>
          <p className="font-hub-tile__title" aria-hidden="true">
            {title}
          </p>
        </div>
        <div className="font-hub-tile__face font-hub-tile__face--back" aria-hidden={!isFlipped}>
          <p className="font-hub-tile__status">{statusLabel}</p>
          <p className="font-hub-tile__back-title">{result.fontFamily}</p>
        </div>
      </div>
    </article>
  );
};

export const FontDetectionHubTiles = ({ results, detectionState }: FontDetectionHubTilesProps) => (
  <div
    className="font-detection-tiles"
    role="list"
    aria-label="字体检测结果"
    aria-busy={detectionState !== 'done'}
    aria-live="polite"
  >
    {results.map((result, index) => (
      <FontDetectionHubTile key={result.fontFamily} result={result} detectionState={detectionState} index={index} />
    ))}
  </div>
);
