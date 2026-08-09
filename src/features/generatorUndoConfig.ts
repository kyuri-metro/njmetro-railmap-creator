import type { UnknownAction } from '@reduxjs/toolkit';
import {
  deleteStation,
  insertStation,
  patchStationName,
  restoreGeneratorState,
  reverseStnList,
  setDirection,
  setIdColor,
  setIdTextColor,
  setLineId,
  setCurrentStation,
  setShowStationTypeIcons,
  setUseCapsuleTransferMarkers,
  setTotalLength,
  replaceStations,
  updateStation,
  type PatchStationNamePayload,
  type StationItem,
} from './generatorSlice';

/** Consecutive same-base-key edits within this window share one undo step. */
export const GENERATOR_UNDO_GROUP_MS = 800;

const trackedMutationTypes = new Set<string>([
  setTotalLength.type,
  setDirection.type,
  setCurrentStation.type,
  setLineId.type,
  setIdColor.type,
  setIdTextColor.type,
  setShowStationTypeIcons.type,
  setUseCapsuleTransferMarkers.type,
  insertStation.type,
  updateStation.type,
  patchStationName.type,
  deleteStation.type,
  replaceStations.type,
  reverseStnList.type,
  restoreGeneratorState.type,
]);

/** Scalar generator fields that group by action type (with time window). */
export const generatorUndoGroupByTypes = [
  setTotalLength.type,
  setLineId.type,
  setIdColor.type,
  setIdTextColor.type,
] as const;

const scalarGroupByTypeSet = new Set<string>(generatorUndoGroupByTypes);

export const isGeneratorMutationAction = (action: UnknownAction): boolean =>
  typeof action.type === 'string' && trackedMutationTypes.has(action.type);

export const getGeneratorUndoGroupBaseKey = (action: UnknownAction): string | null => {
  if (action.type === patchStationName.type) {
    const payload = action.payload as PatchStationNamePayload;
    return `patchStationName:${payload.id}:${payload.field}`;
  }

  if (action.type === updateStation.type) {
    const payload = action.payload as StationItem;
    return `updateStation:${payload.id}`;
  }

  if (typeof action.type === 'string' && scalarGroupByTypeSet.has(action.type)) {
    return action.type;
  }

  return null;
};

type CreateGeneratorUndoGroupByOptions = {
  now?: () => number;
  windowMs?: number;
};

/**
 * Returns a redux-undo `groupBy` that merges consecutive edits with the same
 * base key only while they arrive within `windowMs`.
 */
export const createGeneratorUndoGroupBy = (options: CreateGeneratorUndoGroupByOptions = {}) => {
  const now = options.now ?? Date.now;
  const windowMs = options.windowMs ?? GENERATOR_UNDO_GROUP_MS;
  let lastBaseKey: string | null = null;
  let lastAt = 0;
  let epoch = 0;

  return (action: UnknownAction): string | null => {
    const baseKey = getGeneratorUndoGroupBaseKey(action);

    if (baseKey == null) {
      lastBaseKey = null;
      return null;
    }

    const t = now();
    if (baseKey !== lastBaseKey || t - lastAt >= windowMs) {
      epoch += 1;
    }

    lastBaseKey = baseKey;
    lastAt = t;
    return `${baseKey}#${epoch}`;
  };
};
