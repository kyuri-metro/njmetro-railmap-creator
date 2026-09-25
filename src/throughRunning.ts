import { resolveLineNumber } from './lineIdBadgeMetrics';
import type { StationItem, TrainDirection } from './features/generatorSlice';

export type ThroughRunningSegment = {
  lineId: string;
};

export type ThroughRunningConfig = {
  segments: ThroughRunningSegment[];
  joinStationIds: string[];
};

export type SegmentEndSide = 'towardStart' | 'towardEnd';

export type SegmentEndBlock = {
  stationIndex: number;
  lineId: string;
  side: SegmentEndSide;
  mode: 'solo' | 'pair';
};

export type SegmentRange = {
  segmentIndex: number;
  lineId: string;
  lo: number;
  hi: number;
};

export const reverseThroughRunning = (config: ThroughRunningConfig): ThroughRunningConfig => ({
  segments: [...config.segments].reverse(),
  joinStationIds: [...config.joinStationIds].reverse(),
});

export const validateThroughRunning = (
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): string | null => {
  if (config.segments.length < 2) {
    return '贯通运营至少需要两段线路。';
  }
  if (config.joinStationIds.length !== config.segments.length - 1) {
    return '接续站数量须比段数少 1。';
  }
  if (stations.length < 3) {
    return '贯通运营至少需要三个站点。';
  }

  let prevIndex = -1;
  for (const joinId of config.joinStationIds) {
    const index = stations.findIndex((station) => station.id === joinId);
    if (index === -1) {
      return `接续站不存在：${joinId}`;
    }
    if (index === 0 || index === stations.length - 1) {
      return '接续站不能是线路两端。';
    }
    if (index <= prevIndex) {
      return '接续站须沿站序严格递增。';
    }
    prevIndex = index;
  }

  for (const segment of config.segments) {
    if (resolveLineNumber(segment.lineId) === null) {
      return `不支持的线路编号：${segment.lineId}`;
    }
  }

  return null;
};

export const normalizeThroughRunning = (
  config: ThroughRunningConfig | null | undefined,
  stations: readonly StationItem[],
): ThroughRunningConfig | null => {
  if (!config) {
    return null;
  }
  if (validateThroughRunning(config, stations) !== null) {
    return null;
  }
  return {
    segments: config.segments.map((segment) => ({ lineId: segment.lineId.trim() })),
    joinStationIds: [...config.joinStationIds],
  };
};

export const resolveJoinIndices = (
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): number[] => {
  if (validateThroughRunning(config, stations) !== null) {
    return [];
  }
  return config.joinStationIds.map((id) => stations.findIndex((station) => station.id === id));
};

export const resolveSegmentRanges = (
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): SegmentRange[] => {
  if (validateThroughRunning(config, stations) !== null) {
    return [];
  }

  const joins = resolveJoinIndices(config, stations);
  const last = stations.length - 1;
  return config.segments.map((segment, segmentIndex) => {
    const lo = segmentIndex === 0 ? 0 : joins[segmentIndex - 1]!;
    const hi = segmentIndex === config.segments.length - 1 ? last : joins[segmentIndex]!;
    return { segmentIndex, lineId: segment.lineId, lo, hi };
  });
};

/** Segment owning a station. Join stations belong to the lower-index segment. */
export const resolveSegmentIndexForStation = (
  stationIndex: number,
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): number => {
  const ranges = resolveSegmentRanges(config, stations);
  for (let i = ranges.length - 1; i >= 0; i -= 1) {
    const range = ranges[i]!;
    if (stationIndex >= range.lo && stationIndex <= range.hi) {
      return range.segmentIndex;
    }
  }
  return 0;
};

/**
 * Segment for direction-badge "往": ownership of the next station.
 * When next is a join, stay on the segment being approached (join is that segment's terminus).
 */
export const resolveSegmentIndexForNextStation = (
  nextStationIndex: number,
  direction: TrainDirection,
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): number => {
  const joins = resolveJoinIndices(config, stations);
  const joinPos = joins.indexOf(nextStationIndex);
  if (joinPos === -1) {
    return resolveSegmentIndexForStation(nextStationIndex, config, stations);
  }
  return direction === 'r' ? joinPos : joinPos + 1;
};

export const resolveSegmentTerminusStation = (
  segmentIndex: number,
  direction: TrainDirection,
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): StationItem | null => {
  const ranges = resolveSegmentRanges(config, stations);
  const range = ranges[segmentIndex];
  if (!range) {
    return null;
  }
  const terminusIndex = direction === 'r' ? range.hi : range.lo;
  return stations[terminusIndex] ?? null;
};

export const buildSegmentEndBlocks = (
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): SegmentEndBlock[] => {
  if (validateThroughRunning(config, stations) !== null) {
    return [];
  }

  const last = stations.length - 1;
  const joins = resolveJoinIndices(config, stations);
  const blocks: SegmentEndBlock[] = [
    {
      stationIndex: 0,
      lineId: config.segments[0]!.lineId,
      side: 'towardEnd',
      mode: 'solo',
    },
  ];

  joins.forEach((joinIndex, joinPos) => {
    blocks.push({
      stationIndex: joinIndex,
      lineId: config.segments[joinPos]!.lineId,
      side: 'towardStart',
      mode: 'pair',
    });
    blocks.push({
      stationIndex: joinIndex,
      lineId: config.segments[joinPos + 1]!.lineId,
      side: 'towardEnd',
      mode: 'pair',
    });
  });

  blocks.push({
    stationIndex: last,
    lineId: config.segments[config.segments.length - 1]!.lineId,
    side: 'towardStart',
    mode: 'solo',
  });

  return blocks;
};

