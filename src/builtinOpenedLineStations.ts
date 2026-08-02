import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from './njmetroLinePalette';
import builtinOpenedStationSeeds from './data/builtin-opened-stations.json';
import { createBuiltinStationSeedRuntime } from './builtinStationSeedRuntime';

type SupportedLineId = keyof typeof builtinOpenedStationSeeds;

const runtime = createBuiltinStationSeedRuntime<SupportedLineId>({
  seedsByLineId: builtinOpenedStationSeeds,
  idSuffix: 'builtin',
  railwayStationChNames: new Set(['南京站', '南京南站', '句容', '姑孰', '滁州高铁站']),
  airportStationChNames: new Set(['禄口机场']),
  resolveBackgroundColor: getNjmetroLineBackgroundColor,
  resolveForegroundColor: getNjmetroLineForegroundColor,
});

export const builtinOpenedLineIds = runtime.lineIds;
export const getBuiltinOpenedStationsByLineId = runtime.getStationsByLineId;
