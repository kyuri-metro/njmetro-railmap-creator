import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from '../njmetroLinePalette';
import { resolveJianbanLineBackgroundColor, resolveJianbanLineForegroundColor } from '../jianbanLineColors';
import { normalizeTransferLines } from '../normalizeTransfer';
import type { RailmapYamlImport } from '../stationListYaml';
import type { GeneratorState } from './generatorSlice';

export const railmapImportToGeneratorState = (
  data: RailmapYamlImport,
  previous: GeneratorState,
): GeneratorState => ({
  ...previous,
  stnList: data.stations.map((station) => ({
    ...station,
    transfer: normalizeTransferLines(station.transfer),
  })),
  currentStnId: data.njMetroSettings.currentStnId,
  totalLength: data.njMetroSettings.totalLength,
  direction: data.njMetroSettings.direction,
  lineId: data.lineId,
  idColor: data.color,
  idTextColor: data.lineIdTextColor,
  showStationTypeIcons: data.njMetroSettings.showStationTypeIcons,
  trainType: data.njMetroSettings.trainType,
});

export type BuiltinLineFillNetwork = 'opened' | 'jianban';

export const builtinLineToGeneratorState = (
  lineId: string,
  stations: GeneratorState['stnList'],
  previous: GeneratorState,
  network: BuiltinLineFillNetwork = 'opened',
): GeneratorState => {
  const paletteColor =
    network === 'jianban' ? resolveJianbanLineBackgroundColor(lineId) : getNjmetroLineBackgroundColor(lineId);
  const paletteText =
    network === 'jianban' ? resolveJianbanLineForegroundColor(lineId) : getNjmetroLineForegroundColor(lineId);

  return {
    ...previous,
    lineId,
    idColor: paletteColor ?? previous.idColor,
    idTextColor: paletteText ?? previous.idTextColor,
    stnList: stations.map((station) => ({
      ...station,
      transfer: normalizeTransferLines(station.transfer),
    })),
    currentStnId: stations[0]?.id ?? '',
  };
};
