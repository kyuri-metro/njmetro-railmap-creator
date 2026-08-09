import type { StationItem } from './features/generatorSlice';
import {
  getBranchOpeningSide,
  isBranchGroup,
  isStationEntry,
  type OpeningSide,
  type StationListEntry,
} from './stationListTopology';

export type BranchOpeningModel = {
  side: OpeningSide;
  branches: StationItem[][];
  main: number;
  mergeStationId: string;
};

export type BranchRouteModel = {
  left: BranchOpeningModel | null;
  /** 根级普通站（含左右汇合邻站），左→右 */
  middle: StationItem[];
  right: BranchOpeningModel | null;
};

export type StationPoint = {
  stationId: string;
  x: number;
  /** 0 为主线；±branchHeight 为支线水平段 */
  y: number;
};

export type DiagonalSegment = {
  fromStationId: string;
  toStationId: string;
  side: OpeningSide;
  /** 支线所在侧：-1 上 / +1 下 */
  ySign: 1 | -1;
};

export type BranchLayoutResult = {
  segmentLength: number;
  branchHeight: number;
  totalLength: number;
  stations: StationPoint[];
  diagonals: DiagonalSegment[];
  usedFallback: boolean;
};

type LegCoeffs = { a: number; b: number };

/** 主支线：(n-1)s + s(接到汇合站)；侧支线：(n-1)s + branchHeight（45° 水平投影） */
const legCoeffs = (stationCount: number, isMain: boolean, branchHeight: number): LegCoeffs => {
  if (stationCount <= 0) {
    return { a: 0, b: 0 };
  }
  if (isMain) {
    return { a: stationCount, b: 0 };
  }
  return { a: stationCount - 1, b: branchHeight };
};

const legProjection = (stationCount: number, isMain: boolean, segmentLength: number, branchHeight: number) => {
  const { a, b } = legCoeffs(stationCount, isMain, branchHeight);
  return a * segmentLength + b;
};

const ySignForBranch = (branchIndex: number, main: number): 1 | -1 => (branchIndex < main ? -1 : 1);

export const parseBranchRouteModel = (entries: readonly StationListEntry[]): BranchRouteModel => {
  let left: BranchOpeningModel | null = null;
  let right: BranchOpeningModel | null = null;
  const middle: StationItem[] = [];

  entries.forEach((entry, entryIndex) => {
    if (isStationEntry(entry)) {
      middle.push(entry);
      return;
    }

    const side = getBranchOpeningSide(entries, entryIndex);
    if (side === 'left') {
      const merge = entries.slice(entryIndex + 1).find(isStationEntry);
      if (merge) {
        left = {
          side: 'left',
          branches: entry.branches,
          main: entry.main,
          mergeStationId: merge.id,
        };
      }
      return;
    }

    if (side === 'right') {
      const merge = [...entries.slice(0, entryIndex)].reverse().find(isStationEntry);
      if (merge) {
        right = {
          side: 'right',
          branches: entry.branches,
          main: entry.main,
          mergeStationId: merge.id,
        };
      }
    }
  });

  return { left, middle, right };
};

const openingCandidateIndices = (opening: BranchOpeningModel | null): number[] => {
  if (!opening) {
    return [-1];
  }
  return opening.branches.map((_, index) => index);
};

