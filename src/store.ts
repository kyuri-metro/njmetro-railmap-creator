import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import undoable, { ActionCreators as UndoActionCreators, groupByActionTypes } from 'redux-undo';
import { markAutosaveDirty } from './features/autosaveScheduler';
import generatorReducer from './features/generatorSlice';
import { generatorUndoGroupByTypes, isGeneratorMutationAction } from './features/generatorUndoConfig';

const undoableGeneratorReducer = undoable(generatorReducer, {
  limit: 50,
  groupBy: groupByActionTypes([...generatorUndoGroupByTypes]),
});

const autosaveListener = createListenerMiddleware();

autosaveListener.startListening({
  predicate: (action) => isGeneratorMutationAction(action),
  effect: () => {
    markAutosaveDirty();
  },
});

export const store = configureStore({
  reducer: {
    generator: undoableGeneratorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(autosaveListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { UndoActionCreators };
