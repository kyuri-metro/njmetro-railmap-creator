import { describe, expect, it } from 'vitest';
import type { StationItem } from './features/generatorSlice';
import { resolveSegmentTransferFlipHint } from './segmentTransferFlipHint';

const transfer = [{ id: '1', color: '#000', textColor: '#fff' }];

describe('resolveSegmentTransferFlipHint', () => {
  it('shows hint when flipping would clear all conflicts', () => {
    // even segment ends with transfer: flip=false conflicts, flip=true clears
    const stations: StationItem[] = [
      { id: 'a', chName: 'A', enName: 'A', type: 'none', transfer },
      { id: 'b', chName: 'B', enName: 'B', type: 'none', transfer: [] },
      { id: 'join', chName: 'Join', enName: 'Join', type: 'railway', transfer },
      { id: 'c', chName: 'C', enName: 'C', type: 'none', transfer: [] },
      { id: 'd', chName: 'D', enName: 'D', type: 'none', transfer },
    ];
    const ends = new Set([0, 2, 4]);
    expect(resolveSegmentTransferFlipHint(stations, false, ends)).toEqual({
      showHint: true,
      stationIndex: 0,
      suggestFlipTo: true,
    });

    // odd join with transfer only: flip=true conflicts, unchecking clears
    const oddJoin: StationItem[] = [
      { id: 'a', chName: 'A', enName: 'A', type: 'none', transfer: [] },
      { id: 'join', chName: 'Join', enName: 'Join', type: 'railway', transfer },
      { id: 'c', chName: 'C', enName: 'C', type: 'none', transfer: [] },
    ];
    expect(resolveSegmentTransferFlipHint(oddJoin, true, new Set([0, 1, 2]))).toEqual({
      showHint: true,
      stationIndex: 1,
      suggestFlipTo: false,
    });
  });

  it('hides hint when flipping would still leave conflicts', () => {
    const mixed: StationItem[] = [
      { id: 'a', chName: 'A', enName: 'A', type: 'none', transfer: [] },
      { id: 'join', chName: 'Join', enName: 'Join', type: 'railway', transfer },
      { id: 'c', chName: 'C', enName: 'C', type: 'none', transfer },
    ];
    const ends = new Set([0, 1, 2]);
    expect(resolveSegmentTransferFlipHint(mixed, false, ends)).toEqual({ showHint: false });
    expect(resolveSegmentTransferFlipHint(mixed, true, ends)).toEqual({ showHint: false });
  });
});
