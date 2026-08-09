import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from '../njmetroLinePalette';
import { resolveJianbanLineBackgroundColor, resolveJianbanLineForegroundColor } from '../jianbanLineColors';
import { lookupLineTrainType } from '../njmetroLineTrainTypes';
import { normalizeTransferLines } from '../normalizeTransfer';
import type { RailmapYamlImport } from '../stationListYaml';
import { flattenStationList, mapStationsInEntries, type StationListEntry } from '../stationListTopology';
import { adjustTotalLengthForTrainTypeChange } from '../trainTypeLayout';
import type { GeneratorState, StationItem } from './generatorSlice';

const normalizeEntryTransfers = (entries: StationListEntry[]): StationListEntry[] =>
  mapStationsInEntries(entries, (station) => ({
    ...station,
    transfer: normalizeTransferLines(station.transfer),
  }));

export const railmapImportToGeneratorState = (
  data: RailmapYamlImport,
  previous: GeneratorState,
): GeneratorState => ({
  ...previous,
  stnList: normalizeEntryTransfers(data.stations),
  currentStnId: data.njMetroSettings.currentStnId,
  totalLength: data.njMetroSettings.totalLength,
  branchHeight: data.njMetroSettings.branchHeight,
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
  stations: StationItem[],
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

export { flattenStationList };
