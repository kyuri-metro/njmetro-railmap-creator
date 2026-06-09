export type BadgeTextCondenseConfig = {
  letterSpacing: number | undefined;
  transform: string | undefined;
};

const scaleTransform = (scaleX: number): string => `scale(${scaleX}, 1)`;

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
): BadgeTextCondenseConfig => {
  if (name.length >= 7) {
    return { letterSpacing: 12, transform: scaleTransform(0.825) };
  }

  return { letterSpacing: defaultLetterSpacing, transform: undefined };
};

export const getDirectionStationEnCondense = (
  name: string,
  defaultLetterSpacing: number,
): BadgeTextCondenseConfig => {
  if (name.length >= 26) {
    return { letterSpacing: 0, transform: scaleTransform(0.8) };
  }

  if (name.length >= 23) {
    return { letterSpacing: 0, transform: scaleTransform(0.815) };
  }

  return { letterSpacing: defaultLetterSpacing, transform: undefined };
};
