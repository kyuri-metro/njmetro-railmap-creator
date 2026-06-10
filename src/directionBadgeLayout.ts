import { getLineIdBadgeWidth } from './components/LineIdBadge';

export const directionBadgeWidth = 3972;
export const directionBadgeLineBadgeHeight = 297.5;
export const directionBadgeLeftMargin = 171;
export const directionBadgeRightMargin = 167.5;
export const directionBadgeArrowWidth = 340;
export const directionBadgeArrowGap = 81;
export const directionBadgeStationLabelGap = 92;
export const directionBadgeNextSectionGap = 109;
export const directionBadgeLineBadgeGap = 82;

export type DirectionLayoutConstraintSnapshot = {
  maxTotalWidth: number;
  fits: boolean;
};

export const getDirectionSectionMaxTotalWidth = (direction: 'l' | 'r', lineBadgeWidth: number) => {
  if (direction === 'l') {
    const sectionLeft =
      directionBadgeLeftMargin +
      directionBadgeArrowWidth +
      directionBadgeArrowGap +
      lineBadgeWidth +
      directionBadgeLineBadgeGap;

    return directionBadgeWidth - directionBadgeRightMargin - sectionLeft;
  }

  const sectionLeft =
    directionBadgeLeftMargin +
    directionBadgeArrowWidth +
    directionBadgeArrowGap;

  return (
    directionBadgeWidth -
    directionBadgeRightMargin -
    sectionLeft -
    lineBadgeWidth -
    directionBadgeLineBadgeGap
  );
};

export const getDirectionSectionMaxTotalWidthForLineId = (direction: 'l' | 'r', lineId: string) => {
  const lineBadgeWidth = getLineIdBadgeWidth(lineId, directionBadgeLineBadgeHeight) ?? 0;

  return getDirectionSectionMaxTotalWidth(direction, lineBadgeWidth);
};
