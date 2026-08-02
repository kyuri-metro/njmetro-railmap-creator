/** 线路图吊板几何规格（viewBox `0 0 7412 800`）。 */

export const routeBadgeCanvas = {
  width: 7412,
  height: 800,
} as const;

export const routeBadgeLine = {
  centerY: 315.75,
  thickness: 46,
} as const;

export const routeBadgeStationRadii = {
  small: 17,
  endOuter: 33.5,
  endInner: 25.5,
  currentOuter: 37.5,
  currentInner: 28,
} as const;

export const routeBadgeDirectionArrow = {
  baseWidth: 340,
  baseHeight: 294.5,
  width: 355,
  gap: 105,
  path: 'm 145.5,0 h 71 L 99.5,119 H 340 v 55 H 100 l 120.5,120.5 h -74 L 0,148 Z',
} as const;

export const routeBadgeDirectionArrowScale =
  routeBadgeDirectionArrow.width / routeBadgeDirectionArrow.baseWidth;

export const routeBadgeLayoutOffsetX =
  (routeBadgeDirectionArrow.width + routeBadgeDirectionArrow.gap) / 2;

export const routeBadgeGaps = {
  topLabel: 11,
  bottomLabel: 11,
  topTransfer: 130.25,
  bottomTransfer: 142.75,
} as const;

export const routeBadgeCurrentCard = {
  connectorHeight: routeBadgeLine.thickness / 2 + 35.5,
  gap: 12.5,
  horizontalPadding: 23.5,
  topPadding: 12,
  bottomPadding: 10.5,
  accent: '#142966',
} as const;

export const routeBadgeTransferIcon = {
  viewBoxX: -10,
  viewBoxWidth: 797,
  viewBoxHeight: 1000,
  color: '#000000',
  path: 'M 494,1000 C 494,983 646,881 646,669 C 646,638 640,535 565,452 L 539,423 C 455,500 539,423 455,500 C 448,188 455,500 448,188 L 757,224 L 673,301 L 702,333 C 729,362 787,425 787,566 C 787,858 499,1000 494,1000 Z M 283,0 C 283,17 131,119 131,331 C 131,362 137,464 212,547 L 238,576 C 322,499 238,576 322,499 C 329,810 322,499 329,810 L 20,774 L 105,697 L 76,665 C 49,636 -10,573 -10,432 C -10,142 278,0 283,0 Z',
} as const;

export const routeBadgeTransferLineId = {
  gap: 12.5,
  badgeHeight: 68.5,
} as const;
