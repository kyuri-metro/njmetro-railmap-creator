import {
  getDirectionInitialTier,
  getDirectionLineLang,
  getDirectionMaxTier,
  getDirectionTierMeasureParams,
  type DirectionCondenseMove,
  type DirectionCondenseState,
  type DirectionLineKey,
} from './badgeTextCondense';
import { logDirectionCondenseSnapshot } from './directionCondenseDebug';
import {
  directionBadgeLineBadgeHeight,
  directionBadgeNextSectionGap,
  directionBadgeStationLabelGap,
  directionBadgeStationNameDefaultLetterSpacing,
  getDirectionSectionMaxTotalWidthForLineId,
  type DirectionLayoutConstraintSnapshot,
} from './directionBadgeLayout';
import { getLineIdBadgeWidth } from './components/LineIdBadge';
import {
  measureDirectionNextLabelWidth,
  measureDirectionStationEnWidth,
  measureDirectionStationZhWidth,
  measureDirectionToLabelWidth,
} from './measureBadgeText';

export const directionBadgeDefaultLetterSpacing = directionBadgeStationNameDefaultLetterSpacing;

const directionLineKeys: DirectionLineKey[] = ['toZh', 'toEn', 'nextZh', 'nextEn'];

const directionSections = {
  to: ['toZh', 'toEn'] as const,
  next: ['nextZh', 'nextEn'] as const,
};

export type ResolveDirectionCondenseParams = {
  direction: 'l' | 'r';
  lineId: string;
  toStation: { chName: string; enName: string };
  nextStation: { chName: string; enName: string };
};

export type ResolvedDirectionCondense = {
  tiers: DirectionCondenseState;
};

type DirectionCondenseNames = Record<DirectionLineKey, string>;

type DirectionCondenseCandidate = {
  move: DirectionCondenseMove;
  tiers: DirectionCondenseState;
  totalWidth: number;
};

const buildNames = (params: ResolveDirectionCondenseParams): DirectionCondenseNames => ({
  toZh: params.toStation.chName,
  toEn: params.toStation.enName,
  nextZh: params.nextStation.chName,
  nextEn: params.nextStation.enName,
});

const buildInitialTiers = (names: DirectionCondenseNames): DirectionCondenseState => ({
  toZh: getDirectionInitialTier(names.toZh, 'zh'),
  toEn: getDirectionInitialTier(names.toEn, 'en'),
  nextZh: getDirectionInitialTier(names.nextZh, 'zh'),
  nextEn: getDirectionInitialTier(names.nextEn, 'en'),
});

const getDefaultLetterSpacing = (key: DirectionLineKey) => directionBadgeDefaultLetterSpacing[key];

const measureLineWidth = (key: DirectionLineKey, name: string, tier: number) => {
  const lang = getDirectionLineLang(key);
  const defaultLetterSpacing = getDefaultLetterSpacing(key);
  const { letterSpacing, scaleX } = getDirectionTierMeasureParams(defaultLetterSpacing, lang, tier);

  return lang === 'zh'
    ? measureDirectionStationZhWidth(name, letterSpacing, scaleX)
    : measureDirectionStationEnWidth(name, letterSpacing, scaleX);
};

const measureStationBlockWidth = (zhKey: DirectionLineKey, enKey: DirectionLineKey, names: DirectionCondenseNames, tiers: DirectionCondenseState) =>
  Math.max(measureLineWidth(zhKey, names[zhKey], tiers[zhKey]), measureLineWidth(enKey, names[enKey], tiers[enKey]));

export const measureDirectionSectionTotalWidth = (names: DirectionCondenseNames, tiers: DirectionCondenseState) => {
  const toLabelWidth = measureDirectionToLabelWidth();
  const nextLabelWidth = measureDirectionNextLabelWidth();
  const toStationWidth = measureStationBlockWidth('toZh', 'toEn', names, tiers);
  const nextStationWidth = measureStationBlockWidth('nextZh', 'nextEn', names, tiers);

  return (
    toLabelWidth +
    directionBadgeStationLabelGap +
    toStationWidth +
    nextLabelWidth +
    directionBadgeNextSectionGap +
    nextStationWidth
  );
};

const canAdvanceTier = (key: DirectionLineKey, tiers: DirectionCondenseState) =>
  tiers[key] < getDirectionMaxTier(getDirectionLineLang(key));

const applySingleMove = (tiers: DirectionCondenseState, key: DirectionLineKey): DirectionCondenseState | null => {
  if (!canAdvanceTier(key, tiers)) {
    return null;
  }

  return { ...tiers, [key]: tiers[key] + 1 };
};

const applyPairMove = (tiers: DirectionCondenseState, section: 'to' | 'next'): DirectionCondenseState | null => {
  const [zhKey, enKey] = directionSections[section];
  const nextTiers = { ...tiers };
  let changed = false;

  if (canAdvanceTier(zhKey, tiers)) {
    nextTiers[zhKey] = tiers[zhKey] + 1;
    changed = true;
  }

  if (canAdvanceTier(enKey, tiers)) {
    nextTiers[enKey] = tiers[enKey] + 1;
    changed = true;
  }

  return changed ? nextTiers : null;
};

