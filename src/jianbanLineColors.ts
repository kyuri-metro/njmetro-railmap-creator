import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from './njmetroLinePalette';

/**
 * 简办动态演示线网的虚拟参考色（规划新线，非正式公布配色）；不进入 `getNjmetroLine*` 自动填色。
 * 来源说明：docs/builtin-jianban-attribution.md
 */
const jianbanUnofficialLineColors: Record<string, { background: string; foreground: string }> = {
  '16': { background: '#ff7900', foreground: '#ffffff' },
  '18': { background: '#f77ab4', foreground: '#ffffff' },
};

const getJianbanUnofficialLineBackgroundColor = (lineIdRaw: string): string | null => {
  const lineId = lineIdRaw.trim().toUpperCase();
  return jianbanUnofficialLineColors[lineId]?.background ?? null;
};

const getJianbanUnofficialLineForegroundColor = (lineIdRaw: string): string | null => {
  const lineId = lineIdRaw.trim().toUpperCase();
  return jianbanUnofficialLineColors[lineId]?.foreground ?? null;
};

/** 简办站点烘焙 / 按简办线路填充时的配色：先已开通线网官方色，再简办虚拟参考色。 */
export const resolveJianbanLineBackgroundColor = (lineId: string): string | null =>
  getNjmetroLineBackgroundColor(lineId) ?? getJianbanUnofficialLineBackgroundColor(lineId);

export const resolveJianbanLineForegroundColor = (lineId: string): string | null =>
  getNjmetroLineForegroundColor(lineId) ?? getJianbanUnofficialLineForegroundColor(lineId);
