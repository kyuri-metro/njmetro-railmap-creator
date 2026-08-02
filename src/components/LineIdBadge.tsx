import { generateLineIdBlockSvg, getLineIdBlockWidth } from '@kyuri-metro/njmetro-line-id-block-svg-generator';
import { lineIdFontStack } from '../fontStacks';
import { resolveLineNumber } from '../lineIdBadgeMetrics';

export { getLineIdBadgeWidth } from '../lineIdBadgeMetrics';

type LineIdBadgeProps = {
  lineId: string;
  color: string;
  /** 线路号数字颜色，对应 njmetro-palette 的 foreground */
  textColor?: string;
  height: number;
};

const baseHeight = 1000;

export function LineIdBadge({ lineId, color, textColor = '#ffffff', height }: LineIdBadgeProps) {
  const lineNumber = resolveLineNumber(lineId);

  if (lineNumber === null) {
    return null;
  }

  const logicalWidth = getLineIdBlockWidth(lineNumber, baseHeight);

  if (logicalWidth === null) {
    return null;
  }

  const scale = height / baseHeight;
  const svg = generateLineIdBlockSvg({
    background: color,
    fontFamily: lineIdFontStack,
    foreground: textColor,
    height: baseHeight,
    lineNumber,
  });
  const imageHref = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <image href={imageHref} width={logicalWidth} height={baseHeight} transform={`scale(${scale})`} />
  );
}
