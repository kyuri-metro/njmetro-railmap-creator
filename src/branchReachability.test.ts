import { describe, expect, it } from 'vitest';
import { collectTrackEdges, layoutBranchRoute } from './branchLayout';
import {
  computeActiveTrackEdgeKeys,
  edgeKey,
  isTrackEdgeActive,
  openingMergesIntoTravel,
} from './branchReachability';
import type { StationItem } from './features/generatorSlice';
import type { StationListEntry } from './stationListTopology';

const station = (id: string): StationItem => ({
  id,
  chName: id,
  enName: id,
  type: 'none',
  transfer: [],
});

describe('branchReachability', () => {
  it('colors linear ahead edges only', () => {
    const entries: StationListEntry[] = [station('a'), station('b'), station('c')];
    const layout = layoutBranchRoute(entries, 1000, 120);
    const edges = collectTrackEdges(entries);
    const active = computeActiveTrackEdgeKeys(entries, 'b', 'r', layout.stations, edges);

    expect(isTrackEdgeActive(active, 'b', 'c')).toBe(true);
    expect(isTrackEdgeActive(active, 'a', 'b')).toBe(false);
  });

  it('when merging into travel, activates the sibling branch', () => {
    const entries: StationListEntry[] = [
      { branches: [[station('a')], [station('b')]], main: 1 },
      station('c'),
      station('d'),
    ];
    const layout = layoutBranchRoute(entries, 2000, 100);
    const edges = collectTrackEdges(entries);

    expect(openingMergesIntoTravel('left', 'r')).toBe(true);

    const fromA = computeActiveTrackEdgeKeys(entries, 'a', 'r', layout.stations, edges);
    expect(isTrackEdgeActive(fromA, 'a', 'c')).toBe(true);
    expect(isTrackEdgeActive(fromA, 'b', 'c')).toBe(true);
    expect(isTrackEdgeActive(fromA, 'c', 'd')).toBe(true);

    const fromMain = computeActiveTrackEdgeKeys(entries, 'd', 'r', layout.stations, edges);
    expect(fromMain.size).toBe(0);

    const fromDLeft = computeActiveTrackEdgeKeys(entries, 'd', 'l', layout.stations, edges);
    expect(isTrackEdgeActive(fromDLeft, 'c', 'd')).toBe(true);
    // 向左行进时左开口是岔出而非汇入，不强制点亮另一支线
    expect(isTrackEdgeActive(fromDLeft, 'a', 'c')).toBe(true);
    expect(isTrackEdgeActive(fromDLeft, 'b', 'c')).toBe(true);
  });

  it('uses stable undirected edge keys', () => {
    expect(edgeKey('a', 'b')).toBe(edgeKey('b', 'a'));
  });
});
