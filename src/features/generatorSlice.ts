import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getBuiltinOpenedStationsByLineId } from '../builtinOpenedLineStations';
import { readAutosaveSettings } from '../autosaveStorage';
import { normalizeTransferLines } from '../normalizeTransfer';
import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from '../njmetroLinePalette';
import {
  cloneStationListEntries,
  DEFAULT_BRANCH_HEIGHT,
  deleteStationFromEntries,
  flattenStationList,
  insertBranchStationInEntries,
  insertStationInEntries,
  mapStationsInEntries,
  reverseEntries,
  updateStationInEntries,
  type BranchInsertPosition,
  type InsertStationPosition,
  type StationListEntry,
} from '../stationListTopology';
import {
  adjustTotalLengthForTrainTypeChange,
  DEFAULT_TRAIN_TYPE,
  type TrainType,
} from '../trainTypeLayout';

export type TransferLine = {
  id: string;
  color: string;
  textColor: string;
};

export type StationType = 'none' | 'railway' | 'airport';

export type StationItem = {
  id: string;
  chName: string;
  enName: string;
  type: StationType;
  transfer: TransferLine[];
};

export type TrainDirection = 'l' | 'r';

export type { TrainType, StationListEntry };

export type GeneratorState = {
  stnList: StationListEntry[];
  currentStnId: string;
  totalLength: number;
  /** 开口支线竖直间距（px） */
  branchHeight: number;
  direction: TrainDirection;
  lineId: string;
  idColor: string;
  /** 线路编号块上的数字/文字颜色（与 @kyuri-metro/njmetro-palette 的 foreground 一致） */
  idTextColor: string;
  showStationTypeIcons: boolean;
  /** 非当前换乘中间站使用水平胶囊标记（当前站与终点站样式不变） */
  useCapsuleTransferMarkers: boolean;
  trainType: TrainType;
};

type InsertStationPayload = {
  position: InsertStationPosition;
  basisId?: string;
  station: StationItem;
};

type InsertBranchStationPayload = {
  position: BranchInsertPosition;
  basisId?: string;
  station: StationItem;
};

type ReplaceStationsPayload = {
  stations: StationListEntry[];
};

const builtinLine3Stations = getBuiltinOpenedStationsByLineId('3');

if (!builtinLine3Stations?.length) {
  throw new Error('内置 3 号线站点列表不可用');
}

const initialStations = builtinLine3Stations;
const initialCurrentStnId =
  initialStations.find((station) => station.chName === '大行宫')?.id ?? initialStations[0].id;

const initialLineId = '3';

const initialState: GeneratorState = {
  stnList: initialStations,
  currentStnId: initialCurrentStnId,
  totalLength: 6550,
  branchHeight: DEFAULT_BRANCH_HEIGHT,
  direction: 'l',
  lineId: initialLineId,
  idColor: getNjmetroLineBackgroundColor(initialLineId) ?? '#009a44',
  idTextColor: getNjmetroLineForegroundColor(initialLineId) ?? '#ffffff',
  showStationTypeIcons: false,
  useCapsuleTransferMarkers: false,
  trainType: DEFAULT_TRAIN_TYPE,
};

export const getDefaultGeneratorState = (): GeneratorState => ({
  ...initialState,
  stnList: cloneStationListEntries(initialState.stnList),
});

/** 空白线路图：默认生成参数，站点列表为空。 */
export const getEmptyGeneratorState = (): GeneratorState => ({
  stnList: [],
  currentStnId: '',
  totalLength: initialState.totalLength,
  branchHeight: initialState.branchHeight,
  direction: initialState.direction,
  lineId: initialState.lineId,
  idColor: initialState.idColor,
  idTextColor: initialState.idTextColor,
  showStationTypeIcons: initialState.showStationTypeIcons,
  useCapsuleTransferMarkers: initialState.useCapsuleTransferMarkers,
  trainType: initialState.trainType,
});

const fallbackCurrentId = (entries: StationListEntry[], currentId: string) => {
  const flat = flattenStationList(entries);
  if (flat.some((station) => station.id === currentId)) {
    return currentId;
  }

  return flat[0]?.id ?? '';
};

