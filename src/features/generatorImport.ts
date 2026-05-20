import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from '../njmetroLinePalette';
import type { RailmapYamlImport } from '../stationListYaml';
import type { GeneratorState } from './generatorSlice';

export const railmapImportToGeneratorState = (
  data: RailmapYamlImport,
  previous: GeneratorState,
): GeneratorState => ({
  ...previous,
  stnList: data.stations.map((station) => ({
    ...station,
    transfer: station.transfer.map((line) => ({
      id: line.id,
      color: line.color,
      textColor: line.textColor ?? getNjmetroLineForegroundColor(line.id) ?? '#ffffff',
    })),
  })),
  currentStnId: data.njMetroSettings.currentStnId,
  totalLength: data.njMetroSettings.totalLength,
  direction: data.njMetroSettings.direction,
  lineId: data.lineId,
  idColor: data.color,
  idTextColor: data.lineIdTextColor,
  showStationTypeIcons: data.njMetroSettings.showStationTypeIcons,
});

export const builtinLineToGeneratorState = (
  lineId: string,
  stations: GeneratorState['stnList'],
  previous: GeneratorState,
): GeneratorState => {
  const paletteColor = getNjmetroLineBackgroundColor(lineId);
  const paletteText = getNjmetroLineForegroundColor(lineId);

  return {
    ...previous,
    lineId,
    idColor: paletteColor ?? previous.idColor,
    idTextColor: paletteText ?? previous.idTextColor,
    stnList: stations.map((station) => ({
      ...station,
      transfer: station.transfer.map((line) => ({
        id: line.id,
        color: line.color,
        textColor: line.textColor ?? getNjmetroLineForegroundColor(line.id) ?? '#ffffff',
      })),
    })),
    currentStnId: stations[0]?.id ?? '',
  };
};
