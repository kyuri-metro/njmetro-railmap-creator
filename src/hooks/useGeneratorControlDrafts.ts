import { useAppDispatch } from '../hooks';
import {
  setLineId,
  setThroughIconHeight,
  setTotalLength,
  type GeneratorState,
} from '../features/generatorSlice';
import {
  normalizeLineIdDraft,
  parseThroughIconHeightDraft,
  parseTotalLengthDraft,
  transformThroughIconHeightInput,
  useDebouncedGeneratorField,
  type DebouncedGeneratorField,
} from './useDebouncedGeneratorField';

export type GeneratorControlDrafts = {
  totalLength: DebouncedGeneratorField;
  throughIconHeight: DebouncedGeneratorField;
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

  const throughIconHeight = useDebouncedGeneratorField({
    committedValue: generator.throughIconHeight,
    formatCommitted: String,
    parse: parseThroughIconHeightDraft,
    onCommit: (value) => {
      dispatch(setThroughIconHeight(value));
    },
    transformInput: transformThroughIconHeightInput,
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
    throughIconHeight.resetFromCommitted(String(state.throughIconHeight));
    lineId.resetFromCommitted(state.lineId);
  };

  return { totalLength, throughIconHeight, lineId, syncFromGenerator };
}
