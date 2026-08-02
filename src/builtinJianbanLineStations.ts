/**
 * 简办动态演示线网内置站点。有不确定性；请以官方最终公布为准。
 * 详见 docs/builtin-jianban-attribution.md（BV1Bw41127DF）。
 */
import { resolveJianbanLineBackgroundColor, resolveJianbanLineForegroundColor } from './jianbanLineColors';
import builtinJianbanStationSeeds from './data/builtin-jianban-stations.json';
import { createBuiltinStationSeedRuntime } from './builtinStationSeedRuntime';

type SupportedLineId = keyof typeof builtinJianbanStationSeeds;

const runtime = createBuiltinStationSeedRuntime<SupportedLineId>({
  seedsByLineId: builtinJianbanStationSeeds,
  idSuffix: 'jianban',
  railwayStationChNames: new Set([
    '南京站',
    '南京南站',
    '南京北站',
    '仙林站',
    '句容',
    '姑孰',
    '滁州高铁站',
    '扬州西站',
    '禄口机场3号航站楼',
  ]),
  airportStationChNames: new Set(['禄口机场', '禄口机场3号航站楼']),
  resolveBackgroundColor: resolveJianbanLineBackgroundColor,
  resolveForegroundColor: resolveJianbanLineForegroundColor,
});

export const builtinJianbanLineIds = runtime.lineIds;
export const getBuiltinJianbanStationsByLineId = runtime.getStationsByLineId;
