import { describe, expect, it } from 'vitest';
import type { StationItem } from './features/generatorSlice';
import {
  buildSegmentEndBlocks,
  formatThroughRunningNotice,
  remapThroughRunningAfterStationDelete,
  resolveSegmentIndexForNextStation,
  resolveSegmentTerminusStation,
  reverseThroughRunning,
  validateThroughRunning,
  type ThroughRunningConfig,
} from './throughRunning';

const stations: StationItem[] = [
  { id: 'a', chName: 'A', enName: 'A', type: 'none', transfer: [] },
  { id: 'b', chName: 'B', enName: 'B', type: 'none', transfer: [] },
  { id: 'join', chName: 'Join', enName: 'Join', type: 'railway', transfer: [] },
  { id: 'c', chName: 'C', enName: 'C', type: 'none', transfer: [] },
  { id: 'd', chName: 'D', enName: 'D', type: 'none', transfer: [] },
];

const config: ThroughRunningConfig = {
  segments: [{ lineId: '6' }, { lineId: 'S1' }],
  joinStationIds: ['join'],
};

describe('throughRunning', () => {
  it('validates a two-segment config', () => {
    expect(validateThroughRunning(config, stations)).toBeNull();
  });

  it('reverses segments with the station list', () => {
    expect(reverseThroughRunning(config)).toEqual({
      segments: [{ lineId: 'S1' }, { lineId: '6' }],
      joinStationIds: ['join'],
    });
  });

  it('builds solo and pair end blocks', () => {
    const blocks = buildSegmentEndBlocks(config, stations);
    expect(blocks).toEqual([
      { stationIndex: 0, lineId: '6', side: 'towardEnd', mode: 'solo' },
      { stationIndex: 2, lineId: '6', side: 'towardStart', mode: 'pair' },
      { stationIndex: 2, lineId: 'S1', side: 'towardEnd', mode: 'pair' },
      { stationIndex: 4, lineId: 'S1', side: 'towardStart', mode: 'solo' },
    ]);
  });

  it('formats notice with ride suffix when a join is ahead', () => {
    expect(formatThroughRunningNotice(config, stations, 'a', 'r')).toBe(
      '6号线和S1号线贯通运营，乘坐S1号线无需下车换乘',
    );
    expect(formatThroughRunningNotice(config, stations, 'd', 'r')).toBe('6号线和S1号线贯通运营');
  });

  it('resolves direction-badge segment terminus from next station', () => {
    const nextIndex = 3;
    const segmentIndex = resolveSegmentIndexForNextStation(nextIndex, 'r', config, stations);
    expect(segmentIndex).toBe(1);
    expect(resolveSegmentTerminusStation(segmentIndex, 'r', config, stations)?.id).toBe('d');
  });

  it('keeps approaching-join segment for direction-badge 往', () => {
    // b → join (r): still on segment 0 → 往 join
    expect(resolveSegmentIndexForNextStation(2, 'r', config, stations)).toBe(0);
    expect(resolveSegmentTerminusStation(0, 'r', config, stations)?.id).toBe('join');

    // c → join (l): still on segment 1 → 往 join
    expect(resolveSegmentIndexForNextStation(2, 'l', config, stations)).toBe(1);
    expect(resolveSegmentTerminusStation(1, 'l', config, stations)?.id).toBe('join');
  });

  it('remaps join to the next station on delete', () => {
    const after = stations.filter((station) => station.id !== 'join');
    const next = remapThroughRunningAfterStationDelete(config, stations, 'join', after);
    expect(next).toEqual({
      segments: [{ lineId: '6' }, { lineId: 'S1' }],
      joinStationIds: ['c'],
    });
  });
});
