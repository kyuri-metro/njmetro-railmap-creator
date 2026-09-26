import type { StationItem } from './features/generatorSlice';

export type SegmentTransferFlipHint = Readonly<{
  showHint: true;
  stationIndex: number;
  /** 切换「反转首站上下」到此值可消除全部此类冲突 */
  suggestFlipTo: boolean;
}> | Readonly<{
  showHint: false;
}>;

const placeAbove = (index: number, flipFirstStationVertical: boolean): boolean =>
  (index % 2 === 0) !== flipFirstStationVertical;

/** 分段端点 + 站名朝上 + 有换乘 → 分段指示与换乘线号条重叠的站 index（升序） */
const listSegmentTransferLabelConflicts = (
  stations: readonly StationItem[],
  flipFirstStationVertical: boolean,
  segmentEndStationIndices: ReadonlySet<number>,
): number[] => {
  const conflicts: number[] = [];
  for (const index of segmentEndStationIndices) {
    const station = stations[index];
    if (!station || station.transfer.length === 0) {
      continue;
    }
    if (placeAbove(index, flipFirstStationVertical)) {
      conflicts.push(index);
    }
  }
  conflicts.sort((a, b) => a - b);
  return conflicts;
};

/**
 * 当勾选/取消「反转首站上下」能消除线路图中全部「分段端点 + 站名朝上 + 有换乘」冲突时，
 * 返回应在首次冲突站显示的提示。
 */
export const resolveSegmentTransferFlipHint = (
  stations: readonly StationItem[],
  flipFirstStationVertical: boolean,
  segmentEndStationIndices: ReadonlySet<number>,
): SegmentTransferFlipHint => {
  const current = listSegmentTransferLabelConflicts(
    stations,
    flipFirstStationVertical,
    segmentEndStationIndices,
  );
  if (current.length === 0) {
    return { showHint: false };
  }

  const flipped = listSegmentTransferLabelConflicts(
    stations,
    !flipFirstStationVertical,
    segmentEndStationIndices,
  );
  if (flipped.length > 0) {
    return { showHint: false };
  }

  return {
    showHint: true,
    stationIndex: current[0]!,
    suggestFlipTo: !flipFirstStationVertical,
  };
};
