import type { UnknownAction } from '@reduxjs/toolkit';
import {
  deleteStation,
  insertBranchStation,
  insertStation,
  restoreGeneratorState,
  reverseStnList,
  setBranchHeight,
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
} from './generatorSlice';

const trackedMutationTypes = new Set<string>([
  setTotalLength.type,
  setBranchHeight.type,
  setDirection.type,
  setCurrentStation.type,
  setLineId.type,
  setIdColor.type,
  setIdTextColor.type,
  setShowStationTypeIcons.type,
  setUseCapsuleTransferMarkers.type,
  insertStation.type,
  insertBranchStation.type,
  updateStation.type,
  deleteStation.type,
  replaceStations.type,
  reverseStnList.type,
  restoreGeneratorState.type,
]);

export const generatorUndoGroupByTypes = [
  setTotalLength.type,
  setBranchHeight.type,
  setLineId.type,
  setIdColor.type,
  setIdTextColor.type,
] as const;

export const isGeneratorMutationAction = (action: UnknownAction): boolean =>
  typeof action.type === 'string' && trackedMutationTypes.has(action.type);