const solveSegmentLength = (
  model: BranchRouteModel,
  totalLength: number,
  branchHeight: number,
): { segmentLength: number; usedFallback: boolean } => {
  const lineLength = Math.max(0, totalLength);
  const middleEdges = Math.max(0, model.middle.length - 1);

  if (!model.left && !model.right) {
    if (middleEdges === 0) {
      return { segmentLength: 0, usedFallback: false };
    }
    return { segmentLength: lineLength / middleEdges, usedFallback: false };
  }

  type Candidate = { leftWin: number; rightWin: number; s: number };
  const candidates: Candidate[] = [];

  for (const leftWin of openingCandidateIndices(model.left)) {
    for (const rightWin of openingCandidateIndices(model.right)) {
      let a = middleEdges;
      let b = 0;

      if (model.left && leftWin >= 0) {
        const coeffs = legCoeffs(model.left.branches[leftWin]?.length ?? 0, leftWin === model.left.main, branchHeight);
        a += coeffs.a;
        b += coeffs.b;
      }

      if (model.right && rightWin >= 0) {
        const coeffs = legCoeffs(model.right.branches[rightWin]?.length ?? 0, rightWin === model.right.main, branchHeight);
        a += coeffs.a;
        b += coeffs.b;
      }

      if (a <= 0) {
        if (Math.abs(b - lineLength) < 1e-6) {
          candidates.push({ leftWin, rightWin, s: 0 });
        }
        continue;
      }

      const s = (lineLength - b) / a;
      if (!Number.isFinite(s) || s < -1e-9) {
        continue;
      }

      const segmentLength = Math.max(0, s);

      const leftOk =
        !model.left ||
        leftWin < 0 ||
        model.left.branches.every((branch, index) => {
          const proj = legProjection(branch.length, index === model.left!.main, segmentLength, branchHeight);
          const win = legProjection(
            model.left!.branches[leftWin]?.length ?? 0,
            leftWin === model.left!.main,
            segmentLength,
            branchHeight,
          );
          return proj <= win + 1e-6;
        });

      const rightOk =
        !model.right ||
        rightWin < 0 ||
        model.right.branches.every((branch, index) => {
          const proj = legProjection(branch.length, index === model.right!.main, segmentLength, branchHeight);
          const win = legProjection(
            model.right!.branches[rightWin]?.length ?? 0,
            rightWin === model.right!.main,
            segmentLength,
            branchHeight,
          );
          return proj <= win + 1e-6;
        });

      if (leftOk && rightOk) {
        candidates.push({ leftWin, rightWin, s: segmentLength });
      }
    }
  }

  if (candidates.length > 0) {
    return { segmentLength: candidates[0].s, usedFallback: false };
  }

  // Fallback: ignore max 假设，用「各侧取最长腿系数」的松弛式，再钳制 s≥0
  let a = middleEdges;
  let b = 0;
  for (const opening of [model.left, model.right]) {
    if (!opening) {
      continue;
    }
    let bestA = 0;
    let bestB = 0;
    let bestProjAtUnit = -Infinity;
    opening.branches.forEach((branch, index) => {
      const coeffs = legCoeffs(branch.length, index === opening.main, branchHeight);
      const projAtUnit = coeffs.a + coeffs.b;
      if (projAtUnit > bestProjAtUnit) {
        bestProjAtUnit = projAtUnit;
        bestA = coeffs.a;
        bestB = coeffs.b;
      }
    });
    a += bestA;
    b += bestB;
  }

  if (a <= 0) {
    return { segmentLength: 0, usedFallback: true };
  }

  return { segmentLength: Math.max(0, (lineLength - b) / a), usedFallback: true };
};

const placeLeftOpening = (
  opening: BranchOpeningModel,
  segmentLength: number,
  branchHeight: number,
  junctionX: number,
  points: Map<string, StationPoint>,
  diagonals: DiagonalSegment[],
) => {
  opening.branches.forEach((branch, branchIndex) => {
    if (branch.length === 0) {
      return;
    }
    const isMain = branchIndex === opening.main;
    if (isMain) {
      branch.forEach((station, index) => {
        const fromEnd = branch.length - index;
        points.set(station.id, {
          stationId: station.id,
          x: junctionX - fromEnd * segmentLength,
          y: 0,
        });
      });
      return;
    }

    const ySign = ySignForBranch(branchIndex, opening.main);
    branch.forEach((station, index) => {
      const fromEnd = branch.length - 1 - index;
      points.set(station.id, {
        stationId: station.id,
        x: junctionX - branchHeight - fromEnd * segmentLength,
        y: ySign * branchHeight,
      });
    });
    diagonals.push({
      fromStationId: branch[branch.length - 1].id,
      toStationId: opening.mergeStationId,
      side: 'left',
      ySign,
    });
  });
};

const placeRightOpening = (
  opening: BranchOpeningModel,
  segmentLength: number,
  branchHeight: number,
  junctionX: number,
  points: Map<string, StationPoint>,
  diagonals: DiagonalSegment[],
) => {
  opening.branches.forEach((branch, branchIndex) => {
    if (branch.length === 0) {
      return;
    }
    const isMain = branchIndex === opening.main;
    if (isMain) {
      branch.forEach((station, index) => {
        points.set(station.id, {
          stationId: station.id,
          x: junctionX + (index + 1) * segmentLength,
          y: 0,
        });
      });
      return;
    }

    const ySign = ySignForBranch(branchIndex, opening.main);
    branch.forEach((station, index) => {
      points.set(station.id, {
        stationId: station.id,
        x: junctionX + branchHeight + index * segmentLength,
        y: ySign * branchHeight,
      });
    });
    diagonals.push({
      fromStationId: opening.mergeStationId,
      toStationId: branch[0].id,
      side: 'right',
      ySign,
    });
  });
};

