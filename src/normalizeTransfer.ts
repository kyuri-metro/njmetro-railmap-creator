import { getNjmetroLineForegroundColor } from './njmetroLinePalette';
import type { TransferLine } from './features/generatorSlice';

const isHex6 = (raw: string) => /^#[0-9a-fA-F]{6}$/.test(raw);

/** 规范化换乘线路：补齐 / 校正 textColor，空 id 丢弃。表单路径可对 color 做兜底。 */
export const normalizeTransferLine = (
  line: Pick<TransferLine, 'id' | 'color'> & { textColor?: string },
  options?: { fallbackColor?: string },
): TransferLine | null => {
  const id = line.id.trim();

  if (!id) {
    return null;
  }

  const color = isHex6(line.color)
    ? line.color.toLowerCase()
    : (options?.fallbackColor ?? '#8c989f').toLowerCase();

  const textFromEntry = line.textColor && isHex6(line.textColor) ? line.textColor.toLowerCase() : null;
  const textColor = textFromEntry ?? getNjmetroLineForegroundColor(id) ?? '#ffffff';

  return { id, color, textColor };
};

export const normalizeTransferLines = (
  lines: Array<Pick<TransferLine, 'id' | 'color'> & { textColor?: string }>,
  options?: { fallbackColor?: string },
): TransferLine[] =>
  lines
    .map((line) => normalizeTransferLine(line, options))
    .filter((line): line is TransferLine => line !== null);
