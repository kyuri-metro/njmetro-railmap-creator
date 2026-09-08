import { useAppDispatch } from '../hooks';
import {
  setLineId,
  setTotalLength,
  type GeneratorState,
} from '../features/generatorSlice';
import {
  normalizeLineIdDraft,
  parseTotalLengthDraft,
  useDebouncedGeneratorField,
  type DebouncedGeneratorField,
} from './useDebouncedGeneratorField';

export type GeneratorControlDrafts = {
  totalLength: DebouncedGeneratorField;
  lineId: DebouncedGeneratorField;
  syncFromGenerator: (state: GeneratorState) => void;
};

export function useGeneratorControlDrafts(generator: GeneratorState): GeneratorControlDrafts {
  const dispatch = useAppDispatch();

  const totalLength = useDebouncedGeneratorField({
    committedValue: generator.totalLength,
    formatCommitted: String,
    parse: parseTotalLengthDraft,
    onCommit: (value) => {
      dispatch(setTotalLength(value));
    },
    transformInput: (raw) => raw.replace(/\D/g, ''),
  });

  const lineId = useDebouncedGeneratorField({
    committedValue: generator.lineId,
    formatCommitted: (value) => value,
    parse: normalizeLineIdDraft,
    onCommit: (value) => {
      dispatch(setLineId(value));
    },
    transformInput: normalizeLineIdDraft,
  });

  const syncFromGenerator = (state: GeneratorState) => {
    totalLength.resetFromCommitted(String(state.totalLength));
    lineId.resetFromCommitted(state.lineId);
  };

  return { totalLength, lineId, syncFromGenerator };
}