export const layoutBranchRoute = (
  entries: readonly StationListEntry[],
  totalLength: number,
  branchHeight: number,
): BranchLayoutResult => {
  const model = parseBranchRouteModel(entries);
  const height = Math.max(0, branchHeight);
  const { segmentLength, usedFallback } = solveSegmentLength(model, totalLength, height);

  const leftSpan = model.left
    ? Math.max(
        0,
        ...model.left.branches.map((branch, index) =>
          legProjection(branch.length, index === model.left!.main, segmentLength, height),
        ),
      )
    : 0;

  const points = new Map<string, StationPoint>();
  const diagonals: DiagonalSegment[] = [];

  model.middle.forEach((station, index) => {
    points.set(station.id, {
      stationId: station.id,
      x: leftSpan + index * segmentLength,
      y: 0,
    });
  });

  if (model.left) {
    const junctionX = points.get(model.left.mergeStationId)?.x ?? leftSpan;
    placeLeftOpening(model.left, segmentLength, height, junctionX, points, diagonals);
  }

  if (model.right) {
    const junctionX = points.get(model.right.mergeStationId)?.x ?? leftSpan;
    placeRightOpening(model.right, segmentLength, height, junctionX, points, diagonals);
  }

  // 无支线时与旧逻辑一致：首站 x=0
  if (!model.left && !model.right && model.middle.length > 0) {
    const minX = Math.min(...[...points.values()].map((point) => point.x));
    for (const point of points.values()) {
      point.x -= minX;
    }
  }

  return {
    segmentLength,
    branchHeight: height,
    totalLength: Math.max(0, totalLength),
    stations: [...points.values()].sort((a, b) => a.x - b.x || a.y - b.y),
    diagonals,
    usedFallback,
  };
};

export const hasBranchGeometry = (entries: readonly StationListEntry[]): boolean =>
  entries.some((entry) => isBranchGroup(entry));

export type TrackEdge = {
  fromStationId: string;
  toStationId: string;
  kind: 'horizontal' | 'diagonal';
};

/** 主线/支线水平边 + 45° 边（用于绘制）。 */
export const collectTrackEdges = (entries: readonly StationListEntry[]): TrackEdge[] => {
  const model = parseBranchRouteModel(entries);
  const edges: TrackEdge[] = [];

  const pushHorizontalChain = (ids: string[]) => {
    for (let i = 0; i < ids.length - 1; i += 1) {
      edges.push({ fromStationId: ids[i], toStationId: ids[i + 1], kind: 'horizontal' });
    }
  };

  if (model.left) {
    model.left.branches.forEach((branch, branchIndex) => {
      const ids = branch.map((station) => station.id);
      pushHorizontalChain(ids);
      if (ids.length > 0) {
        if (branchIndex === model.left!.main) {
          edges.push({
            fromStationId: ids[ids.length - 1],
            toStationId: model.left!.mergeStationId,
            kind: 'horizontal',
          });
        } else {
          edges.push({
            fromStationId: ids[ids.length - 1],
            toStationId: model.left!.mergeStationId,
            kind: 'diagonal',
          });
        }
      }
    });
  }

  pushHorizontalChain(model.middle.map((station) => station.id));

  if (model.right) {
    model.right.branches.forEach((branch, branchIndex) => {
      const ids = branch.map((station) => station.id);
      if (ids.length > 0) {
        if (branchIndex === model.right!.main) {
          edges.push({
            fromStationId: model.right!.mergeStationId,
            toStationId: ids[0],
            kind: 'horizontal',
          });
        } else {
          edges.push({
            fromStationId: model.right!.mergeStationId,
            toStationId: ids[0],
            kind: 'diagonal',
          });
        }
      }
      pushHorizontalChain(ids);
    });
  }

  return edges;
};

/** 各开口支线远端站 + 无对应开口时的主线端点，用作终点环。 */
export const collectTerminusStationIds = (entries: readonly StationListEntry[]): Set<string> => {
  const model = parseBranchRouteModel(entries);
  const tips = new Set<string>();

  if (model.left) {
    for (const branch of model.left.branches) {
      if (branch[0]) {
        tips.add(branch[0].id);
      }
    }
  } else if (model.middle[0]) {
    tips.add(model.middle[0].id);
  }

  if (model.right) {
    for (const branch of model.right.branches) {
      const tip = branch[branch.length - 1];
      if (tip) {
        tips.add(tip.id);
      }
    }
  } else if (model.middle[model.middle.length - 1]) {
    tips.add(model.middle[model.middle.length - 1].id);
  }

  return tips;
};
