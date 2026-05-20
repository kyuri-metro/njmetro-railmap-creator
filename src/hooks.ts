import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const selectGeneratorPresent = (state: RootState) => state.generator.present;

export const selectCanUndo = (state: RootState) => state.generator.past.length > 0;

export const selectCanRedo = (state: RootState) => state.generator.future.length > 0;
