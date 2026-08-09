import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from '../njmetroLinePalette';
import { resolveJianbanLineBackgroundColor, resolveJianbanLineForegroundColor } from '../jianbanLineColors';
import { lookupLineTrainType } from '../njmetroLineTrainTypes';
import { normalizeTransferLines } from '../normalizeTransfer';
import type { RailmapYamlImport } from '../stationListYaml';
import { flattenStationList } from '../stationListTopology';
import { adjustTotalLengthForTrainTypeChange } from '../trainTypeLayout';
import type { GeneratorState } from './generatorSlice';

/** C3 前：导入异构站点列表时先 flatten，支线拓扑暂不进入 generator state。 */
export const railmapImportToGeneratorState = (
  data: RailmapYamlImport,
  previous: GeneratorState,
): GeneratorState => ({
  ...previous,
  stnList: flattenStationList(data.stations).map((station) => ({
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
  useCapsuleTransferMarkers: data.njMetroSettings.useCapsuleTransferMarkers,
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

  const trainTypeLookup = lookupLineTrainType(lineId);
  const trainType =
    trainTypeLookup.kind === 'known' ? trainTypeLookup.trainType : previous.trainType;
  const totalLength =
    trainTypeLookup.kind === 'known'
      ? adjustTotalLengthForTrainTypeChange(previous.trainType, trainType, previous.totalLength)
      : previous.totalLength;

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
    trainType,
    totalLength,
  };
};
