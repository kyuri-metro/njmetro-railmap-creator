import type { StationItem } from './features/generatorSlice';

/** 开口支线竖直间距默认值（px）；45° 边长为 branchHeight√2 */
export const DEFAULT_BRANCH_HEIGHT = 120;

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

export const cloneStationListEntries = (entries: readonly StationListEntry[]): StationListEntry[] =>
  entries.map((entry) => {
    if (isStationEntry(entry)) {
      return {
        ...entry,
        transfer: entry.transfer.map((line) => ({ ...line })),
      };
    }
    return {
      branches: entry.branches.map((branch) =>
        branch.map((station) => ({
          ...station,
          transfer: station.transfer.map((line) => ({ ...line })),
        })),
      ),
      main: entry.main,
    };
  });

export const mapStationsInEntries = (
  entries: readonly StationListEntry[],
  mapStation: (station: StationItem) => StationItem,
): StationListEntry[] =>
  entries.map((entry) => {
    if (isStationEntry(entry)) {
      return mapStation(entry);
    }
    return {
      ...entry,
      branches: entry.branches.map((branch) => branch.map(mapStation)),
    };
  });

export type InsertStationPosition = 'before' | 'after' | 'start' | 'end';

/** 在根级或支线列表内插入站点（basis 命中支线内站时插入该支线）。 */
export const insertStationInEntries = (
  entries: readonly StationListEntry[],
  position: InsertStationPosition,
  basisId: string | undefined,
  station: StationItem,
): StationListEntry[] => {
  if (position === 'start') {
    return [station, ...entries];
  }

  if (position === 'end') {
    return [...entries, station];
  }

  const located = basisId ? findStationInEntries(entries, basisId) : null;
  if (!located) {
    return [...entries, station];
  }

  if (located.branchIndex === null) {
    const next = [...entries];
    const insertAt = position === 'before' ? located.entryIndex : located.entryIndex + 1;
    next.splice(insertAt, 0, station);
    return next;
  }

  return entries.map((entry, entryIndex) => {
    if (entryIndex !== located.entryIndex || !isBranchGroup(entry)) {
      return entry;
    }
    const branches = entry.branches.map((branch, branchIndex) => {
      if (branchIndex !== located.branchIndex) {
        return branch;
      }
      const nextBranch = [...branch];
      const indexInBranch = located.indexInBranch ?? 0;
      const insertAt = position === 'before' ? indexInBranch : indexInBranch + 1;
      nextBranch.splice(insertAt, 0, station);
      return nextBranch;
    });
    return { ...entry, branches };
  });
};

export const updateStationInEntries = (
  entries: readonly StationListEntry[],
  station: StationItem,
): StationListEntry[] =>
  mapStationsInEntries(entries, (item) => (item.id === station.id ? station : item));

/** 删除站点；若某支线变空且整块只剩空支线则去掉该块。支线块在删后若全部支线为空则移除块。 */
export const deleteStationFromEntries = (
  entries: readonly StationListEntry[],
  stationId: string,
): StationListEntry[] =>
  entries
    .map((entry) => {
      if (isStationEntry(entry)) {
        return entry.id === stationId ? null : entry;
      }
      const branches = entry.branches.map((branch) => branch.filter((station) => station.id !== stationId));
      if (branches.every((branch) => branch.length === 0)) {
        return null;
      }
      const main = Math.min(entry.main, Math.max(0, branches.length - 1));
      return { branches, main };
    })
    .filter((entry): entry is StationListEntry => entry !== null);

export type BranchInsertPosition = 'before' | 'after';

export type BranchInsertTarget =
  | { ok: true; side: OpeningSide }
  | { ok: false; reason: string };

const rootStationEntries = (entries: readonly StationListEntry[]): StationItem[] =>
  entries.filter(isStationEntry);

const findOpeningEntryIndex = (entries: readonly StationListEntry[], side: OpeningSide): number =>
  entries.findIndex((_, index) => getBranchOpeningSide(entries, index) === side);

