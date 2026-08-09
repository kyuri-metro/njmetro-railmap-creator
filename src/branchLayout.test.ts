import { describe, expect, it } from 'vitest';
import type { StationItem } from './features/generatorSlice';
import { layoutBranchRoute, parseBranchRouteModel } from './branchLayout';
import type { StationListEntry } from './stationListTopology';

const station = (id: string): StationItem => ({
  id,
  chName: id,
  enName: id,
  type: 'none',
  transfer: [],
});

describe('branchLayout', () => {
  it('matches linear equal spacing when there are no branches', () => {
    const entries: StationListEntry[] = [station('a'), station('b'), station('c')];
    const layout = layoutBranchRoute(entries, 1000, 120);
    expect(layout.segmentLength).toBeCloseTo(500);
    expect(layout.stations.map((point) => point.stationId)).toEqual(['a', 'b', 'c']);
    expect(layout.stations.map((point) => point.x)).toEqual([0, 500, 1000]);
    expect(layout.diagonals).toHaveLength(0);
  });

  it('lays out left-opening example {branches:[[a],[b]], main:1} + c', () => {
    const entries: StationListEntry[] = [
      { branches: [[station('a')], [station('b')]], main: 1 },
      station('c'),
    ];
    const model = parseBranchRouteModel(entries);
    expect(model.left?.mergeStationId).toBe('c');
    expect(model.middle.map((item) => item.id)).toEqual(['c']);

    const H = 100;
    const total = 1000;
    const layout = layoutBranchRoute(entries, total, H);
    // max(L_side=H, L_main=s) + 0 = total → if s>=H then s=total, else H+0 with s from other
    // Equation cases: win main → s = total; need H <= s. win side → H = total & s free with 0 coeff — handled.
    expect(layout.segmentLength).toBeGreaterThan(0);
    expect(layout.usedFallback).toBe(false);

    const byId = Object.fromEntries(layout.stations.map((point) => [point.stationId, point]));
    expect(byId.c.y).toBe(0);
    expect(byId.b.y).toBe(0);
    expect(byId.a.y).toBe(-H);
    expect(byId.c.x - byId.b.x).toBeCloseTo(layout.segmentLength);
    expect(byId.c.x - byId.a.x).toBeCloseTo(H);
    expect(layout.diagonals).toEqual([
      expect.objectContaining({ fromStationId: 'a', toStationId: 'c', side: 'left', ySign: -1 }),
    ]);
    expect(byId.c.x).toBeCloseTo(Math.max(layout.segmentLength, H));
  });

  it('lays out right-opening example c + {branches:[[b],[a]], main:0}', () => {
    const entries: StationListEntry[] = [
      station('c'),
      { branches: [[station('b')], [station('a')]], main: 0 },
    ];
    const H = 80;
    const layout = layoutBranchRoute(entries, 900, H);
    const byId = Object.fromEntries(layout.stations.map((point) => [point.stationId, point]));

    expect(byId.c.x).toBe(0);
    expect(byId.b.y).toBe(0);
    expect(byId.a.y).toBe(H);
    expect(byId.b.x - byId.c.x).toBeCloseTo(layout.segmentLength);
    expect(byId.a.x - byId.c.x).toBeCloseTo(H);
    expect(layout.diagonals).toEqual([
      expect.objectContaining({ fromStationId: 'c', toStationId: 'a', side: 'right', ySign: 1 }),
    ]);
  });

  it('solves both-end openings with four-case max selection', () => {
    const entries: StationListEntry[] = [
      { branches: [[station('l1'), station('l2')], [station('lm')]], main: 1 },
      station('m1'),
      station('m2'),
      { branches: [[station('rm')], [station('r1')]], main: 0 },
    ];
    const layout = layoutBranchRoute(entries, 4000, 120);
    expect(layout.usedFallback).toBe(false);
    expect(layout.segmentLength).toBeGreaterThan(0);
    expect(layout.stations).toHaveLength(7);
    expect(layout.diagonals).toHaveLength(2);

    const span =
      Math.max(...layout.stations.map((point) => point.x)) - Math.min(...layout.stations.map((point) => point.x));
    // 水平总跨度应等于 totalLength（两端由 max 腿决定）
    expect(span).toBeCloseTo(4000, 0);
  });
});
