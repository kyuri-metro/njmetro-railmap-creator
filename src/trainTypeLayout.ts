/** 吊板车型与对应画布逻辑宽度（高度一律 800）。 */

export const TRAIN_TYPES = ['a', 'b', 'b-long', 'suburban-d'] as const;

export type TrainType = (typeof TRAIN_TYPES)[number];

export const DEFAULT_TRAIN_TYPE: TrainType = 'a';

export const TRAIN_TYPE_OPTIONS = [
  { value: 'a', label: 'A型' },
  { value: 'b', label: 'B型' },
  { value: 'b-long', label: 'B型（长线路图）' },
  { value: 'suburban-d', label: '市域D型' },
] as const satisfies ReadonlyArray<{ value: TrainType; label: string }>;

export type BadgeCanvasSizes = {
  currentStation: number;
  direction: number;
  route: number;
  height: number;
};

const BADGE_CANVAS_BY_TRAIN_TYPE: Record<TrainType, BadgeCanvasSizes> = {
  a: {
    currentStation: 3322,
    direction: 3972,
    route: 7412,
    height: 800,
  },
  b: {
    currentStation: 3322,
    direction: 4602,
    route: 4602,
    height: 800,
  },
  'b-long': {
    currentStation: 3322,
    direction: 4602,
    route: 4602 + 3322,
    height: 800,
  },
  'suburban-d': {
    currentStation: 2730,
    direction: 5100,
    route: 5120,
    height: 800,
  },
};

export const isTrainType = (raw: unknown): raw is TrainType =>
  typeof raw === 'string' && (TRAIN_TYPES as readonly string[]).includes(raw);

export const getBadgeCanvasSizes = (trainType: TrainType = DEFAULT_TRAIN_TYPE): BadgeCanvasSizes =>
  BADGE_CANVAS_BY_TRAIN_TYPE[trainType];

/** 切换车型时按线路图画布宽度差同量调整 totalLength，下限钳到 0。 */
export const adjustTotalLengthForTrainTypeChange = (
  previousType: TrainType,
  nextType: TrainType,
  totalLength: number,
): number => {
  if (previousType === nextType) {
    return Math.max(0, Math.trunc(totalLength));
  }

  const delta = getBadgeCanvasSizes(nextType).route - getBadgeCanvasSizes(previousType).route;
  return Math.max(0, Math.trunc(totalLength) + delta);
};
