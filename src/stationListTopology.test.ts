import { describe, expect, it } from 'vitest';
import type { StationItem } from './features/generatorSlice';
import {
  findStationInEntries,
  flattenStationList,
  getBranchOpeningSide,
  hasOpeningBranches,
  isBranchGroup,
  isStationEntry,
  reverseEntries,
  validateStationListTopology,
  walkStations,
  type BranchGroup,
  type StationListEntry,
} from './stationListTopology';

const station = (id: string): StationItem => ({
  id,
  chName: id,
  enName: id,
  type: 'none',
  transfer: [],
});

const leftBranchExample = (): StationListEntry[] => [
  {
    branches: [[station('a')], [station('b')]],
    main: 1,
  },
  station('c'),
];

const rightBranchExample = (): StationListEntry[] => [
  station('c'),
  {
    branches: [[station('b')], [station('a')]],
    main: 0,
  },
];

describe('stationListTopology', () => {
  it('distinguishes stations and branch groups', () => {
    const group: BranchGroup = { branches: [[station('a')]], main: 0 };
    expect(isBranchGroup(group)).toBe(true);
    expect(isStationEntry(group)).toBe(false);
    expect(isStationEntry(station('x'))).toBe(true);
    expect(isBranchGroup(station('x'))).toBe(false);
  });

  it('detects left and right openings for 1A placement', () => {
    const left = leftBranchExample();
    expect(getBranchOpeningSide(left, 0)).toBe('left');
    expect(getBranchOpeningSide(left, 1)).toBeNull();

    const right = rightBranchExample();
    expect(getBranchOpeningSide(right, 1)).toBe('right');
    expect(getBranchOpeningSide(right, 0)).toBeNull();
  });

  it('validates linear lists and both plan examples', () => {
    expect(validateStationListTopology([station('a'), station('b')])).toEqual({ ok: true });
    expect(validateStationListTopology(leftBranchExample())).toEqual({ ok: true });
    expect(validateStationListTopology(rightBranchExample())).toEqual({ ok: true });

    const bothEnds: StationListEntry[] = [
      { branches: [[station('l1')], [station('l0')]], main: 1 },
      station('m'),
      { branches: [[station('r0')], [station('r1')]], main: 0 },
    ];
    expect(validateStationListTopology(bothEnds)).toEqual({ ok: true });
  });

  it('rejects mid-list branches, bad main, and duplicate ids', () => {
    const mid: StationListEntry[] = [station('a'), { branches: [[station('b')]], main: 0 }, station('c')];
    expect(validateStationListTopology(mid).ok).toBe(false);

    const badMain: StationListEntry[] = [{ branches: [[station('a')]], main: 1 }, station('b')];
    expect(validateStationListTopology(badMain).ok).toBe(false);

    const dup: StationListEntry[] = [
      { branches: [[station('a')], [station('a')]], main: 0 },
      station('b'),
    ];
    expect(validateStationListTopology(dup).ok).toBe(false);

    const threeBranches: StationListEntry[] = [
      { branches: [[station('a')], [station('b')], [station('c')]], main: 0 },
      station('d'),
    ];
    expect(validateStationListTopology(threeBranches).ok).toBe(false);
  });

  it('walks and flattens left-opening example in branch index order', () => {
    const entries = leftBranchExample();
    expect(hasOpeningBranches(entries)).toBe(true);
    expect(flattenStationList(entries).map((item) => item.id)).toEqual(['a', 'b', 'c']);

    const walked = walkStations(entries);
    expect(walked).toHaveLength(3);
    expect(walked[0]).toMatchObject({
      station: expect.objectContaining({ id: 'a' }),
      entryIndex: 0,
      branchIndex: 0,
      indexInBranch: 0,
      openingSide: 'left',
    });
    expect(walked[2]).toMatchObject({
      station: expect.objectContaining({ id: 'c' }),
      branchIndex: null,
      openingSide: null,
    });
    expect(findStationInEntries(entries, 'b')?.branchIndex).toBe(1);
  });

  it('reverses entries and swaps left/right opening', () => {
    const reversed = reverseEntries(leftBranchExample());
    expect(validateStationListTopology(reversed)).toEqual({ ok: true });
    expect(getBranchOpeningSide(reversed, reversed.length - 1)).toBe('right');
    expect(flattenStationList(reversed).map((item) => item.id)).toEqual(['c', 'b', 'a']);

    const group = reversed[reversed.length - 1];
    expect(isBranchGroup(group)).toBe(true);
    if (isBranchGroup(group)) {
      expect(group.main).toBe(0);
      expect(group.branches.map((branch) => branch.map((item) => item.id))).toEqual([['b'], ['a']]);
    }
  });
});
