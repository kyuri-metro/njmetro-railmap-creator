import { generateLineIdBlockSvg, type NjMetroLineId } from '@kyuri-metro/njmetro-line-id-block-svg-generator';

import { lineIdFontStack } from '../fontStacks';

type LineIdBadgeProps = {
  lineId: string;
  color: string;
  /** 线路号数字颜色，对应 njmetro-palette 的 foreground */
  textColor?: string;
  height: number;
};

type SupportedBadgeTemplate =
  | {
      kind: 'n';
      width: number;
      digit: string;
    }
  | {
      kind: '11';
      width: number;
    }
  | {
      kind: '1n';
      width: number;
      digit: string;
    }
  | {
      kind: 'Sn';
      width: number;
      digit: string;
    };

const baseHeight = 1000;

const resolveBadgeTemplate = (lineId: string): SupportedBadgeTemplate | null => {
  if (/^[0-9]$/.test(lineId)) {
    return { kind: 'n', width: 500, digit: lineId };
  }

  if (lineId === '11') {
    return { kind: '11', width: 1000 };
  }

  if (/^1\d$/.test(lineId)) {
    return { kind: '1n', width: 1000, digit: lineId[1] };
  }

  if (/^S[0-9]$/.test(lineId)) {
    return { kind: 'Sn', width: 1000, digit: lineId[1] };
  }

  return null;
};

const resolveLineNumber = (lineId: string): NjMetroLineId | null => {
  if (/^S[0-9]$/.test(lineId)) {
    return lineId as `S${number}`;
  }

  if (/^[0-9]$/.test(lineId) || lineId === '11' || /^1\d$/.test(lineId)) {
    return Number(lineId);
  }

  return null;
};

export const getLineIdBadgeWidth = (lineId: string, height: number) => {
  const template = resolveBadgeTemplate(lineId);

  if (!template) {
    return null;
  }

  return (template.width / baseHeight) * height;
};

export function LineIdBadge({ lineId, color, textColor = '#ffffff', height }: LineIdBadgeProps) {
  const template = resolveBadgeTemplate(lineId);
  const lineNumber = resolveLineNumber(lineId);

  if (!template || lineNumber === null) {
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
    <image href={imageHref} width={template.width} height={baseHeight} transform={`scale(${scale})`} />
  );
}