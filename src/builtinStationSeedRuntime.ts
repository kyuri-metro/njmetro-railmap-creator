import type { StationItem } from './features/generatorSlice';

export type BuiltinStationSeed = { chName: string; enName: string };

export type BuiltinStationSeedRuntimeConfig<LineId extends string> = {
  seedsByLineId: Record<LineId, BuiltinStationSeed[]>;
  idSuffix: string;
  railwayStationChNames: ReadonlySet<string>;
  airportStationChNames: ReadonlySet<string>;
  resolveBackgroundColor: (lineId: LineId) => string | null | undefined;
  resolveForegroundColor: (lineId: LineId) => string | null | undefined;
};

const stationTypeFromChName = (
  chName: string,
  railwayStationChNames: ReadonlySet<string>,
  airportStationChNames: ReadonlySet<string>,
): StationItem['type'] => {
  if (airportStationChNames.has(chName)) {
    return 'airport';
  }
  if (railwayStationChNames.has(chName)) {
    return 'railway';
  }
  return 'none';
};

const collectTransferIdsByStationName = <LineId extends string>(
  seedsByLineId: Record<LineId, BuiltinStationSeed[]>,
  lineIds: readonly LineId[],
) => {
  const transferMap = new Map<string, Set<LineId>>();
  for (const lineId of lineIds) {
    for (const station of seedsByLineId[lineId]) {
      let lineSet = transferMap.get(station.chName);
      if (!lineSet) {
        lineSet = new Set();
        transferMap.set(station.chName, lineSet);
      }
      lineSet.add(lineId);
    }
  }
  return transferMap;
};

export const createBuiltinStationSeedRuntime = <LineId extends string>(
  config: BuiltinStationSeedRuntimeConfig<LineId>,
) => {
  const lineIds = Object.keys(config.seedsByLineId) as LineId[];
  const supportedLineIds = new Set<LineId>(lineIds);
  const transferIdsByStationName = collectTransferIdsByStationName(config.seedsByLineId, lineIds);

  const toBuiltinStationId = (lineId: LineId, index: number) =>
    `${String(lineId).toLowerCase()}-${config.idSuffix}-${String(index + 1).padStart(2, '0')}`;

  const getStationsByLineId = (lineIdRaw: string): StationItem[] | null => {
    const lineId = lineIdRaw.trim().toUpperCase();
    if (!supportedLineIds.has(lineId as LineId)) {
      return null;
    }
    const normalizedLineId = lineId as LineId;
    return config.seedsByLineId[normalizedLineId].map((seedItem, index) => {
      const transferIds = [...(transferIdsByStationName.get(seedItem.chName) ?? [])].filter(
        (id) => id !== normalizedLineId,
      );
      return {
        id: toBuiltinStationId(normalizedLineId, index),
        chName: seedItem.chName,
        enName: seedItem.enName,
        type: stationTypeFromChName(
          seedItem.chName,
          config.railwayStationChNames,
          config.airportStationChNames,
        ),
        transfer: transferIds.map((id) => ({
          id,
          color: config.resolveBackgroundColor(id) ?? '#8c989f',
          textColor: config.resolveForegroundColor(id) ?? '#ffffff',
        })),
      };
    });
  };

  return {
    lineIds,
    getStationsByLineId,
  };
};
