import { apcach, apcachToCss, crToBgBlack, cssToApcach, maxChroma } from 'apcach';
import {
  DEFAULT_LINE_THEME_HUE,
  HARMONIZER_THEME_LEVELS,
  type HarmonizerThemeLevel,
  type HarmonizerThemeLevelSpec,
} from './lineThemeHarmonizerLevels';

const HEX6 = /^#[0-9a-fA-F]{6}$/;

type ApcachColor = ReturnType<typeof apcach>;

const paletteCache = new Map<number, ApcachColor[]>();

const supportsOklchColor = () =>
  typeof CSS !== 'undefined' && CSS.supports('color', 'oklch(0% 0 0)');

export function extractThemeHueFromIdColor(idColor: string): number {
  if (!HEX6.test(idColor)) {
    return DEFAULT_LINE_THEME_HUE;
  }

  try {
    const parsed = cssToApcach(idColor, { bg: '#000000' });
    if (!Number.isFinite(parsed.hue)) {
      return DEFAULT_LINE_THEME_HUE;
    }
    return parsed.hue;
  } catch {
    return DEFAULT_LINE_THEME_HUE;
  }
}

const composeThemeLevel = (hue: number, spec: HarmonizerThemeLevelSpec): ApcachColor => {
  const chroma = maxChroma(spec.chromaCap);

  if (spec.refBackground === 'black') {
    return apcach(crToBgBlack(spec.apca), chroma, hue, 100, 'p3');
  }

  return apcach(spec.apca, chroma, hue, 100, 'p3');
};

const getCachedApcachPalette = (hue: number): ApcachColor[] => {
  const cacheKey = Math.round(hue);

  if (!paletteCache.has(cacheKey)) {
    paletteCache.set(
      cacheKey,
      HARMONIZER_THEME_LEVELS.map((spec) => composeThemeLevel(cacheKey, spec)),
    );
  }

  return paletteCache.get(cacheKey)!;
};

export function buildLineThemePaletteCss(hue: number): Record<HarmonizerThemeLevel, string> {
  const preferOklch = supportsOklchColor();
  const colors = getCachedApcachPalette(hue);
  const out = {} as Record<HarmonizerThemeLevel, string>;

  HARMONIZER_THEME_LEVELS.forEach((spec, index) => {
    const color = colors[index]!;
    out[spec.level] = apcachToCss(color, preferOklch ? 'oklch' : 'hex');
  });

  return out;
}

export function applyLineThemePalette(root: HTMLElement, idColor: string): void {
  const hue = extractThemeHueFromIdColor(idColor);
  const palette = buildLineThemePaletteCss(hue);

  for (const spec of HARMONIZER_THEME_LEVELS) {
    root.style.setProperty(`--theme-${spec.level}`, palette[spec.level]);
  }
}

export function clearLineThemePaletteOverrides(root: HTMLElement): void {
  for (const spec of HARMONIZER_THEME_LEVELS) {
    root.style.removeProperty(`--theme-${spec.level}`);
  }
}