const formatLineIdsZh = (lineIds: readonly string[]): string => {
  if (lineIds.length === 0) {
    return '';
  }
  if (lineIds.length === 1) {
    return `${lineIds[0]}号线`;
  }
  if (lineIds.length === 2) {
    return `${lineIds[0]}号线和${lineIds[1]}号线`;
  }
  const head = lineIds
    .slice(0, -1)
    .map((id) => `${id}号线`)
    .join('、');
  return `${head}和${lineIds[lineIds.length - 1]}号线`;
};

export const formatThroughRunningMainNotice = (config: ThroughRunningConfig): string =>
  `${formatLineIdsZh(config.segments.map((segment) => segment.lineId))}贯通运营`;

export const resolveAheadOtherLineIds = (
  currentStationIndex: number,
  direction: TrainDirection,
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
): string[] => {
  if (validateThroughRunning(config, stations) !== null) {
    return [];
  }

  const joins = resolveJoinIndices(config, stations);
  const onJoin = joins.includes(currentStationIndex);

  if (onJoin) {
    const joinPos = joins.indexOf(currentStationIndex);
    if (direction === 'r') {
      return config.segments.slice(joinPos + 1).map((segment) => segment.lineId);
    }
    return config.segments
      .slice(0, joinPos + 1)
      .map((segment) => segment.lineId)
      .reverse();
  }

  const currentSeg = resolveSegmentIndexForStation(currentStationIndex, config, stations);
  const aheadJoins =
    direction === 'l'
      ? joins.filter((index) => index < currentStationIndex)
      : joins.filter((index) => index > currentStationIndex);

  if (aheadJoins.length === 0) {
    return [];
  }

  if (direction === 'r') {
    return config.segments.slice(currentSeg + 1).map((segment) => segment.lineId);
  }
  return config.segments
    .slice(0, currentSeg)
    .map((segment) => segment.lineId)
    .reverse();
};

export const formatThroughRunningNotice = (
  config: ThroughRunningConfig,
  stations: readonly StationItem[],
  currentStationId: string,
  direction: TrainDirection,
  options: { includeRideSuffix: boolean } = { includeRideSuffix: true },
): string => {
  const main = formatThroughRunningMainNotice(config);
  if (!options.includeRideSuffix) {
    return main;
  }

  const currentIndex = stations.findIndex((station) => station.id === currentStationId);
  if (currentIndex === -1) {
    return main;
  }

  const ahead = resolveAheadOtherLineIds(currentIndex, direction, config, stations);
  if (ahead.length === 0) {
    return main;
  }

  return `${main}，乘坐${formatLineIdsZh(ahead)}无需下车换乘`;
};

export const isTwoDigitLineId = (lineId: string): boolean => {
  const resolved = resolveLineNumber(lineId);
  if (resolved === null) {
    return false;
  }
  if (typeof resolved === 'string') {
    return true;
  }
  return resolved >= 10;
};

export const remapThroughRunningAfterStationDelete = (
  config: ThroughRunningConfig,
  stationsBeforeDelete: readonly StationItem[],
  deletedStationId: string,
  stationsAfterDelete: readonly StationItem[],
): ThroughRunningConfig | null => {
  const joinPos = config.joinStationIds.indexOf(deletedStationId);
  if (joinPos === -1) {
    return normalizeThroughRunning(config, stationsAfterDelete);
  }

  const deletedIndex = stationsBeforeDelete.findIndex((station) => station.id === deletedStationId);
  const nextId = stationsBeforeDelete[deletedIndex + 1]?.id;
  const prevId = stationsBeforeDelete[deletedIndex - 1]?.id;
  const replacementId =
    (nextId && stationsAfterDelete.some((station) => station.id === nextId) ? nextId : null) ??
    (prevId && stationsAfterDelete.some((station) => station.id === prevId) ? prevId : null);

  if (!replacementId) {
    return null;
  }

  const nextJoins = [...config.joinStationIds];
  nextJoins[joinPos] = replacementId;

  const mergedSegments: ThroughRunningSegment[] = [{ lineId: config.segments[0]!.lineId }];
  const mergedJoins: string[] = [];

  for (let i = 0; i < nextJoins.length; i += 1) {
    const joinId = nextJoins[i]!;
    const rightLine = config.segments[i + 1]!.lineId;
    if (mergedJoins.includes(joinId)) {
      continue;
    }
    mergedJoins.push(joinId);
    mergedSegments.push({ lineId: rightLine });
  }

  if (mergedSegments.length < 2) {
    return null;
  }

  return normalizeThroughRunning(
    { segments: mergedSegments, joinStationIds: mergedJoins },
    stationsAfterDelete,
  );
};
