import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getNjmetroLineBackgroundColor } from '../njmetroLinePalette';

export type TransferLine = {
  id: string;
  color: string;
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

const initialStations: StationItem[] = [
  {
    id: 'linchang',
    chName: '林场',
    enName: 'Linchang',
    type: 'none',
    transfer: [],
  },
  {
    id: 'xinghuolu',
    chName: '星火路',
    enName: 'Xinghuolu',
    type: 'none',
    transfer: [],
  },
  {
    id: 'dongdachengxianxueyuan',
    chName: '东大成贤学院',
    enName: 'SEU Chengxian College',
    type: 'none',
    transfer: [],
  },
  {
    id: 'taifenglu',
    chName: '泰冯路',
    enName: 'Taifenglu',
    type: 'none',
    transfer: [{ id: 'S8', color: '#FF8000' }],
  },
  {
    id: 'tianruncheng',
    chName: '天润城',
    enName: 'Tianruncheng',
    type: 'none',
    transfer: [],
  },
  {
    id: 'liuzhoudonglu',
    chName: '柳洲东路',
    enName: 'Liuzhoudonglu',
    type: 'none',
    transfer: [],
  },
  {
    id: 'shangyuanmen',
    chName: '上元门',
    enName: 'Shangyuanmen',
    type: 'none',
    transfer: [],
  },
  {
    id: 'wutangguangchang',
    chName: '五塘广场',
    enName: 'Wutangguangchang',
    type: 'none',
    transfer: [{ id: '7', color: '#4A7729' }],
  },
  {
    id: 'xiaoshi',
    chName: '小市',
    enName: 'Xiaoshi',
    type: 'none',
    transfer: [],
  },
  {
    id: 'nanjingzhan',
    chName: '南京站',
    enName: 'Nanjing Railway Station',
    type: 'railway',
    transfer: [{ id: '1', color: '#009ACE' }],
  },
  {
    id: 'nanjinglinyedaxuexinzhuang',
    chName: '南京林业大学·新庄',
    enName: 'NFU / Xinzhuang',
    type: 'none',
    transfer: [],
  },
  {
    id: 'jimingsi',
    chName: '鸡鸣寺',
    enName: 'Jimingsi',
    type: 'none',
    transfer: [{ id: '4', color: '#7D55C7' }],
  },
  {
    id: 'fuqiao',
    chName: '浮桥',
    enName: 'Fuqiao',
    type: 'none',
    transfer: [],
  },
  {
    id: 'daxinggong',
    chName: '大行宫',
    enName: 'Daxinggong',
    type: 'none',
    transfer: [{ id: '2', color: '#A6093D' }],
  },
  {
    id: 'changfujie',
    chName: '常府街',
    enName: 'Changfujie',
    type: 'none',
    transfer: [],
  },
  {
    id: 'fuzimiao',
    chName: '夫子庙',
    enName: 'Fuzimiao',
    type: 'none',
    transfer: [],
  },
  {
    id: 'wudingmen',
    chName: '武定门',
    enName: 'Wudingmen',
    type: 'none',
    transfer: [],
  },
  {
    id: 'yuhuamen',
    chName: '雨花门',
    enName: 'Yuhuamen',
    type: 'none',
    transfer: [],
  },
  {
    id: 'kazimen',
    chName: '卡子门',
    enName: 'Kazimen',
    type: 'none',
    transfer: [{ id: '10', color: '#B9975B' }],
  },
  {
    id: 'daminglu',
    chName: '大明路',
    enName: 'Daminglu',
    type: 'none',
    transfer: [],
  },
  {
    id: 'mingfaguangchang',
    chName: '明发广场',
    enName: 'Mingfaguangchang',
    type: 'none',
    transfer: [],
  },
  {
    id: 'nanjingnanzhan',
    chName: '南京南站',
    enName: 'Nanjingnan Railway Station', 
    // should follow "\n( Nanjing South Railway Station )" but here don't support multiple lines
    type: 'railway',
    transfer: [
      { id: '1', color: '#009ACE' },
      { id: 'S1', color: '#4BBBB4' },
      { id: 'S3', color: '#BA84AC' },
    ],
  },
  {
    id: 'hongyundadao',
    chName: '宏运大道',
    enName: 'Hongyundadao',
    type: 'none',
    transfer: [],
  },
  {
    id: 'shengtaixilu',
    chName: '胜太西路',
    enName: 'Shengtaixilu',
    type: 'none',
    transfer: [],
  },
  {
    id: 'tianyuanxilu',
    chName: '天元西路',
    enName: 'Tianyuanxilu',
    type: 'none',
    transfer: [],
  },
  {
    id: 'jiulonghu',
    chName: '九龙湖',
    enName: 'Jiulonghu',
    type: 'none',
    transfer: [],
  },
  {
    id: 'chengxindadao',
    chName: '诚信大道',
    enName: 'Chengxindadao',
    type: 'none',
    transfer: [],
  },
  {
    id: 'dongdajiulonghuxiaoqu',
    chName: '东大九龙湖校区',
    enName: 'SEU Jiulonghu Campus',
    type: 'none',
    transfer: [],
  },
  {
    id: 'mozhoudonglu',
    chName: '秣周东路',
    enName: 'Mozhoudonglu',
    type: 'none',
    transfer: [],
  },
  {
    id: 'shangqinhuaixi',
    chName: '上秦淮西',
    enName: 'Shangqinhuaixi',
    type: 'none',
    transfer: [],
  },
  {
    id: 'moling',
    chName: '秣陵',
    enName: 'Moling',
    type: 'none',
    transfer: [],
  },
];

const initialState: GeneratorState = {
  stnList: initialStations,
  currentStnId: 'daxinggong',
  totalLength: 6550,
  direction: 'l',
  lineId: '3',
  idColor: '#009A44',
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

      if (paletteColor) {
        state.idColor = paletteColor;
      }
    },
    setIdColor(state, action: PayloadAction<string>) {
      state.idColor = action.payload;
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
      state.stnList = stations;
      state.currentStnId = stations[0]?.id ?? '';
    },
  },
});

export const {
  deleteStation,
  insertStation,
  setCurrentStation,
  setDirection,
  setIdColor,
  setLineId,
  setShowStationTypeIcons,
  setTotalLength,
  replaceStations,
  updateStation,
} = generatorSlice.actions;
export default generatorSlice.reducer;
