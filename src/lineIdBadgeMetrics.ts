import {
  getLineIdBlockWidth,
  type NjMetroLineId,
} from '@kyuri-metro/njmetro-line-id-block-svg-generator';

/** 与 @kyuri-metro/njmetro-line-id-block-svg-generator 支持的线路号一致（含 mn：20–99） */
export const resolveLineNumber = (lineId: string): NjMetroLineId | null => {
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