const normalizeEntryTransfers = (entries: StationListEntry[]): StationListEntry[] =>
  mapStationsInEntries(entries, (station) => ({
    ...station,
    transfer: normalizeTransferLines(station.transfer),
  }));

const generatorSlice = createSlice({
  name: 'generator',
  initialState,
  reducers: {
    setTotalLength(state, action: PayloadAction<number>) {
      state.totalLength = action.payload;
    },
    setBranchHeight(state, action: PayloadAction<number>) {
      state.branchHeight = Math.max(0, Math.trunc(action.payload));
    },
    setDirection(state, action: PayloadAction<TrainDirection>) {
      state.direction = action.payload;
    },
    setLineId(state, action: PayloadAction<string>) {
      const lineId = action.payload;
      state.lineId = lineId;

      if (!readAutosaveSettings().autoFillNjmetroLineColor) {
        return;
      }

      const paletteColor = getNjmetroLineBackgroundColor(lineId);
      const paletteText = getNjmetroLineForegroundColor(lineId);

      if (paletteColor) {
        state.idColor = paletteColor;
      }

      if (paletteText) {
        state.idTextColor = paletteText;
      }
    },
    setIdColor(state, action: PayloadAction<string>) {
      state.idColor = action.payload;
    },
    setIdTextColor(state, action: PayloadAction<string>) {
      state.idTextColor = action.payload;
    },
    setShowStationTypeIcons(state, action: PayloadAction<boolean>) {
      state.showStationTypeIcons = action.payload;
    },
    setUseCapsuleTransferMarkers(state, action: PayloadAction<boolean>) {
      state.useCapsuleTransferMarkers = action.payload;
    },
    setTrainType(state, action: PayloadAction<TrainType>) {
      const nextType = action.payload;
      state.totalLength = adjustTotalLengthForTrainTypeChange(state.trainType, nextType, state.totalLength);
      state.trainType = nextType;
    },
    setCurrentStation(state, action: PayloadAction<string>) {
      state.currentStnId = action.payload;
    },
    insertStation(state, action: PayloadAction<InsertStationPayload>) {
      const { position, basisId, station } = action.payload;
      state.stnList = insertStationInEntries(state.stnList, position, basisId, station);
      state.currentStnId = station.id;
    },
    insertBranchStation(state, action: PayloadAction<InsertBranchStationPayload>) {
      const { position, basisId, station } = action.payload;
      const result = insertBranchStationInEntries(state.stnList, position, basisId, station);
      if (!result.ok) {
        return;
      }
      state.stnList = result.entries;
      state.currentStnId = station.id;
    },
    updateStation(state, action: PayloadAction<StationItem>) {
      state.stnList = updateStationInEntries(state.stnList, action.payload);
    },
    deleteStation(state, action: PayloadAction<string>) {
      state.stnList = deleteStationFromEntries(state.stnList, action.payload);
      state.currentStnId = fallbackCurrentId(state.stnList, state.currentStnId);
    },
    replaceStations(state, action: PayloadAction<ReplaceStationsPayload>) {
      const { stations } = action.payload;
      state.stnList = normalizeEntryTransfers(stations);
      state.currentStnId = flattenStationList(stations)[0]?.id ?? '';
    },
    reverseStnList(state) {
      state.stnList = reverseEntries(state.stnList);
    },
    restoreGeneratorState(_state, action: PayloadAction<GeneratorState>) {
      return action.payload;
    },
  },
});

export const {
  deleteStation,
  insertBranchStation,
  insertStation,
  reverseStnList,
  setBranchHeight,
  setCurrentStation,
  setDirection,
  setIdColor,
  setIdTextColor,
  setLineId,
  setShowStationTypeIcons,
  setUseCapsuleTransferMarkers,
  setTotalLength,
  setTrainType,
  replaceStations,
  restoreGeneratorState,
  updateStation,
} = generatorSlice.actions;
export default generatorSlice.reducer;
