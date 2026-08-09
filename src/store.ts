import { configureStore, createListenerMiddleware, type UnknownAction } from '@reduxjs/toolkit';
import undoable, { ActionCreators as UndoActionCreators, ActionTypes, excludeAction } from 'redux-undo';
import { markAutosaveDirty } from './features/autosaveScheduler';
import generatorReducer, { setCurrentStation } from './features/generatorSlice';
import { createGeneratorUndoGroupBy, isGeneratorMutationAction } from './features/generatorUndoConfig';
import { clearSavedExempt } from './features/leaveGuard';

const undoableGeneratorReducer = undoable(generatorReducer, {
  limit: 50,
  filter: excludeAction(setCurrentStation.type),
  groupBy: createGeneratorUndoGroupBy(),
  syncFilter: true,
});

const autosaveListener = createListenerMiddleware();

autosaveListener.startListening({
  predicate: (action) => isGeneratorMutationAction(action),
  effect: () => {
    markAutosaveDirty();
  },
});

const clearsSaveExempt = (action: UnknownAction) =>
  isGeneratorMutationAction(action) ||
  action.type === ActionTypes.UNDO ||
  action.type === ActionTypes.REDO ||
  action.type === ActionTypes.CLEAR_HISTORY;

const leaveGuardListener = createListenerMiddleware();

leaveGuardListener.startListening({
  predicate: clearsSaveExempt,
  effect: () => {
    clearSavedExempt();
  },
});

export const store = configureStore({
  reducer: {
    generator: undoableGeneratorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(autosaveListener.middleware, leaveGuardListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { UndoActionCreators };
