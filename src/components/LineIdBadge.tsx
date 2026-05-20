import {
  generateLineIdBlockSvg,
  getLineIdBlockWidth,
  type NjMetroLineId,
} from '@kyuri-metro/njmetro-line-id-block-svg-generator';

import { lineIdFontStack } from '../fontStacks';

type LineIdBadgeProps = {
  lineId: string;
  color: string;
  /** 线路号数字颜色，对应 njmetro-palette 的 foreground */
  textColor?: string;
  height: number;
};

const baseHeight = 1000;

/** 与 @kyuri-metro/njmetro-line-id-block-svg-generator 支持的线路号一致（含 mn：20–99） */
const resolveLineNumber = (lineId: string): NjMetroLineId | null => {
  const normalized = lineId.trim().toUpperCase();

  if (/^S[0-9]$/.test(normalized)) {
    return normalized as `S${number}`;
  }

  if (/^(?:[0-9]|1\d|[2-9]\d)$/.test(normalized)) {
    return Number(normalized);
  }

  return null;
};

export const getLineIdBadgeWidth = (lineId: string, height: number) => {
  const lineNumber = resolveLineNumber(lineId);

  if (lineNumber === null) {
    return null;
  }

  return getLineIdBlockWidth(lineNumber, height);
};

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
