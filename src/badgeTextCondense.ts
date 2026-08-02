export type BadgeTextCondenseConfig = {
  letterSpacing: number | undefined;
  transform: string | undefined;
};

export type DirectionLineKey = 'toZh' | 'toEn' | 'nextZh' | 'nextEn';
export type DirectionCondenseState = Record<DirectionLineKey, number>;
export type DirectionCondenseMove =
  | { type: 'single'; key: DirectionLineKey }
  | { type: 'pair'; section: 'to' | 'next' };

type DirectionLang = 'zh' | 'en';

const scaleTransform = (scaleX: number): string => `scale(${scaleX}, 1)`;

const directionZhTierParams = [
  { letterSpacing: undefined as number | undefined, scaleX: 1 },
  { letterSpacing: 12, scaleX: 0.825 },
] as const;

const directionEnTierParams = [
  { letterSpacing: undefined as number | undefined, scaleX: 1 },
  { letterSpacing: 0, scaleX: 0.815 },
  { letterSpacing: 0, scaleX: 0.8 },
] as const;

export const getDirectionLineLang = (key: DirectionLineKey): DirectionLang =>
  key === 'toZh' || key === 'nextZh' ? 'zh' : 'en';

export const getDirectionMaxTier = (lang: DirectionLang): number =>
  lang === 'zh' ? directionZhTierParams.length - 1 : directionEnTierParams.length - 1;

export const getDirectionInitialTier = (name: string, lang: DirectionLang): number => {
  if (lang === 'zh') {
    return name.length >= 7 ? 1 : 0;
  }

  if (name.length >= 26) {
    return 2;
  }

  if (name.length >= 23) {
    return 1;
  }

  return 0;
};

export const getDirectionTierMeasureParams = (
  defaultLetterSpacing: number,
  lang: DirectionLang,
  tier: number,
): { letterSpacing: number; scaleX: number } => {
  const tierParams = lang === 'zh' ? directionZhTierParams : directionEnTierParams;
  const clampedTier = Math.min(Math.max(tier, 0), tierParams.length - 1);
  const { letterSpacing, scaleX } = tierParams[clampedTier];

  return {
    letterSpacing: letterSpacing ?? defaultLetterSpacing,
    scaleX,
  };
};

export const getDirectionStationCondenseFromTier = (
  defaultLetterSpacing: number,
  lang: DirectionLang,
  tier: number,
): BadgeTextCondenseConfig => {
  const { letterSpacing, scaleX } = getDirectionTierMeasureParams(defaultLetterSpacing, lang, tier);

  return {
    letterSpacing,
    transform: scaleX === 1 ? undefined : scaleTransform(scaleX),
  };
};

export const getCurrentStationBadgeZhCondense = (
  name: string,
  defaultLetterSpacing: number,
): BadgeTextCondenseConfig => {
  if (name.length >= 7) {
    return { letterSpacing: 0, transform: scaleTransform(0.885) };
  }

  return { letterSpacing: defaultLetterSpacing, transform: undefined };
};

export const getCurrentStationBadgeEnCondense = (
  name: string,
  defaultLetterSpacing: number,
): BadgeTextCondenseConfig => {
  if (name.length >= 23) {
    return { letterSpacing: 0, transform: scaleTransform(0.855) };
  }

  return { letterSpacing: defaultLetterSpacing, transform: undefined };
};

export const getDirectionStationZhCondense = (
  name: string,
  defaultLetterSpacing: number,
): BadgeTextCondenseConfig =>
  getDirectionStationCondenseFromTier(defaultLetterSpacing, 'zh', getDirectionInitialTier(name, 'zh'));

export const getDirectionStationEnCondense = (
  name: string,
  defaultLetterSpacing: number,
): BadgeTextCondenseConfig =>
  getDirectionStationCondenseFromTier(defaultLetterSpacing, 'en', getDirectionInitialTier(name, 'en'));

/** 线路图吊板站名压缩（与方向吊板阈值相近，但缩放系数独立）。 */
export const getRouteZhNameCondense = (name: string): BadgeTextCondenseConfig => {
  if (name.length >= 14) {
    return { letterSpacing: 0, transform: scaleTransform(0.5) };
  }

  if (name.length >= 7) {
    return { letterSpacing: 0, transform: scaleTransform(0.8) };
  }

  return { letterSpacing: 4, transform: undefined };
};
