import type { TrainDirection } from './features/generatorSlice';
import {
  collectTrackEdges,
  parseBranchRouteModel,
  type BranchOpeningModel,
  type StationPoint,
  type TrackEdge,
} from './branchLayout';
import { flattenStationList, type StationListEntry } from './stationListTopology';

export const edgeKey = (fromStationId: string, toStationId: string): string =>
  fromStationId < toStationId ? `${fromStationId}\0${toStationId}` : `${toStationId}\0${fromStationId}`;

const openingStationIds = (opening: BranchOpeningModel): Set<string> => {
  const ids = new Set<string>();
  for (const branch of opening.branches) {
    for (const station of branch) {
      ids.add(station.id);
    }
  }
  return ids;
};

/** 该开口是否汇入当前行进方向（左开口→向右；右开口→向左）。 */
export const openingMergesIntoTravel = (
  side: BranchOpeningModel['side'],
  direction: TrainDirection,
): boolean => (side === 'left' && direction === 'r') || (side === 'right' && direction === 'l');

const directedPrefer = (
  fromId: string,
  toId: string,
  direction: TrainDirection,
  pointById: Map<string, StationPoint>,
): boolean => {
  const fromX = pointById.get(fromId)?.x ?? 0;
  const toX = pointById.get(toId)?.x ?? 0;
  if (fromX === toX) {
    return true;
  }
  return direction === 'r' ? toX > fromX : toX < fromX;
};

/**
 * 从当前站沿行进方向可达的边（无向 key）。
 * 若开口汇入行进方向且当前站落在该开口任一支线（或汇合站）上，则该开口全部边一并视为可通达。
 */
export const computeActiveTrackEdgeKeys = (
  entries: readonly StationListEntry[],
  currentStnId: string,
  direction: TrainDirection,
  points: readonly StationPoint[],
  edges: readonly TrackEdge[] = collectTrackEdges(entries),
): Set<string> => {
  const pointById = new Map(points.map((point) => [point.stationId, point]));
  const flatIds = new Set(flattenStationList(entries).map((station) => station.id));
  const active = new Set<string>();

  if (!flatIds.has(currentStnId) || edges.length === 0) {
    return active;
  }

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const { fromStationId: a, toStationId: b } = edge;
    if (!adjacency.has(a)) {
      adjacency.set(a, []);
    }
    if (!adjacency.has(b)) {
      adjacency.set(b, []);
    }
    adjacency.get(a)!.push(b);
    adjacency.get(b)!.push(a);
  }

  const queue = [currentStnId];
  const seen = new Set<string>([currentStnId]);

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const next of adjacency.get(node) ?? []) {
      if (!directedPrefer(node, next, direction, pointById)) {
        continue;
      }
      active.add(edgeKey(node, next));
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  const model = parseBranchRouteModel(entries);
  for (const opening of [model.left, model.right]) {
    if (!opening || !openingMergesIntoTravel(opening.side, direction)) {
      continue;
    }
    const branchIds = openingStationIds(opening);
    // 仅当当前站落在汇入侧的某条支线上时，点亮同开口另一支线
    if (!branchIds.has(currentStnId)) {
      continue;
    }
    for (const edge of edges) {
      const touchesOpening =
        (branchIds.has(edge.fromStationId) || edge.fromStationId === opening.mergeStationId) &&
        (branchIds.has(edge.toStationId) || edge.toStationId === opening.mergeStationId);
      if (touchesOpening && (branchIds.has(edge.fromStationId) || branchIds.has(edge.toStationId))) {
        active.add(edgeKey(edge.fromStationId, edge.toStationId));
      }
    }
  }

  return active;
};

export const isTrackEdgeActive = (
  activeKeys: ReadonlySet<string>,
  fromStationId: string,
  toStationId: string,
): boolean => activeKeys.has(edgeKey(fromStationId, toStationId));
