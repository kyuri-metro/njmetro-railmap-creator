declare module 'apcach' {
  export type ApcachContrastConfig = {
    bgColor: unknown;
    contrastModel: string;
    cr: number;
    fgColor: unknown;
    searchDirection: string;
  };

  export type ApcachColor = {
    alpha: number;
    chroma: number;
    colorSpace: string;
    contrastConfig: ApcachContrastConfig;
    hue: number;
    lightness: number;
  };

  export type MaxChromaFn = (
    contrastConfig: ApcachContrastConfig,
    hue: number,
    alpha: number,
    colorSpace: string,
  ) => ApcachColor;

  export function apcach(
    contrast: number | ApcachContrastConfig,
    chroma: number | MaxChromaFn,
    hue: number,
    alpha?: number,
    colorSpace?: string,
  ): ApcachColor;

  export function apcachToCss(color: ApcachColor, format: 'oklch' | 'hex' | 'rgb' | 'p3' | 'figma-p3'): string;

  export function crToBgBlack(
    cr: number,
    contrastModel?: string,
    searchDirection?: string,
  ): ApcachContrastConfig;

  export function cssToApcach(
    color: string,
    antagonist: { bg?: string; fg?: string },
    colorSpace?: string,
    contrastModel?: string,
  ): ApcachColor;

  export function maxChroma(chromaCap?: number): MaxChromaFn;
}
