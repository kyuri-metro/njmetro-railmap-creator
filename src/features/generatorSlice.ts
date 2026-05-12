import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getBuiltinOpenedStationsByLineId } from '../builtinOpenedLineStations';
import { getNjmetroLineBackgroundColor, getNjmetroLineForegroundColor } from '../njmetroLinePalette';

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

export type GeneratorState = {
  stnList: StationItem[];
  currentStnId: string;
  totalLength: number;
  direction: TrainDirection;
  lineId: string;
  idColor: string;
  /** 线路编号块上的数字/文字颜色（与 @kyuri-metro/njmetro-palette 的 foreground 一致） */
  idTextColor: string;
  showStationTypeIcons: boolean;
};

type InsertPosition = 'before' | 'after' | 'start' | 'end';

type InsertStationPayload = {
  position: InsertPosition;
  basisId?: string;
  station: StationItem;
};

type ReplaceStationsPayload = {
  stations: StationItem[];
};

const builtinLine3Stations = getBuiltinOpenedStationsByLineId('3');

if (!builtinLine3Stations?.length) {
  throw new Error('内置 3 号线站点列表不可用');
}

const initialStations = builtinLine3Stations;
const initialCurrentStnId =
  initialStations.find((station) => station.chName === '大行宫')?.id ?? initialStations[0].id;

const initialState: GeneratorState = {
  stnList: initialStations,
  currentStnId: initialCurrentStnId,
  totalLength: 6550,
  direction: 'l',
  lineId: '3',
  idColor: '#009A44',
  idTextColor: getNjmetroLineForegroundColor('3') ?? '#ffffff',
  showStationTypeIcons: false,
};

const fallbackCurrentId = (stations: StationItem[], currentId: string) => {
  if (stations.some((station) => station.id === currentId)) {
    return currentId;
  }

  return stations[0]?.id ?? '';
};

const generatorSlice = createSlice({
  name: 'generator',
  initialState,
  reducers: {
    setTotalLength(state, action: PayloadAction<number>) {
      state.totalLength = action.payload;
    },
    setDirection(state, action: PayloadAction<TrainDirection>) {
      state.direction = action.payload;
    },
    setLineId(state, action: PayloadAction<string>) {
      const lineId = action.payload;
      state.lineId = lineId;
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
    setCurrentStation(state, action: PayloadAction<string>) {
      state.currentStnId = action.payload;
    },
    insertStation(state, action: PayloadAction<InsertStationPayload>) {
      const { position, basisId, station } = action.payload;
      const basisIndex = state.stnList.findIndex((item) => item.id === basisId);

      if (position === 'start') {
        state.stnList.unshift(station);
      } else if (position === 'end' || basisIndex === -1) {
        state.stnList.push(station);
      } else if (position === 'before') {
        state.stnList.splice(basisIndex, 0, station);
      } else {
        state.stnList.splice(basisIndex + 1, 0, station);
      }

      state.currentStnId = station.id;
    },
    updateStation(state, action: PayloadAction<StationItem>) {
      const index = state.stnList.findIndex((item) => item.id === action.payload.id);

      if (index !== -1) {
        state.stnList[index] = action.payload;
      }
    },
    deleteStation(state, action: PayloadAction<string>) {
      state.stnList = state.stnList.filter((item) => item.id !== action.payload);
      state.currentStnId = fallbackCurrentId(state.stnList, state.currentStnId);
    },
    replaceStations(state, action: PayloadAction<ReplaceStationsPayload>) {
      const { stations } = action.payload;
      state.stnList = stations.map((station) => ({
        ...station,
        transfer: station.transfer.map((line) => ({
          id: line.id,
          color: line.color,
          textColor: line.textColor ?? getNjmetroLineForegroundColor(line.id) ?? '#ffffff',
        })),
      }));
      state.currentStnId = stations[0]?.id ?? '';
    },
    reverseStnList(state) {
      state.stnList.reverse();
    },
  },
});

export const {
  deleteStation,
  insertStation,
  reverseStnList,
  setCurrentStation,
  setDirection,
  setIdColor,
  setIdTextColor,
  setLineId,
  setShowStationTypeIcons,
  setTotalLength,
  replaceStations,
  updateStation,
} = generatorSlice.actions;
export default generatorSlice.reducer;
