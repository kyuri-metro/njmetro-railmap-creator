import type { TrainType } from './trainTypeLayout';

/**
 * 南京地铁线号 → 车型。
 * 编组来源：[南京地铁 - 维基百科](https://zh.wikipedia.org/wiki/%E5%8D%97%E4%BA%AC%E5%9C%B0%E9%93%81)；
 * 市域 A/B 映射为 A/B；7 号线为 B 型长线路图；16/18 编组待定（不映射）。
 */

export type LineTrainTypeLookup =
  | { kind: 'known'; trainType: TrainType }
  | { kind: 'undetermined' }
  | { kind: 'unknown' };

const KNOWN_TRAIN_TYPES_BY_LINE_ID: Record<string, TrainType> = {
  '1': 'a',
  '2': 'a',
  '3': 'a',
  '4': 'b',
  '5': 'a',
  '6': 'b',
  '7': 'b-long',
  '8': 'b',
  '9': 'b',
  '10': 'a',
  '11': 'a',
  S1: 'b',
  S2: 'b',
  S3: 'b',
  S4: 'suburban-d',
  S5: 'a',
  S6: 'b',
  S7: 'b',
  S8: 'b',
  S9: 'b',
};

const UNDETERMINED_LINE_IDS = new Set(['16', '18']);

export const normalizeNjmetroLineIdForTrainType = (lineIdRaw: string): string => lineIdRaw.trim().toUpperCase();

export const isUndeterminedTrainTypeLineId = (lineIdRaw: string): boolean =>
  UNDETERMINED_LINE_IDS.has(normalizeNjmetroLineIdForTrainType(lineIdRaw));

export const lookupLineTrainType = (lineIdRaw: string): LineTrainTypeLookup => {
  const lineId = normalizeNjmetroLineIdForTrainType(lineIdRaw);

  if (!lineId) {
    return { kind: 'unknown' };
  }

  if (UNDETERMINED_LINE_IDS.has(lineId)) {
    return { kind: 'undetermined' };
  }

  const trainType = KNOWN_TRAIN_TYPES_BY_LINE_ID[lineId];
  if (!trainType) {
    return { kind: 'unknown' };
  }

  return { kind: 'known', trainType };
};
