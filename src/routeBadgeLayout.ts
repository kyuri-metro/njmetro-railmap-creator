import { getBadgeCanvasSizes } from './trainTypeLayout';

/** 线路图 A 型几何规格（版式常量以该 viewBox 为基准；运行时宽见 `getBadgeCanvasSizes().route`）。 */

const aTypeBadgeCanvas = getBadgeCanvasSizes('a');

export const routeBadgeCanvas = {
  width: aTypeBadgeCanvas.route,
  height: aTypeBadgeCanvas.height,
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
  gap: 18.75,
  badgeHeight: 75,
} as const;

/** 贯通运营段端标记与角标（对照 docs/6-s1 express 模板）。 */
export const routeBadgeThroughRunning = {
  badgeHeight: routeBadgeTransferLineId.badgeHeight,
  /** 双块之间 gap = 0.4 × badgeHeight */
  pairGap: routeBadgeTransferLineId.badgeHeight * 0.4,
  /** badge ↔ chevron：单数宽线号 */
  gap1digit: 31,
  /** badge ↔ chevron：双数宽线号（含 S*） */
  gap2digits: 19.5,
  chevronPath: 'M 30,0 H 40 V 40 H 0 V 30 H 30 Z',
  chevronLocalSize: 40,
  chevronScale: 0.45661385,
  chevronRotateLeft: 135,
  chevronRotateRight: -45,
  chevronStep: 19.5,
  chevronOpacities: [1, 0.5, 0.25] as const,
  /** 有贯通分段时，运行线与方向箭头相对默认 centerY 下移（模板站心 351.75 − 默认 315.75） */
  lineOffsetY: 36,
  /** 段端线号块竖直中心相对站心（模板块中心 157.5 − 站心 351.75） */
  markerCenterYOffset: -194.25,
  noticeInsetX: 66.488281,
  noticeFontSize: 52.7335,
  noticeBaselineY: 746.39014,
} as const;