/** 判断「之前/之后插入（支线）」是否可用（1A：仅两端开口）。 */
export const resolveBranchInsertTarget = (
  entries: readonly StationListEntry[],
  position: BranchInsertPosition,
  basisId: string | undefined,
): BranchInsertTarget => {
  const located = basisId ? findStationInEntries(entries, basisId) : null;
  const roots = rootStationEntries(entries);

  if (located?.openingSide) {
    return { ok: true, side: located.openingSide };
  }

  if (located && located.branchIndex === null) {
    if (position === 'before' && roots[0]?.id === located.station.id) {
      return { ok: true, side: 'left' };
    }
    if (position === 'after' && roots[roots.length - 1]?.id === located.station.id) {
      return { ok: true, side: 'right' };
    }
    return {
      ok: false,
      reason: '仅可在线路左端汇合站之前或右端汇合站之后插入开口支线',
    };
  }

  if (!located) {
    if (roots.length === 0) {
      return { ok: false, reason: '请先添加主线站点，再插入开口支线' };
    }
    return {
      ok: false,
      reason: '请先选中汇合站或已有支线上的站点',
    };
  }

  return { ok: false, reason: '无法在此位置插入支线' };
};

/**
 * 在左/右开口的非 main 支线上插入站点；若该侧尚无开口则创建
 * `{ branches: [[station], []], main: 1 }`（左）或 `{ branches: [[], [station]], main: 0 }`（右）。
 */
export const insertBranchStationInEntries = (
  entries: readonly StationListEntry[],
  position: BranchInsertPosition,
  basisId: string | undefined,
  station: StationItem,
): { ok: true; entries: StationListEntry[] } | { ok: false; reason: string } => {
  const target = resolveBranchInsertTarget(entries, position, basisId);
  if (!target.ok) {
    return target;
  }

  const { side } = target;
  const openingIndex = findOpeningEntryIndex(entries, side);
  const located = basisId ? findStationInEntries(entries, basisId) : null;

  if (openingIndex === -1) {
    if (rootStationEntries(entries).length === 0) {
      return { ok: false, reason: '请先添加主线站点，再插入开口支线' };
    }
    const group: BranchGroup =
      side === 'left'
        ? { branches: [[station], []], main: 1 }
        : { branches: [[], [station]], main: 0 };
    const next = side === 'left' ? [group, ...entries] : [...entries, group];
    const topology = validateStationListTopology(next);
    if (!topology.ok) {
      return { ok: false, reason: topology.error };
    }
    return { ok: true, entries: next };
  }

  const opening = entries[openingIndex];
  if (!isBranchGroup(opening)) {
    return { ok: false, reason: '支线块状态无效' };
  }

  let branches = opening.branches.map((branch) => [...branch]);
  while (branches.length < 2) {
    branches.push([]);
  }

  const sideIndex = branches.findIndex((_, index) => index !== opening.main);
  if (sideIndex === -1) {
    return { ok: false, reason: '找不到非主支线' };
  }

  if (
    located &&
    located.entryIndex === openingIndex &&
    located.branchIndex !== null &&
    located.branchIndex !== opening.main
  ) {
    const branch = [...branches[located.branchIndex]];
    const indexInBranch = located.indexInBranch ?? 0;
    const insertAt = position === 'before' ? indexInBranch : indexInBranch + 1;
    branch.splice(insertAt, 0, station);
    branches[located.branchIndex] = branch;
  } else if (
    located &&
    located.entryIndex === openingIndex &&
    located.branchIndex === opening.main
  ) {
    // 基准在 main 腿上：写入侧支线末端/首端
    const branch = [...branches[sideIndex]];
    if (side === 'left') {
      branch.push(station);
    } else {
      branch.unshift(station);
    }
    branches[sideIndex] = branch;
  } else {
    const branch = [...branches[sideIndex]];
    if (side === 'left') {
      if (position === 'before') {
        branch.unshift(station);
      } else {
        branch.push(station);
      }
    } else if (position === 'before') {
      branch.unshift(station);
    } else {
      branch.push(station);
    }
    branches[sideIndex] = branch;
  }

  const main = Math.min(opening.main, branches.length - 1);
  const next = entries.map((entry, index) =>
    index === openingIndex ? { branches, main } : entry,
  );
  const topology = validateStationListTopology(next);
  if (!topology.ok) {
    return { ok: false, reason: topology.error };
  }
  return { ok: true, entries: next };
};
