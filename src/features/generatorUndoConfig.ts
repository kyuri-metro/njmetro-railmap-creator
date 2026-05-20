import type { UnknownAction } from '@reduxjs/toolkit';
import {
  deleteStation,
  insertStation,
  restoreGeneratorState,
  reverseStnList,
  setDirection,
  setIdColor,
  setIdTextColor,
  setLineId,
  setCurrentStation,
  setShowStationTypeIcons,
  setTotalLength,
  replaceStations,
  updateStation,
} from './generatorSlice';

const trackedMutationTypes = new Set<string>([
  setTotalLength.type,
  setDirection.type,
  setCurrentStation.type,
  setLineId.type,
  setIdColor.type,
  setIdTextColor.type,
  setShowStationTypeIcons.type,
  insertStation.type,
  updateStation.type,
  deleteStation.type,
  replaceStations.type,
  reverseStnList.type,
  restoreGeneratorState.type,
]);

export const generatorUndoGroupByTypes = [
  setTotalLength.type,
  setLineId.type,
  setIdColor.type,
  setIdTextColor.type,
] as const;

export const isGeneratorMutationAction = (action: UnknownAction): boolean =>
  typeof action.type === 'string' && trackedMutationTypes.has(action.type);
