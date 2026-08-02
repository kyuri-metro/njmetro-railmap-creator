import { getLineIdBadgeWidth } from './lineIdBadgeMetrics';

/** 方向吊板 SVG 几何规格（主稿 viewBox `0 0 3972 800`）。 */

export const directionBadgeCanvas = {
  width: 3972,
  height: 800,
} as const;

export const directionBadgeChrome = {
  buttonLineHeight: 157.5,
} as const;

export const directionBadgeMargins = {
  left: 171,
  right: 167.5,
} as const;

export const directionBadgeGaps = {
  arrow: 81,
  stationLabel: 92,
  nextSection: 109,
  lineBadge: 82,
} as const;

export const directionBadgeArrow = {
  width: 340,
  rightwardTranslateY: 294.5,
  path: 'm 145.5,0 h 71 L 99.5,119 H 340 v 55 H 100 l 120.5,120.5 h -74 L 0,148 Z',
} as const;

export const directionBadgeLineBadge = {
  height: 297.5,
  top: 218,
} as const;

export const directionBadgeTerminusLayout = {
  lineBadgeLeft: 539.5,
  lineNameTop: 176.5,
  terminusLabelRightGap: 538.5,
  terminusLabelTop: 174,
} as const;

export const directionBadgeAnchors = {
  arrowTop: 219,
  toLabelTop: 311.5,
  nextLabelTop: 313.5,
  toStationTop: 174,
  nextStationTop: 176.5,
} as const;

export type DirectionBadgeStackedTextLayout = {
  zhFontSize: string;
  zhBaselineY: number;
  enFontSize: string;
  enBaselineY: number;
};

export const directionBadgeStationNameText = {
  zhFontSize: 195.5,
  enFontSize: 82.5,
} as const;

/** 站名 tier 0 默认字距（to / next 各中英一行）。 */
export const directionBadgeStationNameDefaultLetterSpacing = {
  toZh: 11,
  toEn: 2,
  nextZh: 10.5,
  nextEn: 0.5,
} as const;

export const directionBadgeStationNameTextLayout = {
  to: {
    zhFontSize: '195.5px',
    zhBaselineY: 103,
    enFontSize: '82.5px',
    enBaselineY: 238.5,
  },
  next: {
    zhFontSize: '195.5px',
    zhBaselineY: 104.5,
    enFontSize: '82.5px',
    enBaselineY: 240,
  },
} as const satisfies Record<'to' | 'next', DirectionBadgeStackedTextLayout>;

type DirectionBadgeLabelLineSpec = {
  fontSize: number;
  x: number;
  y: number;
  letterSpacing: number;
};

export const directionBadgeLabelText = {
  to: {
    zh: { fontSize: 115.5, x: 0, y: 155.5, letterSpacing: 6 },
    en: { fontSize: 55.5, x: 10, y: 238.5, letterSpacing: 3.5 },
  },
  next: {
    zh: { fontSize: 115.5, x: 0, y: 157.5, letterSpacing: 8 },
    en: { fontSize: 55.5, x: 11.5, y: 241, letterSpacing: 3.5 },
  },
  lineName: {
    zh: { letterSpacing: directionBadgeStationNameDefaultLetterSpacing.toZh },
    en: { letterSpacing: directionBadgeStationNameDefaultLetterSpacing.toEn },
  },
  terminus: {
    zh: { letterSpacing: directionBadgeStationNameDefaultLetterSpacing.nextZh },
    en: { letterSpacing: directionBadgeStationNameDefaultLetterSpacing.nextEn },
  },
} as const satisfies Record<string, Record<string, Partial<DirectionBadgeLabelLineSpec>>>;

export const directionBadgeWidth = directionBadgeCanvas.width;
export const directionBadgeLineBadgeHeight = directionBadgeLineBadge.height;
export const directionBadgeLeftMargin = directionBadgeMargins.left;
export const directionBadgeRightMargin = directionBadgeMargins.right;
export const directionBadgeArrowWidth = directionBadgeArrow.width;
export const directionBadgeArrowGap = directionBadgeGaps.arrow;
export const directionBadgeStationLabelGap = directionBadgeGaps.stationLabel;
export const directionBadgeNextSectionGap = directionBadgeGaps.nextSection;
export const directionBadgeLineBadgeGap = directionBadgeGaps.lineBadge;

export type DirectionLayoutConstraintSnapshot = {
  maxTotalWidth: number;
  fits: boolean;
};

export const getDirectionSectionMaxTotalWidth = (direction: 'l' | 'r', lineBadgeWidth: number) => {
  if (direction === 'l') {
    const sectionLeft =
      directionBadgeMargins.left +
      directionBadgeArrow.width +
      directionBadgeGaps.arrow +
      lineBadgeWidth +
      directionBadgeGaps.lineBadge;

    return directionBadgeCanvas.width - directionBadgeMargins.right - sectionLeft;
  }

  const sectionLeft =
    directionBadgeMargins.left + directionBadgeArrow.width + directionBadgeGaps.arrow;

  return (
    directionBadgeCanvas.width -
    directionBadgeMargins.right -
    sectionLeft -
    lineBadgeWidth -
    directionBadgeGaps.lineBadge
  );
};

export const getDirectionSectionMaxTotalWidthForLineId = (direction: 'l' | 'r', lineId: string) => {
  const lineBadgeWidth = getLineIdBadgeWidth(lineId, directionBadgeLineBadge.height) ?? 0;

  return getDirectionSectionMaxTotalWidth(direction, lineBadgeWidth);
};
