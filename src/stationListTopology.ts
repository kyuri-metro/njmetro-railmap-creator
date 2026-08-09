import type { StationItem } from './features/generatorSlice';

/** 根站点列表中的开口支线块（1A：仅两端；块内不嵌套）。 */
export type BranchGroup = {
  branches: StationItem[][];
  /** 画在主直线上的支线列表下标 */
  main: number;
};

export type StationListEntry = StationItem | BranchGroup;

export type OpeningSide = 'left' | 'right';

export type StationWalkItem = {
  station: StationItem;
  /** 根列表下标 */
  entryIndex: number;
  /** 所属支线块内的支线下标；根级站点为 null */
  branchIndex: number | null;
  /** 支线列表内下标；根级站点为 null */
  indexInBranch: number | null;
  openingSide: OpeningSide | null;
};

export type TopologyValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export const isBranchGroup = (entry: StationListEntry): entry is BranchGroup =>
  typeof entry === 'object' && entry !== null && Array.isArray((entry as BranchGroup).branches);

export const isStationEntry = (entry: StationListEntry): entry is StationItem => !isBranchGroup(entry);

export const hasOpeningBranches = (entries: readonly StationListEntry[]): boolean =>
  entries.some((entry) => isBranchGroup(entry));

/** 判定根列表中某支线块的开口朝向；位置不合法时返回 null。 */
export const getBranchOpeningSide = (
  entries: readonly StationListEntry[],
  entryIndex: number,
): OpeningSide | null => {
  const entry = entries[entryIndex];
  if (!entry || !isBranchGroup(entry)) {
    return null;
  }

  const hasStationBefore = entries.slice(0, entryIndex).some(isStationEntry);
  const hasStationAfter = entries.slice(entryIndex + 1).some(isStationEntry);

  if (entryIndex === 0 && hasStationAfter) {
    return 'left';
  }

  if (entryIndex === entries.length - 1 && hasStationBefore) {
    return 'right';
  }

  return null;
};

export const walkStations = (entries: readonly StationListEntry[]): StationWalkItem[] => {
  const walked: StationWalkItem[] = [];

  entries.forEach((entry, entryIndex) => {
    if (isStationEntry(entry)) {
      walked.push({
        station: entry,
        entryIndex,
        branchIndex: null,
        indexInBranch: null,
        openingSide: null,
      });
      return;
    }

    const openingSide = getBranchOpeningSide(entries, entryIndex);

    entry.branches.forEach((branch, branchIndex) => {
      branch.forEach((station, indexInBranch) => {
        walked.push({
          station,
          entryIndex,
          branchIndex,
          indexInBranch,
          openingSide,
        });
      });
    });
  });

  return walked;
};

/** 按根序展开；遇支线块时按 `branches` 下标顺序、各支线内从远端到汇合方向原序展开。 */
export const flattenStationList = (entries: readonly StationListEntry[]): StationItem[] =>
  walkStations(entries).map((item) => item.station);

export const findStationInEntries = (
  entries: readonly StationListEntry[],
  stationId: string,
): StationWalkItem | null => walkStations(entries).find((item) => item.station.id === stationId) ?? null;

const validateBranchGroupShape = (group: BranchGroup, entryIndex: number): string | null => {
  if (!Array.isArray(group.branches)) {
    return `stations[${entryIndex}]: branches must be an array`;
  }

  if (group.branches.length < 1 || group.branches.length > 2) {
    return `stations[${entryIndex}]: branches must contain 1 or 2 station lists`;
  }

  if (!Number.isInteger(group.main) || group.main < 0 || group.main >= group.branches.length) {
    return `stations[${entryIndex}]: main must be a valid branches index`;
  }

  for (let branchIndex = 0; branchIndex < group.branches.length; branchIndex += 1) {
    const branch = group.branches[branchIndex];
    if (!Array.isArray(branch)) {
      return `stations[${entryIndex}].branches[${branchIndex}] must be a station list`;
    }
  }

  return null;
};

/**
 * 校验 1A+2B 拓扑：
 * - 根列表形态为 [左开口?] + 普通站* + [右开口?]
 * - 每个支线块最多两条支线列表，main 合法
 * - 全表站点 id 唯一
 */
export const validateStationListTopology = (
  entries: readonly StationListEntry[],
): TopologyValidationResult => {
  const branchIndices: number[] = [];

  for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
    const entry = entries[entryIndex];
    if (isBranchGroup(entry)) {
      const shapeError = validateBranchGroupShape(entry, entryIndex);
      if (shapeError) {
        return { ok: false, error: shapeError };
      }
      branchIndices.push(entryIndex);
    }
  }

  if (branchIndices.length > 2) {
    return { ok: false, error: 'at most two opening branch groups are allowed' };
  }

  for (const entryIndex of branchIndices) {
    if (getBranchOpeningSide(entries, entryIndex) === null) {
      return {
        ok: false,
        error: `stations[${entryIndex}]: branch group must sit at the left end (with a following station) or right end (with a preceding station)`,
      };
    }
  }

  if (branchIndices.length === 2) {
    const [leftIndex, rightIndex] = branchIndices;
    if (leftIndex !== 0 || rightIndex !== entries.length - 1) {
      return { ok: false, error: 'when two branch groups exist they must occupy both ends' };
    }
    if (getBranchOpeningSide(entries, leftIndex) !== 'left' || getBranchOpeningSide(entries, rightIndex) !== 'right') {
      return { ok: false, error: 'branch groups must open left at start and right at end' };
    }
  }

  const seenIds = new Set<string>();
  for (const { station } of walkStations(entries)) {
    if (seenIds.has(station.id)) {
      return { ok: false, error: `duplicate station id: ${station.id}` };
    }
    seenIds.add(station.id);
  }

  return { ok: true };
};

/** 反转整表：根序颠倒，各支线站序颠倒，支线列表顺序颠倒并重算 main（左/右开口互换）。 */
export const reverseEntries = (entries: readonly StationListEntry[]): StationListEntry[] =>
  entries
    .map((entry) => {
      if (isStationEntry(entry)) {
        return entry;
      }

      const reversedBranches = entry.branches.map((branch) => [...branch].reverse()).reverse();
      return {
        branches: reversedBranches,
        main: reversedBranches.length - 1 - entry.main,
      };
    })
    .reverse();
