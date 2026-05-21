import type { RootState } from '../store';

let saveExempt = false;

export const markSavedExempt = () => {
  saveExempt = true;
};

export const clearSavedExempt = () => {
  saveExempt = false;
};

export const shouldWarnOnLeave = (state: RootState) =>
  state.generator.past.length > 0 && !saveExempt;