const buildConstraints = (direction: 'l' | 'r', lineId: string, totalWidth: number): DirectionLayoutConstraintSnapshot => {
  const maxTotalWidth = getDirectionSectionMaxTotalWidthForLineId(direction, lineId);

  return {
    maxTotalWidth,
    fits: totalWidth <= maxTotalWidth,
  };
};

const compareCandidates = (a: DirectionCondenseCandidate, b: DirectionCondenseCandidate) => {
  if (a.totalWidth !== b.totalWidth) {
    return a.totalWidth - b.totalWidth;
  }

  if (a.move.type !== b.move.type) {
    return a.move.type === 'single' ? -1 : 1;
  }

  if (a.move.type === 'single' && b.move.type === 'single') {
    return directionLineKeys.indexOf(a.move.key) - directionLineKeys.indexOf(b.move.key);
  }

  return 0;
};

const enumerateCandidates = (
  names: DirectionCondenseNames,
  tiers: DirectionCondenseState,
  currentTotalWidth: number,
): DirectionCondenseCandidate[] => {
  const candidates: DirectionCondenseCandidate[] = [];

  for (const key of directionLineKeys) {
    const nextTiers = applySingleMove(tiers, key);

    if (!nextTiers) {
      continue;
    }

    const totalWidth = measureDirectionSectionTotalWidth(names, nextTiers);

    if (totalWidth < currentTotalWidth) {
      candidates.push({ move: { type: 'single', key }, tiers: nextTiers, totalWidth });
    }
  }

  for (const section of ['to', 'next'] as const) {
    const [zhKey, enKey] = directionSections[section];
    const pairTiers = applyPairMove(tiers, section);

    if (!pairTiers) {
      continue;
    }

    const pairTotalWidth = measureDirectionSectionTotalWidth(names, pairTiers);

    if (pairTotalWidth >= currentTotalWidth) {
      continue;
    }

    const singleZhTiers = applySingleMove(tiers, zhKey);
    const singleEnTiers = applySingleMove(tiers, enKey);
    const singleZhWidth =
      singleZhTiers === null ? currentTotalWidth : measureDirectionSectionTotalWidth(names, singleZhTiers);
    const singleEnWidth =
      singleEnTiers === null ? currentTotalWidth : measureDirectionSectionTotalWidth(names, singleEnTiers);

    if (singleZhWidth >= currentTotalWidth && singleEnWidth >= currentTotalWidth) {
      candidates.push({ move: { type: 'pair', section }, tiers: pairTiers, totalWidth: pairTotalWidth });
    }
  }

  return candidates;
};

export const resolveDirectionCondense = (params: ResolveDirectionCondenseParams): ResolvedDirectionCondense => {
  const names = buildNames(params);
  const initialTiers = buildInitialTiers(names);
  let tiers = initialTiers;
  let totalWidth = measureDirectionSectionTotalWidth(names, tiers);
  const maxTotalWidth = getDirectionSectionMaxTotalWidthForLineId(params.direction, params.lineId);

  if (totalWidth === 0 || maxTotalWidth === 0) {
    return { tiers: initialTiers };
  }

  const greedySteps: Array<{ step: number; move: DirectionCondenseMove; totalWidth: number }> = [];
  let stoppedBecause: 'fits' | 'no-candidates' | 'no-improvement' = 'fits';

  if (totalWidth > maxTotalWidth) {
    let step = 0;

    while (totalWidth > maxTotalWidth) {
      const candidates = enumerateCandidates(names, tiers, totalWidth);

      if (candidates.length === 0) {
        stoppedBecause = 'no-candidates';
        break;
      }

      const best = candidates.sort(compareCandidates)[0];

      if (best.totalWidth >= totalWidth) {
        stoppedBecause = 'no-improvement';
        break;
      }

      tiers = best.tiers;
      totalWidth = best.totalWidth;
      step += 1;
      greedySteps.push({ step, move: best.move, totalWidth });

      if (totalWidth <= maxTotalWidth) {
        stoppedBecause = 'fits';
        break;
      }
    }
  }

  const lineBadgeWidth = getLineIdBadgeWidth(params.lineId, directionBadgeLineBadgeHeight) ?? 0;
  const maxTiers = Object.fromEntries(
    directionLineKeys.map((key) => [key, getDirectionMaxTier(getDirectionLineLang(key))]),
  ) as Record<DirectionLineKey, number>;
  const lineWidths = Object.fromEntries(
    directionLineKeys.map((key) => [key, measureLineWidth(key, names[key], tiers[key])]),
  ) as Record<DirectionLineKey, number>;

  logDirectionCondenseSnapshot({
    direction: params.direction,
    lineBadgeWidth,
    names,
    totalWidth,
    constraints: buildConstraints(params.direction, params.lineId, totalWidth),
    initialTiers,
    finalTiers: tiers,
    lineWidths,
    maxTiers,
    greedySteps,
    stoppedBecause,
  });

  return { tiers };
};
