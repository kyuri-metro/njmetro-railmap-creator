import { NJMETRO_LINE_COLORS } from '@kyuri-metro/njmetro-palette';

const normalizePaletteHex = (value: string) => {
  const cleaned = value.replace(/\s+/g, '').trim();

  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned.toLowerCase();
  }

  return cleaned;
};

const resolvePaletteKey = (lineId: string): keyof typeof NJMETRO_LINE_COLORS | null => {
  if (/^[0-9]$/.test(lineId)) {
    return Number(lineId) as keyof typeof NJMETRO_LINE_COLORS;
  }

  if (lineId === '11') {
    return 11;
  }

  if (/^1\d$/.test(lineId)) {
    return Number(lineId) as keyof typeof NJMETRO_LINE_COLORS;
  }

  if (/^S[0-9]$/.test(lineId)) {
    return lineId as keyof typeof NJMETRO_LINE_COLORS;
  }

  return null;
};

export const getNjmetroLineBackgroundColor = (lineId: string): string | null => {
  const normalized = lineId.trim().toUpperCase();
  const key = resolvePaletteKey(normalized);
  const entry = key === null ? undefined : NJMETRO_LINE_COLORS[key];

  if (!entry) {
    return null;
  }

  return normalizePaletteHex(entry.background);
};

export const getNjmetroLineForegroundColor = (lineId: string): string | null => {
  const normalized = lineId.trim().toUpperCase();
  const key = resolvePaletteKey(normalized);
  const entry = key === null ? undefined : NJMETRO_LINE_COLORS[key];

  if (!entry) {
    return null;
  }

  return normalizePaletteHex(entry.foreground);
};
